"use client";

import { Rifa } from "@/lib/firestore";

interface RifaToggleGridProps {
  rifas: Rifa[];
  onToggle: (rifa: Rifa) => void;
}

export default function RifaToggleGrid({ rifas, onToggle }: RifaToggleGridProps) {
  if (rifas.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-base font-bold mb-3 text-slate-700 dark:text-slate-300">Activar / Desactivar</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rifas.map((r) => (
          <div
            key={r.id}
            className={`flex items-center justify-between gap-4 rounded-2xl border-2 p-4 transition-all ${
              r.activa
                ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
            }`}
          >
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{r.nombre}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {r.num_inicio}–{r.num_fin} &middot; ${r.precio_boleto.toLocaleString("es-MX")} MXN
              </p>
            </div>
            <button
              onClick={() => onToggle(r)}
              className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                r.activa ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
              }`}
              title={r.activa ? "Desactivar rifa" : "Activar rifa"}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  r.activa ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
