import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/session";

export async function middleware(request: NextRequest) {
  // 1. Generate Nonce for CSP without Buffer (Edge compatible)
  const nonce = crypto.randomUUID().replace(/-/g, '');
  
  // 2. Define CSP without 'unsafe-inline' for scripts (strict-dynamic + nonce)
  // Need to allow Next.js dev server if not in production
  const isDev = process.env.NODE_ENV !== "production";
  
  const firebaseHosts = [
    "https://*.firebaseio.com",
    "https://*.googleapis.com",
    "https://*.google.com",
    "https://firebasestorage.googleapis.com",
    "wss://*.firebaseio.com",
  ].join(" ");

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'sha256-CpJq3WQ5Pnyvcq4cP7FLg8XJ/MGoorHk5pDtc66gXgI=' ${isDev ? "'unsafe-eval'" : ""} https://*.clarity.ms;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob: https://firebasestorage.googleapis.com https://*.googleusercontent.com https://*.public.blob.vercel-storage.com https://*.clarity.ms https://*.bing.com;
    connect-src 'self' ${firebaseHosts} https://www.clarity.ms https://*.clarity.ms;
    frame-src 'self' blob: https://firebasestorage.googleapis.com https://*.public.blob.vercel-storage.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  // 3. Set request headers for Next.js to read
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  // 4. Handle route authentication
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const session = request.cookies.get("__session");

    if (!session?.value) {
      response = NextResponse.redirect(new URL("/admin/login", request.url));
      // Carry over headers
      response.headers.set("Content-Security-Policy", cspHeader);
      response.headers.set("x-nonce", nonce);
      return response;
    }

    const payload = await verifySession(session.value);
    if (!payload) {
      response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete("__session");
      response.cookies.delete("__role");
      response.headers.set("Content-Security-Policy", cspHeader);
      response.headers.set("x-nonce", nonce);
      return response;
    }

    // Role-based Access Control (RBAC)
    const { role } = payload;
    if (role === "staff") {
      const allowedPaths = ["/admin/boletos", "/admin/comprobantes", "/admin/servicios"];
      
      if (pathname === "/admin" || !allowedPaths.some((p) => pathname.startsWith(p))) {
        response = NextResponse.redirect(new URL("/admin/boletos", request.url));
        response.headers.set("Content-Security-Policy", cspHeader);
        response.headers.set("x-nonce", nonce);
        return response;
      }
    }
  }

  // 5. Append CSP headers to normal response
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  // Optional: Also add Next.js dev x-nonce if needed
  response.headers.set('x-nonce', nonce);

  return response;
}

export const config = {
  matcher: [
    // Applies to all routes EXCEPT api routes, static files, images, favicon
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
