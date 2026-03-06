import { getWhatsAppConfig } from "./firestore";

/** Lee el número activo SIN rotar — para cachés y previews. */
export async function getActiveWhatsApp(): Promise<string> {
  const config = await getWhatsAppConfig();
  if (!config?.numeros?.length) return "";
  const indice = (config.indice_actual ?? 0) % config.numeros.length;
  return config.numeros[indice] ?? "";
}

/** Lee el número activo Y rota al siguiente — llama al API route (server-side). */
export async function getRotatedWhatsApp(): Promise<string> {
  const res = await fetch("/api/whatsapp/rotate", { method: "POST" });
  if (!res.ok) return "";
  const data = (await res.json()) as { numero?: string };
  return data.numero ?? "";
}

export function buildWhatsAppUrl(numero: string, message: string): string {
  return `https://wa.me/52${numero}?text=${encodeURIComponent(message)}`;
}
