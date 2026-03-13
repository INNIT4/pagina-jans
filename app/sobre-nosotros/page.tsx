import type { Metadata } from "next";
import { getSiteTexts } from "@/lib/firestore";
import Image from "next/image";
import SupportButton from "@/components/ui/SupportButton";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Sobre Nosotros",
  description:
    "Conoce a Sorteos Jans: plataforma de rifas en línea en México con transparencia, seguridad y soporte personalizado.",
  alternates: { canonical: "https://www.sorteosjans.com.mx/sobre-nosotros" },
};

export default async function SobreNosotrosPage() {
  const texts = await getSiteTexts();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold uppercase tracking-widest mb-2">Sobre Nosotros</h1>
      <span className="accent-bar" />
      <p className="text-gray-400 mb-10 mt-4">Conoce mas sobre Sorteos Jans.</p>

      <div className="relative rounded-sm overflow-hidden mb-10 flex-shrink-0 min-h-[400px]">
        <Image src="/images/2.jpeg" alt="Sorteos Jans" fill className="object-cover object-center" priority />
        <div className="absolute inset-0 bg-brand-black/60 flex flex-col justify-end p-8">
          <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-wider">{texts.about_mission_title}</h2>
          <p className="text-gray-300 text-base leading-relaxed max-w-2xl">{texts.about_mission_text}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {texts.about_values.map((item) => (
          <div
            key={item.title}
            className="bg-brand-dark border border-gray-800 rounded-sm p-6 text-center hover:border-brand-red hover:glow-red transition-all"
          >
            <span className="text-4xl block mb-3">{item.icon}</span>
            <h3 className="font-bold text-lg mb-2 text-white">{item.title}</h3>
            <p className="text-gray-400 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-brand-dark border border-gray-800 rounded-sm p-8 mb-10 text-center">
        <h2 className="text-2xl font-bold uppercase tracking-wider mb-2 text-white">¿Necesitas ayuda personalizada?</h2>
        <p className="text-gray-400 mb-6 font-medium italic">Si tienes alguna pregunta sobre nosotros o nuestros sorteos, contáctanos directamente.</p>
        <SupportButton variant="primary" label="Hablar con un asesor" message="Hola, vengo de la página 'Sobre Nosotros' y me gustaría pedir información." />
      </div>

      <div className="bg-brand-dark border border-gray-800 rounded-sm p-8">
        <h2 className="text-2xl font-bold uppercase tracking-wider mb-4 text-white">{texts.about_why_title}</h2>
        <ul className="space-y-3 text-gray-300">
          {texts.about_why_items.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="text-brand-red font-bold mt-0.5">&#10003;</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
