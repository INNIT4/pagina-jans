import Link from "next/link";
import { getRifas } from "@/lib/firestore";
import BankCards from "@/components/BankCards";

export const revalidate = 60;

export default async function HomePage() {
  let rifasActivas: Awaited<ReturnType<typeof getRifas>> = [];
  try {
    const all = await getRifas();
    rifasActivas = all.filter((r) => r.activa).slice(0, 3);
  } catch {
    // Firebase not configured yet
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-red-700 via-red-600 to-black text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo circular en el hero */}
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 rounded-full bg-white/10 ring-4 ring-white/30 flex items-center justify-center shadow-2xl backdrop-blur-sm">
              <span className="text-5xl font-black text-white tracking-tight">SJ</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
            Gana con <span className="text-yellow-300">Sorteos Jans</span>
          </h1>
          <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
            Participa en nuestras rifas en línea. Elige tus números de la suerte, apártalos y paga
            fácilmente por transferencia bancaria.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mb-6">
            <Link
              href="/rifas"
              className="px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold rounded-full text-lg transition-colors shadow-lg"
            >
              Ver rifas activas
            </Link>
            <Link
              href="/consulta"
              className="px-8 py-4 bg-white/20 hover:bg-white/30 text-white font-bold rounded-full text-lg transition-colors border border-white/40"
            >
              Consultar boleto
            </Link>
          </div>

          {/* Tarjeta bancaria — acceso rápido */}
          <Link
            href="#metodos-pago"
            className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-2xl px-6 py-4 transition-colors group"
          >
            <div className="w-10 h-6 rounded bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-sm leading-none">Métodos de pago</p>
              <p className="text-white/60 text-xs mt-0.5">Azteca · Nu · BBVA</p>
            </div>
            <svg className="w-4 h-4 text-white/60 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">¿Cómo participar?</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Elige tu rifa", desc: "Navega las rifas disponibles y selecciona la que más te guste." },
              { step: "2", title: "Selecciona números", desc: "Elige tus números de la suerte en la cuadrícula interactiva." },
              { step: "3", title: "Aparta y paga", desc: "Completa el formulario y realiza tu pago por transferencia bancaria." },
              { step: "4", title: "Espera el sorteo", desc: "Recibirás confirmación por WhatsApp. ¡Buena suerte!" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-red-600 text-white text-xl font-black flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Active raffles preview */}
      {rifasActivas.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Rifas Disponibles</h2>
              <Link href="/rifas" className="text-red-600 hover:text-red-700 font-semibold text-sm">
                Ver todas &rarr;
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {rifasActivas.map((rifa) => (
                <Link
                  key={rifa.id}
                  href={`/rifas/${rifa.id}`}
                  className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow hover:shadow-xl transition-shadow border border-slate-100 dark:border-slate-700"
                >
                  {rifa.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={rifa.imagen_url} alt={rifa.nombre} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-red-400 to-black flex items-center justify-center">
                      <span className="text-5xl">🎟️</span>
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-bold text-lg mb-1 group-hover:text-red-600 transition-colors">{rifa.nombre}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-3 line-clamp-2">{rifa.descripcion}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-red-600 font-bold text-lg">
                        ${rifa.precio_boleto.toLocaleString("es-MX")} MXN
                      </span>
                      <span className="text-xs text-slate-400">por boleto</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tarjetas bancarias */}
      <section id="metodos-pago" className="py-20 px-4 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2">Métodos de pago</h2>
            <p className="text-slate-500 dark:text-slate-400">
              Realiza tu pago por transferencia a cualquiera de estas cuentas.
            </p>
          </div>
          <BankCards />
          <p className="text-center text-sm text-slate-400 mt-6">
            Indica tu folio en el concepto de la transferencia para agilizar la confirmación.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-red-600 text-white py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">¿Tienes dudas?</h2>
          <p className="text-red-100 mb-6">Consulta nuestras preguntas frecuentes o contáctanos por WhatsApp.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/faq"
              className="px-6 py-3 bg-white text-red-700 font-bold rounded-full hover:bg-red-50 transition-colors"
            >
              Ver FAQ
            </Link>
            <Link
              href="/sobre-nosotros"
              className="px-6 py-3 border border-white text-white font-bold rounded-full hover:bg-white/10 transition-colors"
            >
              Sobre Nosotros
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
