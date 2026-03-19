import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/session";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest): Promise<{ uid: string; role: string } | NextResponse> {
  const cookie = req.cookies.get("__session")?.value;
  if (!cookie) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const session = await verifySession(cookie);
  if (!session) return NextResponse.json({ error: "Sesión inválida o expirada." }, { status: 401 });
  return session;
}

/**
 * PATCH /api/admin/boletos
 * Maneja transiciones de estado de boletos usando Admin SDK.
 * Body: { action, id, rifa_id, numeros }
 * Actions: markPagado | cancelApartado | cancelPagado | revertPagado
 */
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin(req);
  if (session instanceof NextResponse) return session;

  let body: { action: string; id: string; rifa_id: string; numeros: number[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const { action, id, rifa_id, numeros } = body;

  if (!action || !id || !rifa_id || !Array.isArray(numeros) || numeros.length === 0) {
    return NextResponse.json({ error: "Campos requeridos: action, id, rifa_id, numeros." }, { status: 400 });
  }
  if (numeros.length > 200) {
    return NextResponse.json({ error: "Demasiados números." }, { status: 400 });
  }

  const db = adminDb();
  const batch = db.batch();

  switch (action) {
    case "markPagado":
      numeros.forEach((n) => {
        batch.set(db.collection("rifas").doc(rifa_id).collection("numeros").doc(String(n)), { status: "vendido" });
      });
      batch.update(db.collection("boletos").doc(id), { status: "pagado" });
      batch.update(db.collection("rifas").doc(rifa_id), {
        num_apartados: FieldValue.increment(-numeros.length),
        num_vendidos: FieldValue.increment(numeros.length),
      });
      break;

    case "cancelApartado":
      numeros.forEach((n) => {
        batch.delete(db.collection("rifas").doc(rifa_id).collection("numeros").doc(String(n)));
      });
      batch.update(db.collection("boletos").doc(id), { status: "cancelado" });
      batch.update(db.collection("rifas").doc(rifa_id), {
        num_apartados: FieldValue.increment(-numeros.length),
      });
      break;

    case "cancelPagado":
      numeros.forEach((n) => {
        batch.delete(db.collection("rifas").doc(rifa_id).collection("numeros").doc(String(n)));
      });
      batch.update(db.collection("boletos").doc(id), { status: "cancelado" });
      batch.update(db.collection("rifas").doc(rifa_id), {
        num_vendidos: FieldValue.increment(-numeros.length),
      });
      break;

    case "revertPagado":
      numeros.forEach((n) => {
        batch.set(db.collection("rifas").doc(rifa_id).collection("numeros").doc(String(n)), { status: "apartado" });
      });
      batch.update(db.collection("boletos").doc(id), { status: "pendiente" });
      batch.update(db.collection("rifas").doc(rifa_id), {
        num_vendidos: FieldValue.increment(-numeros.length),
        num_apartados: FieldValue.increment(numeros.length),
      });
      break;

    default:
      return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  }

  try {
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }
}
