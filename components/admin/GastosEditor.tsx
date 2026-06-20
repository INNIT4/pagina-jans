"use client";

import { GastoRifa } from "@/lib/firestore";
import { GASTO_CATEGORIAS, gastoVacio, totalGastos } from "@/lib/gastos";

interface GastosEditorProps {
  gastos: GastoRifa[];
  onChange: (gastos: GastoRifa[]) => void;
}

export default function GastosEditor({ gastos, onChange }: GastosEditorProps) {
  function update(idx: number, patch: Partial<GastoRifa>) {
    const next = [...gastos];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }

  function remove(idx: number) {
    const next = [...gastos];
    next.splice(idx, 1);
    onChange(next);
  }

  const total = totalGastos({ gastos });

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Gastos
          {total > 0 && (
            <span className="ml-2 text-xs font-bold text-red-600 dark:text-red-400 normal-case">
              −${total.toLocaleString("es-MX")}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => onChange([...gastos, gastoVacio()])}
          className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 px-2 py-1 rounded-lg font-bold transition-colors"
        >
          + Agregar Gasto
        </button>
      </div>

      <div className="space-y-3">
        {gastos.map((g, idx) => (
          <div
            key={g.id}
            className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 relative"
          >
            <button
              type="button"
              onClick={() => remove(idx)}
              className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              &times;
            </button>
            <div className="grid grid-cols-2 gap-3 mb-2 pr-4">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Concepto</label>
                <input
                  value={g.concepto}
                  onChange={(e) => update(idx, { concepto: e.target.value })}
                  placeholder="Ej: Facebook Ads, compra del auto..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoría</label>
                <select
                  value={g.categoria}
                  onChange={(e) => update(idx, { categoria: e.target.value as GastoRifa["categoria"] })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs"
                >
                  {GASTO_CATEGORIAS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Monto (MXN)</label>
                <input
                  type="number" min={0}
                  value={g.monto}
                  onChange={(e) => update(idx, { monto: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha</label>
                <input
                  type="date"
                  value={g.fecha}
                  onChange={(e) => update(idx, { fecha: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>
        ))}
        {gastos.length === 0 && (
          <p className="text-center text-xs text-slate-400 py-2 italic">
            Sin gastos registrados. Agrega marketing, premio o comisiones para ver la ganancia neta.
          </p>
        )}
      </div>
    </div>
  );
}
