import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { verifySession } from "@/lib/session";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

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
        buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && // RIFF
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50  // WEBP
      );
    default:
      return false;
  }
}

export async function POST(req: NextRequest) {
  // Only authenticated admins may upload — verify HMAC signature, not just existence
  const sessionCookie = req.cookies.get("__session");
  if (!sessionCookie?.value || !(await verifySession(sessionCookie.value))) {
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

  const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "");
  if (!ALLOWED_EXTENSIONS.includes(ext))
    return NextResponse.json({ error: "Extensión no permitida." }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Validar magic bytes reales — rechaza archivos con MIME falso
  if (!checkMagicBytes(buffer, file.type))
    return NextResponse.json({ error: "El contenido del archivo no coincide con su tipo." }, { status: 400 });

  const baseName = path.basename(file.name, path.extname(file.name))
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 60);
  const filename = `${Date.now()}-${baseName}${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
}
