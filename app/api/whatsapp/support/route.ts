import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// GET /api/whatsapp/support — returns the global help number
export async function GET() {
  try {
    const snap = await adminDb().collection("whatsapp_config").doc("config").get();
    if (!snap.exists) return NextResponse.json({ numero: "" });
    const data = snap.data()!;
    return NextResponse.json({ numero: data.ayuda_numero ?? "" });
  } catch {
    return NextResponse.json({ numero: "" });
  }
}
