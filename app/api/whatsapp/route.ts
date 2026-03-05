import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppConfig, setWhatsAppConfig } from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";
import { getRatelimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rl = getRatelimit();
  if (rl) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const { success } = await rl.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
    }
  }

  try {
    const config = await getWhatsAppConfig();
    if (!config || config.numeros.length === 0) {
      return NextResponse.json({ numero: "" });
    }

    const now = Date.now();
    const lastRotation = config.ultima_rotacion?.toMillis?.() ?? 0;
    const intervalMs = (config.intervalo_horas ?? 0) * 60 * 60 * 1000;

    let indice = config.indice_actual ?? 0;

    if (intervalMs > 0 && now - lastRotation >= intervalMs) {
      indice = (indice + 1) % config.numeros.length;
      // Fire-and-forget — don't let a write failure block the response
      setWhatsAppConfig({
        ...config,
        indice_actual: indice,
        ultima_rotacion: Timestamp.now(),
      }).catch(() => {});
    }

    return NextResponse.json({ numero: config.numeros[indice] ?? "" });
  } catch {
    return NextResponse.json({ numero: "" }, { status: 500 });
  }
}
