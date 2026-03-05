import { getWhatsAppConfig } from "./firestore";

export async function getActiveWhatsApp(): Promise<string> {
  const config = await getWhatsAppConfig();
  return config?.numero ?? "";
}

export function buildWhatsAppUrl(numero: string, message: string): string {
  return `https://wa.me/52${numero}?text=${encodeURIComponent(message)}`;
}
