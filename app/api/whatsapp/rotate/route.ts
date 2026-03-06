import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// POST /api/whatsapp/rotate — atomically returns current WhatsApp number and advances the index
export async function POST() {
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
