import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const session = request.cookies.get("__session");

    if (!session?.value) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const payload = await verifySession(session.value);
    if (!payload) {
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete("__session");
      response.cookies.delete("__role");
      return response;
    }

    // Role-based Access Control (RBAC)
    const { role } = payload;
    if (role === "staff") {
      const allowedPaths = ["/admin/boletos", "/admin/comprobantes", "/admin/servicios"];
      
      if (pathname === "/admin" || !allowedPaths.some((p) => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL("/admin/boletos", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
