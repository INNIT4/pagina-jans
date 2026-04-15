import type { Metadata } from "next";
import Link from "next/link";
import { getRifas } from "@/lib/firestore";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Rifas Previas",
  description:
    "Historial de rifas realizadas por Sorteos Jans. Conoce los ganadores y los premios entregados.",
  alternates: { canonical: "https://www.sorteosjans.com.mx/rifas-previas" },
  openGraph: {
    title: "Rifas Previas | Sorteos Jans",
    description: "Historial de rifas realizadas por Sorteos Jans. Conoce los ganadores y los premios entregados.",
    url: "https://www.sorteosjans.com.mx/rifas-previas",
    type: "website",
  },
};

export default async function RifasPreviasPage() {
  let rifas: Awaited<ReturnType<typeof getRifas>> = [];
  try {
    const all = await getRifas();
    rifas = all.filter((r) => !r.activa);
  } catch {
    // Firebase not configured
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold uppercase tracking-widest mb-2">Rifas Previas</h1>
      <span className="accent-bar" />
      <p className="text-gray-400 mb-8 mt-4">Historial de rifas realizadas.</p>

      {rifas.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-6xl mb-4">📜</p>
          <p className="text-xl font-semibold text-gray-400">Sin rifas previas aun.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rifas.map((rifa) => {
            return (
              <Link
                key={rifa.id}
                href={`/rifas-previas/${rifa.id}`}
                className="group bg-brand-dark/80 border border-gray-800 rounded-sm overflow-hidden hover:border-brand-red hover:glow-red transition-all"
              >
                {/* Image */}
                <div className="relative w-full h-48 bg-brand-dark overflow-hidden">
                  {rifa.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={rifa.imagen_url}
                      alt={rifa.nombre}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-5xl">🎟️</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                  <span className="absolute top-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-sm">
                    Finalizada
                  </span>
                </div>

                {/* Info */}
                <div className="p-5">
                  <h2 className="font-bold text-lg mb-1 text-white group-hover:text-brand-red transition-colors">
                    {rifa.nombre}
                  </h2>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {rifa.descripcion}
                  </p>

                  {/* Stats row */}
                  <div className="flex gap-3 text-xs mb-4">
                    <div className="bg-brand-dark border border-gray-700 rounded-sm px-3 py-1.5">
                      <span className="text-gray-500">Sorteo </span>
                      <span className="font-semibold text-white">{new Date(rifa.fecha_sorteo).toLocaleDateString("es-MX")}</span>
                    </div>
                    <div className="bg-brand-dark border border-gray-700 rounded-sm px-3 py-1.5">
                      <span className="text-gray-500">Precio </span>
                      <span className="font-semibold text-white">${rifa.precio_boleto.toLocaleString("es-MX")}</span>
                    </div>
                  </div>

                  <p className="text-xs text-brand-red font-semibold mt-3 group-hover:underline uppercase tracking-wider">
                    Ver detalles →
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
