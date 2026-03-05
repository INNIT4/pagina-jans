"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRifa, getNumerosOcupados, Rifa } from "@/lib/firestore";
import ImageCarousel from "@/components/ImageCarousel";
import Link from "next/link";

export default function RifaPreviaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rifa, setRifa] = useState<Rifa | null>(null);
  const [vendidosArr, setVendidosArr] = useState<number[]>([]);
  const [apartadosArr, setApartadosArr] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRifa(id)
      .then(async (r) => {
        if (!r) { router.push("/rifas-previas"); return; }
        setRifa(r);
        const { vendidos, apartados } = await getNumerosOcupados(id);
        setVendidosArr(vendidos);
        setApartadosArr(apartados);
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!rifa) return null;

  const total = rifa.num_fin - rifa.num_inicio + 1;

  const vendidosSet = new Set(vendidosArr);
  const apartadosSet = new Set(apartadosArr);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/rifas-previas"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 dark:hover:text-red-400 mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Rifas Previas
      </Link>

      {/* Carousel */}
      <ImageCarousel
        images={
          rifa.imagenes_url?.length
            ? rifa.imagenes_url
            : rifa.imagen_url
            ? [rifa.imagen_url]
            : []
        }
        alt={rifa.nombre}
      />

      {/* Header */}
      <div className="mt-6 mb-8">
        <div className="flex items-start gap-3 mb-2">
          <h1 className="text-3xl font-black flex-1">{rifa.nombre}</h1>
          <span className="flex-shrink-0 mt-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold px-3 py-1.5 rounded-full">
            Finalizada
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mb-4">{rifa.descripcion}</p>

        {rifa.texto_inferior && (
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 mb-4 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {rifa.texto_inferior}
          </div>
        )}

        {/* Info chips */}
        <div className="flex flex-wrap gap-3">
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2">
            <p className="text-xs text-slate-400">Precio boleto</p>
            <p className="font-black text-lg">${rifa.precio_boleto.toLocaleString("es-MX")} MXN</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2">
            <p className="text-xs text-slate-400">Fecha sorteo</p>
            <p className="font-bold">{new Date(rifa.fecha_sorteo).toLocaleDateString("es-MX")}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2">
            <p className="text-xs text-slate-400">Números totales</p>
            <p className="font-bold">{total}</p>
          </div>
        </div>
      </div>

      {/* Number grid — read only */}
      <div>
        <h2 className="text-lg font-bold mb-2">Números</h2>
        <div className="flex flex-wrap gap-1.5 mb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-slate-400 inline-block" /> Vendido
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Apartado
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-700 inline-block" /> Disponible
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: total }, (_, i) => rifa.num_inicio + i).map((n) => {
            const isVendido = vendidosSet.has(n);
            const isApartado = apartadosSet.has(n);
            return (
              <div
                key={n}
                className={`flex items-center justify-center rounded-lg text-xs font-bold select-none
                  ${total <= 100 ? "w-10 h-10" : total <= 500 ? "w-8 h-8 text-[10px]" : "w-6 h-6 text-[9px]"}
                  ${isVendido
                    ? "bg-slate-400 dark:bg-slate-500 text-white"
                    : isApartado
                    ? "bg-amber-400 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                  }`}
              >
                {n}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
