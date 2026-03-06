import { getSiteTexts } from "@/lib/firestore";

export const revalidate = 300;

export default async function SobreNosotrosPage() {
  const texts = await getSiteTexts();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-black mb-2">Sobre Nosotros</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">Conoce más sobre Sorteos Jans.</p>

      <div className="relative rounded-3xl overflow-hidden mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/2.jpeg" alt="Sorteos Jans" className="w-full h-48 object-cover object-center" />
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-8">
          <h2 className="text-3xl font-black text-white mb-2">{texts.about_mission_title}</h2>
          <p className="text-white/80 text-base leading-relaxed max-w-2xl">{texts.about_mission_text}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {texts.about_values.map((item) => (
          <div
            key={item.title}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow border border-slate-100 dark:border-slate-700 text-center"
          >
            <span className="text-4xl block mb-3">{item.icon}</span>
            <h3 className="font-bold text-lg mb-2">{item.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-4">{texts.about_why_title}</h2>
        <ul className="space-y-3 text-slate-600 dark:text-slate-300">
          {texts.about_why_items.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="text-red-500 font-bold mt-0.5">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
