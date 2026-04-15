import type { Metadata } from "next";
import { headers } from "next/headers";
import { Rajdhani } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import { safeJsonLd } from "@/lib/safe-json-ld";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-racing",
  display: "swap",
});

const SITE_URL = "https://www.sorteosjans.com.mx";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sorteos Jans — Rifas en Línea en México",
    template: "%s | Sorteos Jans",
  },
  description:
    "Participa en rifas en línea de forma segura en México. Elige tus números de la suerte y gana increíbles premios. Boletos desde $200 MXN.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "Sorteos Jans — Rifas en Línea en México",
    description:
      "Participa en rifas en línea de forma segura en México. Elige tus números de la suerte y gana increíbles premios.",
    type: "website",
    locale: "es_MX",
    siteName: "Sorteos Jans",
    url: SITE_URL,
    images: [
      {
        url: "/images/og-default.jpeg",
        width: 1200,
        height: 630,
        alt: "Sorteos Jans — Rifas en Línea en México",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sorteos Jans — Rifas en Línea en México",
    description: "Participa en rifas en línea de forma segura en México.",
    images: ["/images/og-default.jpeg"],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Sorteos Jans",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/images/3.jpeg`,
      },
      description:
        "Plataforma de rifas en línea en México. Participa de forma segura, sencilla y transparente.",
      address: {
        "@type": "PostalAddress",
        addressCountry: "MX",
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "contacto@sorteosjans.com.mx",
        contactType: "customer service",
        availableLanguage: "Spanish",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Sorteos Jans",
      description:
        "Participa en rifas en línea de forma segura en México. Elige tus números de la suerte y gana increíbles premios.",
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
      inLanguage: "es-MX",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/consulta?folio={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = headers().get("x-nonce") || undefined;

  return (
    <html lang="es" suppressHydrationWarning className={rajdhani.variable}>
      <body className="font-racing antialiased min-h-screen flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <FloatingWhatsApp />
        </ThemeProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationSchema) }}
        />
        <Script
          id="microsoft-clarity"
          strategy="lazyOnload"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "vsf6l3xcaj");`,
          }}
        />
      </body>
    </html>
  );
}
