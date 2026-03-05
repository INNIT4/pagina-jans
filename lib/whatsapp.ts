import { getWhatsAppConfig, setWhatsAppConfig } from "./firestore";
import { Timestamp } from "firebase/firestore";

export async function getActiveWhatsApp(): Promise<string> {
  const config = await getWhatsAppConfig();
  if (!config || config.numeros.length === 0) return "";

  const now = Date.now();
  const lastRotation = config.ultima_rotacion?.toMillis?.() ?? 0;
  const intervalMs = config.intervalo_horas * 60 * 60 * 1000;

  const updated = { ...config };

  if (now - lastRotation >= intervalMs) {
    updated.indice_actual = (config.indice_actual + 1) % config.numeros.length;
    updated.ultima_rotacion = Timestamp.now();
    await setWhatsAppConfig(updated);
  }

  return updated.numeros[updated.indice_actual] ?? "";
}

export function buildWhatsAppUrl(numero: string, message: string): string {
  return `https://wa.me/52${numero}?text=${encodeURIComponent(message)}`;
}
