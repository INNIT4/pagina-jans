/** Lee si hay un número activo configurado — llama al API (no expone el número al cliente). */
export async function getActiveWhatsApp(): Promise<string> {
  try {
    const res = await fetch("/api/whatsapp/active");
    if (!res.ok) return "";
    const data = (await res.json()) as { activo?: boolean };
    // Devuelve "1" si activo (solo para mantener compatibilidad con la comprobación !!n)
    return data.activo ? "1" : "";
  } catch {
    return "";
  }
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
