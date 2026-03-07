import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { verifySession } from "@/lib/session";
import { adminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Verifica admin por cookie __session O por header Authorization: Bearer <idToken> */
async function isAdmin(req: NextRequest): Promise<boolean> {
  // 1. Cookie de sesión HMAC
  const sessionCookie = req.cookies.get("__session");
  if (sessionCookie?.value && (await verifySession(sessionCookie.value))) return true;

  // 2. Firebase ID token en header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      await adminAuth.verifyIdToken(authHeader.slice(7));
      return true;
    } catch { /* invalid token */ }
  }

  return false;
}

/** Verifica los magic bytes reales del archivo — no confía en el MIME del navegador */
function checkMagicBytes(buf: Buffer, mimeType: string): boolean {
  if (buf.length < 12) return false;
  switch (mimeType) {
    case "image/jpeg":
      return buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
    case "image/png":
      return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
    case "image/gif":
      return buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
    case "image/webp":
      return (
        buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
      );
    default:
      return false;
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file)
    return NextResponse.json({ error: "No se recibió archivo." }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Tipo de archivo no permitido. Solo JPG, PNG, WebP o GIF." }, { status: 400 });

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "El archivo supera el límite de 5 MB." }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (!checkMagicBytes(buffer, file.type))
    return NextResponse.json({ error: "El contenido del archivo no coincide con su tipo." }, { status: 400 });

  try {
    const blob = await put(`rifas/${Date.now()}-${file.name}`, buffer, {
      access: "public",
      allowOverwrite: false,
      addRandomSuffix: true,
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("Upload error:", err);
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: `Error al subir la imagen: ${msg}` }, { status: 500 });
  }
}
