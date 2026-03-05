import Link from "next/link";
import { getRifas } from "@/lib/firestore";

export const revalidate = 300;

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
      <h1 className="text-4xl font-black mb-2">Rifas Previas</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">Historial de rifas realizadas.</p>

      {rifas.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-6xl mb-4">📜</p>
          <p className="text-xl font-semibold text-slate-500">Sin rifas previas aún.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rifas.map((rifa) => {
            const total = rifa.num_fin - rifa.num_inicio + 1;
            const vendidos = rifa.numeros_vendidos?.length ?? 0;
            const pct = total > 0 ? Math.round((vendidos / total) * 100) : 0;

            return (
              <Link
                key={rifa.id}
                href={`/rifas-previas/${rifa.id}`}
                className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow border border-slate-100 dark:border-slate-700 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-500 transition-all"
              >
                {/* Image */}
                <div className="relative w-full h-48 bg-slate-200 dark:bg-slate-700 overflow-hidden">
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
                  <span className="absolute top-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    Finalizada
                  </span>
                </div>

                {/* Info */}
                <div className="p-5">
                  <h2 className="font-bold text-lg mb-1 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    {rifa.nombre}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                    {rifa.descripcion}
                  </p>

                  {/* Stats row */}
                  <div className="flex gap-3 text-xs mb-4">
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-1.5">
                      <span className="text-slate-400">Sorteo </span>
                      <span className="font-semibold">{new Date(rifa.fecha_sorteo).toLocaleDateString("es-MX")}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-1.5">
                      <span className="text-slate-400">Precio </span>
                      <span className="font-semibold">${rifa.precio_boleto.toLocaleString("es-MX")}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-1">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{vendidos} de {total} boletos vendidos</span>
                      <span className="font-semibold">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-slate-400 dark:bg-slate-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-red-500 dark:text-red-400 font-semibold mt-3 group-hover:underline">
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
