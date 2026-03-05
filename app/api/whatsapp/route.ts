import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getRatelimit } from "@/lib/ratelimit";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rl = getRatelimit();
  if (rl) {
    try {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
      const { success } = await rl.limit(ip);
      if (!success) {
        return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
      }
    } catch {
      // Upstash unreachable — skip rate limiting and continue
    }
  }

  try {
    const db = adminDb();
    const snap = await db.collection("whatsapp_config").doc("config").get();

    if (!snap.exists) {
      return NextResponse.json({ numero: "" });
    }

    const config = snap.data() as {
      numeros: string[];
      intervalo_horas: number;
      indice_actual: number;
      ultima_rotacion?: FirebaseFirestore.Timestamp;
    };

    if (!config.numeros || config.numeros.length === 0) {
      return NextResponse.json({ numero: "" });
    }

    const now = Date.now();
    const lastRotation = config.ultima_rotacion?.toMillis() ?? 0;
    const intervalMs = (config.intervalo_horas ?? 0) * 60 * 60 * 1000;

    let indice = config.indice_actual ?? 0;

    if (intervalMs > 0 && now - lastRotation >= intervalMs) {
      indice = (indice + 1) % config.numeros.length;
      // Fire-and-forget — don't let a write failure block the response
      db.collection("whatsapp_config").doc("config").update({
        indice_actual: indice,
        ultima_rotacion: FieldValue.serverTimestamp(),
      }).catch(() => {});
    }

    return NextResponse.json({ numero: config.numeros[indice] ?? "" });
  } catch (e) {
    console.error("[/api/whatsapp]", e);
    return NextResponse.json({ numero: "" }, { status: 500 });
  }
}
