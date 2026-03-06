import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { signSession } from "@/lib/session";
import { getRatelimit } from "@/lib/ratelimit";

const SESSION_COOKIE = "__session";
const MAX_AGE = 60 * 60; // 1 hour

// POST /api/admin/session — verify Firebase ID token, set HMAC-signed HttpOnly session cookie
export async function POST(req: NextRequest) {
  // Rate limiting — limita intentos de login por IP
  const rl = getRatelimit();
  if (rl) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const { success } = await rl.limit(`admin_login:${ip}`);
    if (!success)
      return NextResponse.json({ error: "Demasiados intentos. Espera un momento." }, { status: 429 });
  }

  const { idToken } = await req.json().catch(() => ({}));

  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Token requerido." }, { status: 400 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const sessionValue = await signSession(uid);
  const isProd = process.env.NODE_ENV === "production";
  const cookieOptions = [
    `${SESSION_COOKIE}=${sessionValue}`,
    "Path=/",
    `Max-Age=${MAX_AGE}`,
    "HttpOnly",
    "SameSite=Strict",
    ...(isProd ? ["Secure"] : []),
  ].join("; ");

  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", cookieOptions);
  return res;
}

// DELETE /api/admin/session — clear session cookie
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`
  );
  return res;
}
