"use client";

import { useMemo, useState, useEffect } from "react";

type NumberStatus = "disponible" | "vendido" | "apartado" | "seleccionado";

interface NumberGridProps {
  numInicio: number;
  numFin: number;
  vendidos: number[];
  apartados: number[];
  seleccionados: number[];
  visibles?: number[] | null; // null = show all
  mostrarApartados?: boolean; // default true
  onToggle: (n: number) => void;
}

const PAGE_SIZE = 200;

const STATUS_CLASSES: Record<NumberStatus, string> = {
  disponible:  "bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 cursor-pointer",
  vendido:     "",
  apartado:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200 cursor-not-allowed opacity-75",
  seleccionado:"bg-blue-500 text-white dark:bg-blue-600 cursor-pointer ring-2 ring-blue-400",
};

export default function NumberGrid({
  numInicio,
  numFin,
  vendidos,
  apartados,
  seleccionados,
  visibles,
  mostrarApartados = true,
  onToggle,
}: NumberGridProps) {
  const [page, setPage] = useState(1);

  const vendidosSet = useMemo(() => new Set(vendidos), [vendidos]);
  const apartadosSet = useMemo(() => new Set(apartados), [apartados]);
  const seleccionadosSet = useMemo(() => new Set(seleccionados), [seleccionados]);

  const numbers = useMemo(() => {
    const all = [];
    for (let i = numInicio; i <= numFin; i++) {
      if (!vendidosSet.has(i)) all.push(i);
    }
    return all;
  }, [numInicio, numFin, vendidosSet]);

  // When searching (visibles != null) show all results; otherwise paginate
  const toShow = visibles ?? numbers;
  const usePagination = visibles === null && toShow.length > PAGE_SIZE;
  const totalPages = usePagination ? Math.ceil(toShow.length / PAGE_SIZE) : 1;
  const pageNumbers = usePagination ? toShow.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : toShow;

  // Reset page when visibles changes
  useEffect(() => { setPage(1); }, [visibles]);

  function getStatus(n: number): NumberStatus {
    if (seleccionadosSet.has(n)) return "seleccionado";
    if (vendidosSet.has(n)) return "vendido";
    if (mostrarApartados && apartadosSet.has(n)) return "apartado";
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
        {mostrarApartados && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-yellow-200 dark:bg-yellow-900 inline-block" /> Apartado
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="number-grid">
        {pageNumbers.map((n) => {
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

      {/* Pagination controls */}
      {usePagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">
            Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, toShow.length)} de {toShow.length} números
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Anterior
            </button>
            <span className="px-3 py-1 text-xs text-slate-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
