import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// POST /api/discount/use — atomically validates and increments discount code usage
export async function POST(req: NextRequest) {
  const { id } = await req.json().catch(() => ({}));

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const db = adminDb();
  const ref = db.collection("discount_codes").doc(id);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Código no encontrado");
      const data = snap.data()!;
      if (!data.activo || data.usos >= data.max_usos) throw new Error("Código no válido");
      tx.update(ref, { usos: FieldValue.increment(1) });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
