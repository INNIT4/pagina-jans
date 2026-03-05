import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

const SESSION_COOKIE = "__session";
const MAX_AGE = 60 * 60; // 1 hour

// POST /api/admin/session — verify Firebase ID token, set HttpOnly session cookie
export async function POST(req: NextRequest) {
  const { idToken } = await req.json().catch(() => ({}));

  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Token requerido." }, { status: 400 });
  }

  try {
    await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const isProd = process.env.NODE_ENV === "production";
  const cookieOptions = [
    `${SESSION_COOKIE}=${idToken}`,
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
