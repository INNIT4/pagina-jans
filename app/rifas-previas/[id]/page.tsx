"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRifa, Rifa } from "@/lib/firestore";
import ImageCarousel from "@/components/ImageCarousel";
import Link from "next/link";

export default function RifaPreviaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rifa, setRifa] = useState<Rifa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRifa(id)
      .then((r) => {
        if (!r) { router.push("/rifas-previas"); return; }
        setRifa(r);
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-10 h-10 border-4 border-brand-red border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!rifa) return null;

  const total = rifa.num_fin - rifa.num_inicio + 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/rifas-previas"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-red mb-6 transition-colors"
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
          <h1 className="text-3xl font-bold uppercase tracking-widest flex-1">{rifa.nombre}</h1>
          <span className="flex-shrink-0 mt-1 bg-gray-800 text-gray-400 text-xs font-bold px-3 py-1.5 rounded-sm">
            Finalizada
          </span>
        </div>
        <span className="accent-bar" />
        <p className="text-gray-400 mb-4 mt-4">{rifa.descripcion}</p>

        {/* Ganador banner */}
        {rifa.ganador && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-sm p-5 mb-6">
            <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-1">Ganador</p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-yellow-400">#{rifa.ganador.numero}</span>
              <div>
                <p className="font-bold text-lg leading-tight text-white">{rifa.ganador.nombre} {rifa.ganador.apellidos}</p>
                <p className="text-xs text-gray-400">Folio: {rifa.ganador.folio}</p>
              </div>
            </div>
          </div>
        )}

        {rifa.texto_inferior && (
          <div className="bg-brand-dark border border-gray-800 rounded-sm p-5 mb-4 whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
            {rifa.texto_inferior}
          </div>
        )}

        {/* Info chips */}
        <div className="flex flex-wrap gap-3">
          <div className="bg-brand-dark border border-gray-800 rounded-sm px-4 py-2">
            <p className="text-xs text-gray-500">Precio boleto</p>
            <p className="font-bold text-lg text-white">${rifa.precio_boleto.toLocaleString("es-MX")} MXN</p>
          </div>
          <div className="bg-brand-dark border border-gray-800 rounded-sm px-4 py-2">
            <p className="text-xs text-gray-500">Fecha sorteo</p>
            <p className="font-bold text-white">{new Date(rifa.fecha_sorteo).toLocaleDateString("es-MX")}</p>
          </div>
          <div className="bg-brand-dark border border-gray-800 rounded-sm px-4 py-2">
            <p className="text-xs text-gray-500">Numeros totales</p>
            <p className="font-bold text-white">{total}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
