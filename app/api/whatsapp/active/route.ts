import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// GET /api/whatsapp/active — devuelve solo si hay un número activo configurado.
// No expone el número real al cliente — solo un booleano.
export async function GET() {
  try {
    const snap = await adminDb().collection("whatsapp_config").doc("config").get();
    if (!snap.exists) return NextResponse.json({ activo: false });
    const data = snap.data()!;
    const numeros: string[] = data.numeros ?? (data.numero ? [data.numero] : []);
    return NextResponse.json({ 
      activo: numeros.length > 0,
      ayuda_activo: !!data.ayuda_numero 
    });
  } catch {
    return NextResponse.json({ activo: false });
  }
}
