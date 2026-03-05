"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRifa, Rifa } from "@/lib/firestore";
import NumberGrid from "@/components/NumberGrid";
import NumberSearch from "@/components/NumberSearch";
import ApartadoForm from "@/components/ApartadoForm";
import RandomPicker from "@/components/RandomPicker";
import ImageCarousel from "@/components/ImageCarousel";

export default function RifaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rifa, setRifa] = useState<Rifa | null>(null);
  const [loading, setLoading] = useState(true);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [visibles, setVisibles] = useState<number[] | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getRifa(id)
      .then((r) => {
        if (!r || !r.activa) router.push("/rifas");
        setRifa(r);
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  function toggleNumber(n: number) {
    setSeleccionados((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!rifa) return null;

  const total = rifa.num_fin - rifa.num_inicio + 1;
  const vendidos = rifa.numeros_vendidos?.length ?? 0;
  const apartados = rifa.numeros_apartados?.length ?? 0;
  const disponibles = total - vendidos - apartados;

  const vendidosSet = new Set(rifa.numeros_vendidos ?? []);
  const apartadosSet = new Set(rifa.numeros_apartados ?? []);
  const selSet = new Set(seleccionados);
  const numerosDisponibles: number[] = [];
  for (let i = rifa.num_inicio; i <= rifa.num_fin; i++) {
    if (!vendidosSet.has(i) && !apartadosSet.has(i) && !selSet.has(i)) numerosDisponibles.push(i);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        {/* Carousel — full width, tall */}
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

        {/* Info below carousel */}
        <div className="mt-6">
          <h1 className="text-3xl font-black mb-2">{rifa.nombre}</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-4">{rifa.descripcion}</p>

          {/* Texto inferior libre del admin */}
          {rifa.texto_inferior && (
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 mb-4 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {rifa.texto_inferior}
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <div className="bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-2">
              <p className="text-xs text-red-500">Precio boleto</p>
              <p className="font-black text-xl text-red-700 dark:text-red-300">
                ${rifa.precio_boleto.toLocaleString("es-MX")} MXN
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2">
              <p className="text-xs text-slate-500">Fecha sorteo</p>
              <p className="font-bold">{new Date(rifa.fecha_sorteo).toLocaleDateString("es-MX")}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl px-4 py-2">
              <p className="text-xs text-green-600">Disponibles</p>
              <p className="font-black text-xl text-green-700 dark:text-green-300">{disponibles}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Random picker */}
      <div className="mb-6">
        <RandomPicker
          disponibles={numerosDisponibles}
          onPick={(nums) => setSeleccionados((prev) => Array.from(new Set([...prev, ...nums])))}
        />
      </div>

      {/* Search */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-3">Buscar números</h2>
        <NumberSearch
          numInicio={rifa.num_inicio}
          numFin={rifa.num_fin}
          onResult={setVisibles}
        />
      </div>

      {/* Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-3">
          Selecciona tus números
          {visibles !== null && (
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({visibles.length} resultados)
            </span>
          )}
        </h2>
        <NumberGrid
          numInicio={rifa.num_inicio}
          numFin={rifa.num_fin}
          vendidos={rifa.numeros_vendidos ?? []}
          apartados={rifa.numeros_apartados ?? []}
          seleccionados={seleccionados}
          visibles={visibles}
          onToggle={toggleNumber}
        />
      </div>

      {/* Floating cart */}
      {seleccionados.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shadow-2xl">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{seleccionados.length} boleto(s) seleccionado(s)</p>
              <p className="text-xs text-slate-500">
                Total: ${(seleccionados.length * rifa.precio_boleto).toLocaleString("es-MX")} MXN
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSeleccionados([])}
                className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Limpiar
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
              >
                Apartar
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <ApartadoForm
          rifa={rifa}
          numeros={seleccionados}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
