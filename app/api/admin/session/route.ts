import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { signSession } from "@/lib/session";
import { getRatelimit } from "@/lib/ratelimit";

const SESSION_COOKIE = "__session";
const MAX_AGE = 8 * 60 * 60; // 8 hours

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

  // Verificar el rol del usuario en firestore
  const { adminDb } = await import("@/lib/firebase-admin"); // Necesitamos importar la db localmente para evitar problemas de cold-start global
  const db = adminDb();
  const userDoc = await db.collection("usuarios_admin").doc(uid).get();
  // Si no hay doc configurado, asumimos admin por defecto para no quebrar sistemas viejos
  const role = userDoc.exists ? (userDoc.data()?.role || "admin") : "admin";

  const sessionValue = await signSession(uid, role);
  const isProd = process.env.NODE_ENV === "production";
  
  const createCookie = (name: string, value: string, httpOnly = true) => [
    `${name}=${value}`,
    "Path=/",
    `Max-Age=${MAX_AGE}`,
    httpOnly ? "HttpOnly" : "",
    "SameSite=Strict",
    ...(isProd ? ["Secure"] : []),
  ].filter(Boolean).join("; ");

  const res = NextResponse.json({ ok: true, role });
  res.headers.set("Set-Cookie", createCookie(SESSION_COOKIE, sessionValue, true));
  res.headers.append("Set-Cookie", createCookie("__role", role, false)); // Visible para UI
  return res;
}

// DELETE /api/admin/session — clear session cookie
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`);
  res.headers.append("Set-Cookie", `__role=; Path=/; Max-Age=0; SameSite=Strict`);
  return res;
}
