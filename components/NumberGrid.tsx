"use client";

import { useMemo } from "react";

type NumberStatus = "disponible" | "vendido" | "apartado" | "seleccionado";

interface NumberGridProps {
  numInicio: number;
  numFin: number;
  vendidos: number[];
  apartados: number[];
  seleccionados: number[];
  visibles?: number[] | null; // null = show all
  onToggle: (n: number) => void;
}

const STATUS_CLASSES: Record<NumberStatus, string> = {
  disponible: "bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 cursor-pointer",
  vendido: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 cursor-not-allowed opacity-75",
  apartado: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200 cursor-not-allowed opacity-75",
  seleccionado: "bg-blue-500 text-white dark:bg-blue-600 cursor-pointer ring-2 ring-blue-400",
};

export default function NumberGrid({
  numInicio,
  numFin,
  vendidos,
  apartados,
  seleccionados,
  visibles,
  onToggle,
}: NumberGridProps) {
  const vendidosSet = useMemo(() => new Set(vendidos), [vendidos]);
  const apartadosSet = useMemo(() => new Set(apartados), [apartados]);
  const seleccionadosSet = useMemo(() => new Set(seleccionados), [seleccionados]);

  const numbers = useMemo(() => {
    const all = [];
    for (let i = numInicio; i <= numFin; i++) all.push(i);
    return all;
  }, [numInicio, numFin]);

  const toShow = visibles ? visibles : numbers;

  function getStatus(n: number): NumberStatus {
    if (seleccionadosSet.has(n)) return "seleccionado";
    if (vendidosSet.has(n)) return "vendido";
    if (apartadosSet.has(n)) return "apartado";
    return "disponible";
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-green-200 dark:bg-green-900 inline-block" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-blue-500 inline-block" /> Seleccionado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-yellow-200 dark:bg-yellow-900 inline-block" /> Apartado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-red-200 dark:bg-red-900 inline-block" /> Vendido
        </span>
      </div>

      {/* Grid */}
      <div className="number-grid">
        {toShow.map((n) => {
          const status = getStatus(n);
          return (
            <button
              key={n}
              onClick={() => {
                if (status !== "vendido" && status !== "apartado") onToggle(n);
              }}
              className={`rounded text-xs font-bold py-2 px-1 transition-all ${STATUS_CLASSES[status]}`}
              title={`Número ${n} — ${status}`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
