import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getRatelimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// GET /api/whatsapp/support — returns the global help number
export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const { success } = await getRatelimit().limit(`wa_support:${ip}`);
    if (!success) return NextResponse.json({ numero: "" }, { status: 429 });
  } catch (err) {
    console.error("[wa/support] Rate limit check failed:", err);
  }

  try {
    const snap = await adminDb().collection("whatsapp_config").doc("config").get();
    if (!snap.exists) return NextResponse.json({ numero: "" });
    const data = snap.data()!;
    return NextResponse.json({ numero: data.ayuda_numero ?? "" });
  } catch {
    return NextResponse.json({ numero: "" });
  }
}
