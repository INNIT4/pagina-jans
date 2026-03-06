import Link from "next/link";
import Image from "next/image";
import { getRifas, Rifa } from "@/lib/firestore";

export const revalidate = 60;

export default async function RifasPage() {
  let rifas: Rifa[] = [];
  try {
    const all = await getRifas();
    rifas = all.filter((r) => r.activa);
  } catch {
    // Firebase not configured
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold uppercase tracking-widest mb-2">Rifas Disponibles</h1>
      <span className="accent-bar" />
      <p className="text-gray-400 mb-8 mt-4">Selecciona una rifa para ver los detalles y apartar tus boletos.</p>

      {rifas.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🎟️</p>
          <p className="text-xl font-semibold text-gray-400">No hay rifas activas en este momento.</p>
          <p className="text-gray-500 mt-2">¡Vuelve pronto!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rifas.map((rifa) => {
            return (
              <Link
                key={rifa.id}
                href={`/rifas/${rifa.id}`}
                className="group bg-brand-dark/80 border border-gray-800 rounded-sm overflow-hidden border-t-2 border-t-brand-red hover:border-brand-red hover:glow-red transition-all"
              >
                {rifa.imagen_url ? (
                  <div className="relative w-full h-52">
                    <Image src={rifa.imagen_url} alt={rifa.nombre} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-52 bg-gradient-to-br from-brand-red/30 to-brand-black flex items-center justify-center">
                    <span className="text-6xl">🎟️</span>
                  </div>
                )}
                <div className="p-6">
                  <h2 className="font-bold text-xl mb-1 text-white group-hover:text-brand-red transition-colors">{rifa.nombre}</h2>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{rifa.descripcion}</p>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Precio por boleto</p>
                      <p className="text-2xl font-bold text-brand-red">
                        ${rifa.precio_boleto.toLocaleString("es-MX")}
                        <span className="text-sm font-normal text-gray-500 ml-1">MXN</span>
                      </p>
                    </div>
                    <span className="bg-brand-red/20 text-brand-red text-xs font-bold px-3 py-1.5 rounded-sm">
                      Sorteo: {new Date(rifa.fecha_sorteo).toLocaleDateString("es-MX")}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
