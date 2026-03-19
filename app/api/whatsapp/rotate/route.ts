import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getRatelimit } from "@/lib/ratelimit";

// POST /api/whatsapp/rotate — atomically returns current WhatsApp number and advances the index
export async function POST(req: NextRequest) {
  // Rate limiting — evita abuso del endpoint para rotar/exponer números
  const rl = getRatelimit();
  if (rl) {
    const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const { success } = await rl.limit(`wa_rotate:${ip}`);
    if (!success)
      return NextResponse.json({ numero: "" }, { status: 429 });
  }

  const db = adminDb();
  const ref = db.collection("whatsapp_config").doc("config");

  const numero = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = snap.data()!;
    const numeros: string[] = data.numeros ?? (data.numero ? [data.numero] : []);
    if (!numeros.length) return null;
    const indice = ((data.indice_actual ?? 0) as number) % numeros.length;
    const current = numeros[indice];
    tx.update(ref, { indice_actual: (indice + 1) % numeros.length });
    return current;
  });

  return NextResponse.json({ numero: numero ?? "" });
}
