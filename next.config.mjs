/** @type {import('next').NextConfig} */

// Dominios de Firebase (Firestore, Auth, Storage)
const firebaseHosts = [
  "https://*.firebaseio.com",
  "https://*.googleapis.com",
  "https://*.google.com",
  "https://firebasestorage.googleapis.com",
  "wss://*.firebaseio.com",
].join(" ");

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.clarity.ms https://c.clarity.ms;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https://firebasestorage.googleapis.com https://*.googleusercontent.com https://*.public.blob.vercel-storage.com;
  connect-src 'self' ${firebaseHosts} https://www.clarity.ms https://c.clarity.ms;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
`.replace(/\n/g, " ");

const securityHeaders = [
  // Content Security Policy
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  // Evita que el sitio sea embebido en iframes (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Evita que el navegador adivine el tipo de archivo (MIME sniffing)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No envía la URL completa como referrer a sitios externos
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Fuerza HTTPS por 2 años
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Desactiva APIs del navegador que no se usan
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
