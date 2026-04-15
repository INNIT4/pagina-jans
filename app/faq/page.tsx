import type { Metadata } from "next";
import { getSiteTexts } from "@/lib/firestore";
import FaqAccordion from "./FaqAccordion";
import { safeJsonLd } from "@/lib/safe-json-ld";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Preguntas Frecuentes",
  description:
    "Resuelve tus dudas sobre rifas en línea en México. Cómo participar, cómo pagar, cómo saber si ganaste y más.",
  alternates: { canonical: "https://www.sorteosjans.com.mx/faq" },
  openGraph: {
    title: "Preguntas Frecuentes | Sorteos Jans",
    description: "Resuelve tus dudas sobre rifas en línea en México. Cómo participar, cómo pagar, cómo saber si ganaste y más.",
    url: "https://www.sorteosjans.com.mx/faq",
    type: "website",
  },
};

export default async function FAQPage() {
  const texts = await getSiteTexts();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: texts.faq_items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }}
      />
      <h1 className="text-4xl font-bold uppercase tracking-widest mb-2">{texts.faq_title}</h1>
      <span className="accent-bar" />
      <p className="text-gray-400 mb-8 mt-4">{texts.faq_subtitle}</p>
      <FaqAccordion items={texts.faq_items} />
    </div>
  );
}
