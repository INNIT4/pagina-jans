import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getRatelimit } from "@/lib/ratelimit";
import { generateFolio } from "@/lib/folio";

export const dynamic = "force-dynamic";

const ESTADOS_MX = new Set([
  "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua",
  "Ciudad de México","Coahuila","Colima","Durango","Estado de México","Guanajuato","Guerrero",
  "Hidalgo","Jalisco","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro",
  "Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala",
  "Veracruz","Yucatán","Zacatecas",
]);

export async function POST(req: NextRequest) {
  // Rate limiting — si falla Upstash, simplemente se omite
  const rl = getRatelimit();
  if (rl) {
    try {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
      const { success } = await rl.limit(`crear_boleto:${ip}`);
      if (!success) {
        return NextResponse.json({ error: "Demasiadas solicitudes. Espera un momento." }, { status: 429 });
      }
    } catch (err) {
      console.error("[crear boleto] Rate limit check failed (continuando sin límite):", err);
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const { rifa_id, numeros, nombre, apellidos, celular, estado, codigo_descuento } = body;

  // ── Validar campos requeridos ──────────────────────────────────────────────
  if (typeof rifa_id !== "string" || !rifa_id.trim())
    return NextResponse.json({ error: "rifa_id requerido." }, { status: 400 });

  if (!Array.isArray(numeros) || numeros.length === 0)
    return NextResponse.json({ error: "Selecciona al menos un número." }, { status: 400 });

  if (!numeros.every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0))
    return NextResponse.json({ error: "Números inválidos." }, { status: 400 });

  if (typeof nombre !== "string" || !nombre.trim())
    return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });

  if (typeof apellidos !== "string" || !apellidos.trim())
    return NextResponse.json({ error: "Apellidos requerido." }, { status: 400 });

  if (typeof celular !== "string" || !/^\d{10}$/.test(celular))
    return NextResponse.json({ error: "Celular inválido (10 dígitos)." }, { status: 400 });

  if (typeof estado !== "string" || !ESTADOS_MX.has(estado))
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });

  // ── Inicializar Firebase Admin ─────────────────────────────────────────────
  let db: ReturnType<typeof adminDb>;
  try {
    db = adminDb();
  } catch (err) {
    console.error("[crear boleto] Firebase Admin init error:", err);
    const msg = err instanceof Error ? err.message : "Error de configuración del servidor.";
    return NextResponse.json({ error: `Error de configuración: ${msg}` }, { status: 500 });
  }

  // ── Obtener precio de la rifa en el servidor (no confiar en el cliente) ────
  let rifaSnap: FirebaseFirestore.DocumentSnapshot;
  try {
    rifaSnap = await db.collection("rifas").doc(rifa_id.trim()).get();
  } catch (err) {
    console.error("[crear boleto] Error leyendo rifa:", err);
    const msg = err instanceof Error ? err.message : "Error de base de datos.";
    return NextResponse.json({ error: `Error al leer la rifa: ${msg}` }, { status: 500 });
  }

  if (!rifaSnap.exists)
    return NextResponse.json({ error: "Rifa no encontrada." }, { status: 404 });

  const rifa = rifaSnap.data()!;
  if (!rifa.activa)
    return NextResponse.json({ error: "Esta rifa ya no está activa." }, { status: 400 });

  // Validar que los números pertenecen al rango de la rifa
  const nums = numeros as number[];
  const outOfRange = nums.find((n) => n < rifa.num_inicio || n > rifa.num_fin);
  if (outOfRange !== undefined)
    return NextResponse.json({ error: `El número ${outOfRange} no pertenece a esta rifa.` }, { status: 400 });

  // ── Calcular precio en el servidor ────────────────────────────────────────
  const subtotal: number = nums.length * rifa.precio_boleto;
  let descuentoPct = 0;
  let codigoId: string | null = null;
  const codigoStr = typeof codigo_descuento === "string" ? codigo_descuento.trim().toUpperCase() : "";

  if (codigoStr) {
    const codesSnap = await db
      .collection("discount_codes")
      .where("codigo", "==", codigoStr)
      .where("activo", "==", true)
      .limit(1)
      .get();

    if (!codesSnap.empty) {
      const code = codesSnap.docs[0].data();
      if (code.usos < code.max_usos) {
        descuentoPct = code.porcentaje;
        codigoId = codesSnap.docs[0].id;
      }
    }
  }

  const precio_total = subtotal - subtotal * (descuentoPct / 100);

  // ── Generar folio único ───────────────────────────────────────────────────
  let folio = generateFolio();
  for (let i = 0; i < 5; i++) {
    const folioCheck = await db.collection("boletos").where("folio", "==", folio).limit(1).get();
    if (folioCheck.empty) break;
    folio = generateFolio();
  }

  // ── Transacción atómica: verificar números + crear boleto + incrementar código ──
  try {
    await db.runTransaction(async (tx) => {
      const numRefs = nums.map((n) => db.doc(`rifas/${rifa_id}/numeros/${n}`));
      const numSnaps = await Promise.all(numRefs.map((ref) => tx.get(ref)));

      const conflicto = nums.find((_, i) => numSnaps[i].exists && numSnaps[i].data()?.status === "vendido");
      if (conflicto !== undefined)
        throw new Error(`El número ${conflicto} ya no está disponible. Elige otro.`);

      const nuevos = nums.filter((_, i) => !numSnaps[i].exists).length;
      numRefs.forEach((ref) => tx.set(ref, { status: "apartado" }));
      if (nuevos > 0)
        tx.update(db.doc(`rifas/${rifa_id}`), { num_apartados: FieldValue.increment(nuevos) });

      const boletoRef = db.collection("boletos").doc();
      
      let numeros_completos = nums;
      if (rifa.oportunidades && rifa.oportunidades > 1) {
        numeros_completos = [];
        const rango_secundario = (rifa.num_fin - rifa.num_inicio) + 1;
        nums.forEach((p) => {
          for (let i = 0; i < rifa.oportunidades!; i++) {
            numeros_completos.push(p + (i * rango_secundario));
          }
        });
      }

      tx.set(boletoRef, {
        folio,
        rifa_id: rifa_id.trim(),
        numeros: nums,
        numeros_completos,
        nombre: nombre.toString().trim(),
        apellidos: apellidos.toString().trim(),
        celular,
        estado,
        codigo_descuento: codigoId ? codigoStr : "",
        descuento_aplicado: descuentoPct,
        precio_total,
        status: "pendiente",
        created_at: Timestamp.now(),
      });

      if (codigoId)
        tx.update(db.doc(`discount_codes/${codigoId}`), { usos: FieldValue.increment(1) });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al reservar los números.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ folio });
}
