import { NextResponse } from "next/server";
import { getWhatsAppConfig, setWhatsAppConfig } from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";

export async function GET() {
  try {
    const config = await getWhatsAppConfig();
    if (!config || config.numeros.length === 0) {
      return NextResponse.json({ numero: "" });
    }

    const now = Date.now();
    const lastRotation = config.ultima_rotacion?.toMillis?.() ?? 0;
    const intervalMs = config.intervalo_horas * 60 * 60 * 1000;

    let indice = config.indice_actual;

    if (now - lastRotation >= intervalMs) {
      indice = (config.indice_actual + 1) % config.numeros.length;
      await setWhatsAppConfig({
        ...config,
        indice_actual: indice,
        ultima_rotacion: Timestamp.now(),
      });
    }

    return NextResponse.json({ numero: config.numeros[indice] ?? "" });
  } catch {
    return NextResponse.json({ numero: "" }, { status: 500 });
  }
}
