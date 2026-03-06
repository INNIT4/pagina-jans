import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getRatelimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// POST /api/discount/validate — valida un código de descuento sin exponer la colección completa
export async function POST(req: NextRequest) {
  const rl = getRatelimit();
  if (rl) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const { success } = await rl.limit(`discount_validate:${ip}`);
    if (!success)
      return NextResponse.json({ error: "Demasiados intentos." }, { status: 429 });
  }

  const { codigo } = await req.json().catch(() => ({}));
  if (typeof codigo !== "string" || !codigo.trim())
    return NextResponse.json({ error: "Código requerido." }, { status: 400 });

  const snap = await adminDb()
    .collection("discount_codes")
    .where("codigo", "==", codigo.trim().toUpperCase())
    .where("activo", "==", true)
    .limit(1)
    .get();

  if (snap.empty)
    return NextResponse.json({ error: "Código inválido o expirado." }, { status: 404 });

  const data = snap.docs[0].data();
  if (data.usos >= data.max_usos)
    return NextResponse.json({ error: "Código inválido o expirado." }, { status: 404 });

  // Solo devuelve el porcentaje — nunca el id interno ni otros campos
  return NextResponse.json({ porcentaje: data.porcentaje as number });
}
