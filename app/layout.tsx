import type { Metadata } from "next";
import { headers } from "next/headers";
import { Rajdhani } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-racing",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export const metadata: Metadata = {
  title: {
    default: "Sorteos Jans",
    template: "%s | Sorteos Jans",
  },
  description:
    "Participa en rifas en línea de forma segura. Elige tus números de la suerte y gana increíbles premios.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Sorteos Jans",
    description:
      "Participa en rifas en línea de forma segura. Elige tus números de la suerte y gana increíbles premios.",
    type: "website",
    locale: "es_MX",
    siteName: "Sorteos Jans",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sorteos Jans",
    description: "Participa en rifas en línea de forma segura.",
  },
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
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
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
