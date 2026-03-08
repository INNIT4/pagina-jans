import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMG     = 5  * 1024 * 1024;
const MAX_PDF     = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "application/pdf"];

let _rl: Ratelimit | null = null;
function getRl() {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;
  if (!_rl) _rl = new Ratelimit({
    redis: new Redis({ 
      url: process.env.UPSTASH_REDIS_REST_URL!.replace(/^"|"$/g, ""), 
      token: process.env.UPSTASH_REDIS_REST_TOKEN!.replace(/^"|"$/g, "") 
    }),
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "rl_comprobante",
  });
  return _rl;
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
    case "application/pdf":
      return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
    default:
      return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const rl = getRl();
    if (rl) {
      const { success } = await rl.limit(ip);
      if (!success) return NextResponse.json({ error: "Demasiados intentos. Espera una hora." }, { status: 429 });
    }

    let formData: FormData;
    try { 
      formData = await req.formData(); 
    } catch { 
      return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); 
    }

    const file      = formData.get("file")        as File | null;
    const nombre    = formData.get("nombre")      as string | null;
    const foliosRaw = formData.get("folios")      as string | null;
    const montoRaw  = formData.get("monto_total") as string | null;

    if (!file)           return NextResponse.json({ error: "No se recibió archivo." }, { status: 400 });
    if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });

    let folios: string[];
    try {
      folios = JSON.parse(foliosRaw ?? "[]");
      if (!Array.isArray(folios) || folios.length === 0) throw new Error();
    } catch { 
      return NextResponse.json({ error: "Folios inválidos." }, { status: 400 }); 
    }

    const monto_total = parseFloat(montoRaw ?? "0");
    if (isNaN(monto_total)) return NextResponse.json({ error: "Monto inválido." }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: "Tipo no permitido. Sube JPG, PNG, GIF o PDF." }, { status: 400 });

    const isPdf = file.type === "application/pdf";
    if (file.size > (isPdf ? MAX_PDF : MAX_IMG))
      return NextResponse.json({ error: `Supera el límite de ${isPdf ? "10" : "5"} MB.` }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!checkMagicBytes(buffer, file.type))
      return NextResponse.json({ error: "El contenido del archivo no coincide con su tipo." }, { status: 400 });

    const ext = "." + file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");

    const blob = await put(`comprobantes/${crypto.randomUUID()}${ext}`, buffer, {
      access: "public",
      contentType: file.type,
    });

    const archivo_tipo = isPdf ? "pdf" : "imagen";

    const db  = adminDb();
    const ref = await db.collection("comprobantes").add({
      nombre: nombre.trim(), folios, monto_total,
      archivo_url: blob.url,
      archivo_tipo,
      status: "pendiente",
      created_at: Timestamp.now(),
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("Global Catch Upload Error:", err);
    return NextResponse.json({ error: (err as Error)?.message || "Ocurrió un error interno en el servidor." }, { status: 500 });
  }
}
