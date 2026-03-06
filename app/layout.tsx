import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";

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
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <FloatingWhatsApp />
        </ThemeProvider>
      </body>
    </html>
  );
}
