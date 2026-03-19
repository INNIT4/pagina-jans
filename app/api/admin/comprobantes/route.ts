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
 * PATCH /api/admin/comprobantes
 * Body: { action, id, ... }
 * Actions:
 *   - updateStatus: { id, status }
 *   - updateComentario: { id, texto }
 *   - aprobar: { id, folio } — marca comprobante revisado + boleto pagado en un batch
 */
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin(req);
  if (session instanceof NextResponse) return session;

  let body: {
    action: string;
    id: string;
    status?: string;
    texto?: string;
    folio?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const { action, id } = body;
  if (!action || !id) {
    return NextResponse.json({ error: "Campos requeridos: action, id." }, { status: 400 });
  }

  const db = adminDb();

  switch (action) {
    case "updateStatus": {
      const { status } = body;
      if (!status) return NextResponse.json({ error: "status requerido." }, { status: 400 });
      await db.collection("comprobantes").doc(id).update({ status });
      return NextResponse.json({ ok: true });
    }

    case "updateComentario": {
      const { texto } = body;
      if (typeof texto !== "string") return NextResponse.json({ error: "texto requerido." }, { status: 400 });
      await db.collection("comprobantes").doc(id).update({
        admin_comentario: {
          texto,
          created_at: new Date(),
        },
      });
      return NextResponse.json({ ok: true });
    }

    case "aprobar": {
      // Obtener comprobante para encontrar los folios
      const comprobanteSnap = await db.collection("comprobantes").doc(id).get();
      if (!comprobanteSnap.exists) {
        return NextResponse.json({ error: "Comprobante no encontrado." }, { status: 404 });
      }
      const comprobante = comprobanteSnap.data()!;
      const folios: string[] = comprobante.folios ?? (comprobante.folio ? [comprobante.folio] : []);

      if (!folios.length) {
        return NextResponse.json({ error: "Sin folios asociados." }, { status: 400 });
      }

      // Procesar cada boleto en el comprobante
      const batch = db.batch();

      for (const folio of folios) {
        const boletoSnap = await db
          .collection("boletos")
          .where("folio", "==", folio)
          .limit(1)
          .get();

        if (boletoSnap.empty) continue;
        const boletoDoc = boletoSnap.docs[0];
        const boleto = boletoDoc.data();

        if (boleto.status === "pendiente") {
          const numeros: number[] = boleto.numeros ?? [];
          numeros.forEach((n) => {
            batch.set(
              db.collection("rifas").doc(boleto.rifa_id).collection("numeros").doc(String(n)),
              { status: "vendido" }
            );
          });
          batch.update(boletoDoc.ref, { status: "pagado" });
          batch.update(db.collection("rifas").doc(boleto.rifa_id), {
            num_apartados: FieldValue.increment(-numeros.length),
            num_vendidos: FieldValue.increment(numeros.length),
          });
        }
      }

      batch.update(db.collection("comprobantes").doc(id), { status: "revisado" });
      await batch.commit();
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  }
}
