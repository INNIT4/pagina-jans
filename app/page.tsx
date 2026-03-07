import Link from "next/link";
import Image from "next/image";
import { getRifas, getSiteTexts, DEFAULT_SITE_TEXTS } from "@/lib/firestore";
import BankCards from "@/components/BankCards";
import CountdownTimer from "@/components/CountdownTimer";

export const revalidate = 60;

export default async function HomePage() {
  let rifasActivas: Awaited<ReturnType<typeof getRifas>> = [];
  let texts = DEFAULT_SITE_TEXTS;
  try {
    const [all, t] = await Promise.all([getRifas(), getSiteTexts()]);
    rifasActivas = all.filter((r) => r.activa).slice(0, 3);
    texts = t;
  } catch {
    // Firebase not configured yet
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative text-white py-28 px-4 overflow-hidden clip-diagonal-bottom">
        {/* Background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/1.jpeg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
          aria-hidden="true"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-black/95 via-brand-black/70 to-brand-red/40" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Chevrons decorativos */}
          <p className="text-brand-red/60 text-sm font-bold tracking-[0.3em] uppercase mb-6">
            {"// SORTEOS JANS //"}
          </p>

          {/* Logo con bordes angulares */}
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 overflow-hidden ring-4 ring-brand-red/50 shadow-2xl rounded-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/3.jpeg" alt="Sorteos Jans" className="w-full h-full object-cover" />
            </div>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold uppercase tracking-wider mb-6 leading-tight">
            {texts.hero_title.includes("Sorteos Jans") ? (
              <>
                {texts.hero_title.split("Sorteos Jans")[0]}
                <span className="text-brand-red">Sorteos Jans</span>
                {texts.hero_title.split("Sorteos Jans")[1]}
              </>
            ) : (
              texts.hero_title
            )}
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            {texts.hero_subtitle}
          </p>
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            <Link
              href="/rifas"
              className="px-8 py-4 bg-brand-red hover:bg-red-700 text-white font-bold text-lg transition-colors shadow-lg skew-x-[-3deg]"
            >
              <span className="inline-block skew-x-[3deg]">Ver rifas activas</span>
            </Link>
            <Link
              href="/consulta"
              className="px-8 py-4 border-2 border-brand-red hover:bg-brand-red/20 text-white font-bold text-lg transition-colors skew-x-[-3deg]"
            >
              <span className="inline-block skew-x-[3deg]">Consultar boleto</span>
            </Link>
          </div>

          {/* Tarjeta bancaria — acceso rapido */}
          <Link
            href="#metodos-pago"
            className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-4 transition-colors group rounded-sm"
          >
            <div className="w-10 h-6 rounded-sm bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-sm leading-none">Metodos de pago</p>
              <p className="text-white/60 text-xs mt-0.5">{texts.hero_banks_text}</p>
            </div>
            <svg className="w-4 h-4 text-white/60 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-brand-dark racing-stripes">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold uppercase tracking-widest">{texts.how_it_works_title}</h2>
            <span className="accent-bar-center" />
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {texts.how_it_works_steps.map((item, i) => (
              <div key={i} className="text-center relative">
                {/* Linea conectora en desktop */}
                {i < texts.how_it_works_steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[60%] w-[80%] h-[2px] bg-brand-red/30" />
                )}
                <div className="w-14 h-14 step-number bg-brand-red text-white text-xl font-bold flex items-center justify-center mx-auto mb-4 relative z-10">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p className="text-brand-red/60 text-xs font-bold tracking-widest mb-1">{"// "}{String(i + 1).padStart(2, "0")}</p>
                <h3 className="font-bold text-lg mb-2 text-white">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Active raffles preview */}
      {rifasActivas.length > 0 && (
        <section className="py-20 px-4 bg-brand-black">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold uppercase tracking-widest">Rifas Disponibles</h2>
                <span className="accent-bar" />
              </div>
              <Link href="/rifas" className="text-brand-red hover:text-red-400 font-bold text-sm uppercase tracking-wider">
                Ver todas &rarr;
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {rifasActivas.map((rifa) => (
                <Link
                  key={rifa.id}
                  href={`/rifas/${rifa.id}`}
                  className="group bg-brand-dark/80 border border-gray-800 rounded-sm overflow-hidden border-t-2 border-t-brand-red hover:border-brand-red hover:glow-red transition-all"
                >
                  {rifa.imagen_url ? (
                    <div className="relative w-full h-48">
                      <Image src={rifa.imagen_url} alt={rifa.nombre} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-brand-red/30 to-brand-black flex items-center justify-center">
                      <span className="text-5xl">🎟️</span>
                    </div>
                  )}
                  <div className="p-5">
                    {rifa.ganador ? (
                      <div className="mb-4 bg-yellow-900/30 border border-yellow-700 rounded hover:border-yellow-500 transition-colors p-3">
                        <p className="text-xs text-yellow-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">🏆 ¡Tenemos un Ganador!</p>
                        <p className="font-bold text-white text-lg">#{rifa.ganador.numero} - {rifa.ganador.nombre} {rifa.ganador.apellidos.charAt(0)}.</p>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <CountdownTimer targetDate={rifa.fecha_sorteo} />
                      </div>
                    )}
                    <h3 className="font-bold text-lg mb-1 text-white group-hover:text-brand-red transition-colors">{rifa.nombre}</h3>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{rifa.descripcion}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-brand-red font-bold text-lg">
                        ${rifa.precio_boleto.toLocaleString("es-MX")} MXN
                      </span>
                      <span className="text-xs text-gray-500">por boleto</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tarjetas bancarias */}
      <section id="metodos-pago" className="py-20 px-4 bg-brand-dark racing-stripes">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold uppercase tracking-widest mb-2">Metodos de pago</h2>
            <span className="accent-bar-center" />
            <p className="text-gray-500 mt-4">
              Realiza tu pago por transferencia a cualquiera de estas cuentas.
            </p>
          </div>
          <BankCards />
          <p className="text-center text-sm text-gray-500 mt-6">
            Indica tu folio en el concepto de la transferencia para agilizar la confirmacion.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-red text-white py-20 px-4 clip-diagonal-top">
        <div className="max-w-2xl mx-auto text-center pt-8">
          {/* Chevrons decorativos */}
          <p className="text-white/30 text-sm font-bold tracking-[0.3em] mb-6">{"// // //"}</p>
          <h2 className="text-3xl font-bold uppercase tracking-widest mb-4">¿Tienes dudas?</h2>
          <p className="text-red-100 mb-8">Consulta nuestras preguntas frecuentes o contactanos por WhatsApp.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/faq"
              className="px-6 py-3 bg-white text-brand-red font-bold hover:bg-gray-100 transition-colors skew-x-[-3deg]"
            >
              <span className="inline-block skew-x-[3deg]">Ver FAQ</span>
            </Link>
            <Link
              href="/sobre-nosotros"
              className="px-6 py-3 border-2 border-white text-white font-bold hover:bg-white/10 transition-colors skew-x-[-3deg]"
            >
              <span className="inline-block skew-x-[3deg]">Sobre Nosotros</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
