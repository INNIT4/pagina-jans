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



const STATUS_CLASSES: Record<NumberStatus, string> = {
  disponible:  "bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 cursor-pointer",
  vendido:     "",
  apartado:    "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 cursor-not-allowed opacity-70",
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
    const all: number[] = [];
    for (let i = numInicio; i <= numFin; i++) {
      if (!vendidosSet.has(i)) all.push(i); // vendidos: nunca mostrar; apartados: incluir siempre (el status los diferencia)
    }
    return all;
  }, [numInicio, numFin, vendidosSet]);

  // When searching (visibles != null) show all results; otherwise paginate
  const toShow = visibles ?? numbers;

  // Calculate dynamic page size based on total tickets to avoid too many pages
  // e.g. for 60,000 tickets, 1000 per page = 60 pages (too many). 
  // Let's aim for roughly 10-15 pages max.
  const dynamicPageSize = useMemo(() => {
    if (visibles) return toShow.length;
    const total = numFin - numInicio + 1;
    if (total <= 2000) return 1000;
    if (total <= 10000) return 2000;
    if (total <= 30000) return 3000;
    return 5000; // Cap at 5000 for very large raffles
  }, [numInicio, numFin, visibles, toShow.length]);

  const usePagination = visibles === null && toShow.length > dynamicPageSize;
  const totalPages = usePagination ? Math.ceil(toShow.length / dynamicPageSize) : 1;
  const pageNumbers = usePagination ? toShow.slice((page - 1) * dynamicPageSize, page * dynamicPageSize) : toShow;

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
            <span className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-900/50 inline-block" /> Apartado
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
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4 border-t border-gray-800 pt-6">
          <p className="text-xs text-gray-500 font-medium">
            Mostrando <span className="text-white">{(page - 1) * dynamicPageSize + 1}–{Math.min(page * dynamicPageSize, toShow.length)}</span> de <span className="text-white">{toShow.length}</span> números
          </p>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: document.querySelector('.number-grid')?.parentElement?.offsetTop ? (document.querySelector('.number-grid')?.parentElement as HTMLElement).offsetTop - 100 : 0, behavior: 'smooth' });
              }}
              disabled={page === 1}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm border border-gray-800 disabled:opacity-30 hover:bg-gray-800 transition-colors"
            >
              Anterior
            </button>
            
            <div className="relative group">
              <select 
                value={page} 
                onChange={(e) => {
                  setPage(Number(e.target.value));
                  window.scrollTo({ top: document.querySelector('.number-grid')?.parentElement?.offsetTop ? (document.querySelector('.number-grid')?.parentElement as HTMLElement).offsetTop - 100 : 0, behavior: 'smooth' });
                }}
                className="appearance-none bg-brand-dark border border-gray-800 text-white text-xs font-bold py-2 px-8 rounded-sm focus:outline-none focus:border-brand-red cursor-pointer pr-10"
              >
                {Array.from({ length: totalPages }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Rango {i * dynamicPageSize} - {(i + 1) * dynamicPageSize - 1}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            <button
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: document.querySelector('.number-grid')?.parentElement?.offsetTop ? (document.querySelector('.number-grid')?.parentElement as HTMLElement).offsetTop - 100 : 0, behavior: 'smooth' });
              }}
              disabled={page === totalPages}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm border border-gray-800 disabled:opacity-30 hover:bg-gray-800 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
