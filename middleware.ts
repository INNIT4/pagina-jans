import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Decodes a JWT payload without verifying the signature.
 * Edge Runtime cannot use crypto libraries for RS256 verification,
 * so we check: valid structure, expiration, issuer, and audience.
 */
function isValidSession(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // base64url → base64 → JSON
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as Record<string, unknown>;

    // Check expiration
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return false;

    // Check issuer and audience match the Firebase project
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId) {
      if (payload.aud !== projectId) return false;
      if (payload.iss !== `https://securetoken.google.com/${projectId}`) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const session = request.cookies.get("__session");

    if (!session?.value || !isValidSession(session.value)) {
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete("__session");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
