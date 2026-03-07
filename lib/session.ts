/**
 * HMAC-SHA256 signed session cookies — compatible with Edge Runtime (crypto.subtle).
 * Format: base64url(payload).base64url(signature)
 */

const ALG = { name: "HMAC", hash: "SHA-256" } as const;
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) throw new Error("COOKIE_SECRET not configured");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    ALG,
    false,
    ["sign", "verify"]
  );
}

export async function signSession(uid: string, role: string = "admin"): Promise<string> {
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({ uid, role, exp: Date.now() + SESSION_DURATION_MS })
    )
  );
  const key = await getKey();
  const sig = await crypto.subtle.sign(ALG, key, new TextEncoder().encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySession(cookie: string): Promise<{ uid: string; role: string } | null> {
  try {
    const dot = cookie.lastIndexOf(".");
    if (dot < 1) return null;
    const payload = cookie.slice(0, dot);
    const sig = cookie.slice(dot + 1);
    const key = await getKey();
    const valid = await crypto.subtle.verify(
      ALG,
      key,
      b64urlDecode(sig),
      new TextEncoder().encode(payload)
    );
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return { uid: data.uid, role: data.role || "admin" };
  } catch {
    return null;
  }
}
