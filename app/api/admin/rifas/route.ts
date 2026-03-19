import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/session";

export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest): Promise<{ uid: string; role: string } | NextResponse> {
  const cookie = req.cookies.get("__session")?.value;
  if (!cookie) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const session = await verifySession(cookie);
  if (!session) return NextResponse.json({ error: "Sesión inválida o expirada." }, { status: 401 });
  return session;
}

/**
 * PATCH /api/admin/rifas
 * Body: { action, id, data? }
 * Actions: update | delete | anunciarGanador
 */
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin(req);
  if (session instanceof NextResponse) return session;

  // Solo rol admin puede gestionar rifas (no staff)
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  let body: { action: string; id: string; data?: Record<string, unknown>; numero_ganador?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const { action, id, data, numero_ganador } = body;
  if (!action || !id) {
    return NextResponse.json({ error: "Campos requeridos: action, id." }, { status: 400 });
  }

  const db = adminDb();

  switch (action) {
    case "create": {
      if (!data || typeof data !== "object") {
        return NextResponse.json({ error: "data requerido para create." }, { status: 400 });
      }
      const ref = await db.collection("rifas").add({ ...data, num_vendidos: 0, num_apartados: 0 });
      return NextResponse.json({ ok: true, id: ref.id });
    }

    case "update": {
      if (!data || typeof data !== "object") {
        return NextResponse.json({ error: "data requerido para update." }, { status: 400 });
      }
      await db.collection("rifas").doc(id).update(data);
      return NextResponse.json({ ok: true });
    }

    case "delete": {
      await db.collection("rifas").doc(id).delete();
      return NextResponse.json({ ok: true });
    }

    case "anunciarGanador": {
      if (typeof numero_ganador !== "number") {
        return NextResponse.json({ error: "numero_ganador requerido." }, { status: 400 });
      }

      // Verificar que el número tenga un boleto pagado
      const numerosSnap = await db
        .collection("boletos")
        .where("rifa_id", "==", id)
        .where("numeros", "array-contains", numero_ganador)
        .where("status", "==", "pagado")
        .limit(1)
        .get();

      if (numerosSnap.empty) {
        return NextResponse.json(
          { error: "El número no corresponde a ningún boleto pagado." },
          { status: 400 }
        );
      }

      const boletoData = numerosSnap.docs[0].data();
      const ganador = {
        numero: numero_ganador,
        nombre: boletoData.nombre,
        apellidos: boletoData.apellidos,
        folio: boletoData.folio,
        anunciado_at: new Date().toISOString(),
      };

      await db.collection("rifas").doc(id).update({ ganador });
      return NextResponse.json({ ok: true, ganador });
    }

    default:
      return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  }
}
