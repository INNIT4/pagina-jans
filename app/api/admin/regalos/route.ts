import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/session";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { generateFolio } from "@/lib/folio";

export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest): Promise<{ uid: string; role: string } | NextResponse> {
  const cookie = req.cookies.get("__session")?.value;
  if (!cookie) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const session = await verifySession(cookie);
  if (!session) return NextResponse.json({ error: "Sesión inválida o expirada." }, { status: 401 });
  return session;
}

/**
 * POST /api/admin/regalos
 * Crea un boleto de regalo (pagado directamente) y registra los números como vendidos.
 * Body: { rifa_id, numeros, nombre, apellidos, celular, precio_total }
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (session instanceof NextResponse) return session;

  // Solo rol admin puede crear regalos
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  let body: {
    rifa_id: string;
    numeros: number[];
    nombre: string;
    apellidos: string;
    celular: string;
    precio_total: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const { rifa_id, numeros, nombre, apellidos, celular, precio_total } = body;
  if (!rifa_id || !Array.isArray(numeros) || numeros.length === 0 || !nombre || !apellidos || !celular) {
    return NextResponse.json({ error: "Campos requeridos: rifa_id, numeros, nombre, apellidos, celular." }, { status: 400 });
  }
  if (numeros.length > 200) {
    return NextResponse.json({ error: "Demasiados números." }, { status: 400 });
  }

  const db = adminDb();

  // Generar folio único
  let folio = "";
  for (let i = 0; i < 5; i++) {
    const candidate = generateFolio();
    const existing = await db.collection("boletos").where("folio", "==", candidate).limit(1).get();
    if (existing.empty) { folio = candidate; break; }
  }
  if (!folio) {
    return NextResponse.json({ error: "Error al generar folio. Intenta de nuevo." }, { status: 500 });
  }

  const batch = db.batch();

  // Crear boleto con status pagado
  const boletoRef = db.collection("boletos").doc();
  batch.set(boletoRef, {
    folio,
    rifa_id,
    numeros,
    nombre: nombre.trim(),
    apellidos: apellidos.trim(),
    celular: celular.trim(),
    estado: "Regalo",
    codigo_descuento: "",
    descuento_aplicado: 0,
    precio_total: precio_total ?? 0,
    status: "pagado",
    created_at: Timestamp.now(),
  });

  // Marcar números como vendidos
  numeros.forEach((n) => {
    batch.set(
      db.collection("rifas").doc(rifa_id).collection("numeros").doc(String(n)),
      { status: "vendido" }
    );
  });

  batch.update(db.collection("rifas").doc(rifa_id), {
    num_vendidos: FieldValue.increment(numeros.length),
  });

  await batch.commit();
  return NextResponse.json({ ok: true, folio, id: boletoRef.id });
}
