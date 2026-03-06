import { getSiteTexts } from "@/lib/firestore";
import FaqAccordion from "./FaqAccordion";

export const revalidate = 300;

export default async function FAQPage() {
  const texts = await getSiteTexts();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold uppercase tracking-widest mb-2">{texts.faq_title}</h1>
      <span className="accent-bar" />
      <p className="text-gray-400 mb-8 mt-4">{texts.faq_subtitle}</p>
      <FaqAccordion items={texts.faq_items} />
    </div>
  );
}
