import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getRatelimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Rate limiting — evita enumeración de clientes
  const rl = getRatelimit();
  if (rl) {
    const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const { success } = await rl.limit(`consulta:${ip}`);
    if (!success)
      return NextResponse.json({ error: "Demasiadas solicitudes. Espera un momento." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const folio   = searchParams.get("folio");
  const celular = searchParams.get("celular");
  const numero  = searchParams.get("numero");

  const db = adminDb();
  let snap: FirebaseFirestore.QuerySnapshot;

  if (folio) {
    snap = await db.collection("boletos").where("folio", "==", folio.toUpperCase().trim()).limit(1).get();
  } else if (celular) {
    if (!/^\d{10}$/.test(celular))
      return NextResponse.json({ error: "Celular inválido." }, { status: 400 });
    snap = await db.collection("boletos").where("celular", "==", celular).get();
  } else if (numero) {
    const n = parseInt(numero);
    if (isNaN(n) || n < 0)
      return NextResponse.json({ error: "Número inválido." }, { status: 400 });
    snap = await db.collection("boletos").where("numeros", "array-contains", n).get();
    if (snap.empty) {
      snap = await db.collection("boletos").where("numeros_completos", "array-contains", n).get();
    }
  } else {
    return NextResponse.json({ error: "Parámetro requerido: folio, celular o numero." }, { status: 400 });
  }

  const boletos = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      folio: data.folio,
      rifa_id: data.rifa_id,
      numeros: data.numeros,
      numeros_completos: data.numeros_completos,
      nombre: data.nombre,
      apellidos: data.apellidos,
      celular: data.celular ? `${data.celular.slice(0, 2)}******${data.celular.slice(-2)}` : "",
      estado: data.estado ?? "",
      status: data.status,
      precio_total: data.precio_total,
      descuento_aplicado: data.descuento_aplicado ?? 0,
      codigo_descuento: data.codigo_descuento ?? "",
      // Serializar Timestamp a ms para que el cliente pueda reconstruir la fecha
      created_at_ms: data.created_at?.toMillis?.() ?? null,
    };
  });

  return NextResponse.json({ boletos });
}
