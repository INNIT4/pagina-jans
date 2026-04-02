"use client";

import { useState } from "react";

interface NumberSearchProps {
  numInicio: number;
  numFin: number;
  onResult: (numbers: number[] | null) => void;
}

export default function NumberSearch({ numInicio, numFin, onResult }: NumberSearchProps) {
  const [mode, setMode] = useState<"exacto" | "rango" | "empieza" | "termina" | "contiene">("exacto");
  const [val, setVal] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const allNumbers = Array.from({ length: numFin - numInicio + 1 }, (_, i) => numInicio + i);

  function search() {
    const v = val.trim();
    if (!v) {
      onResult(null);
      return;
    }

    let result: number[] = [];

    if (mode === "exacto") {
      const n = parseInt(v);
      result = allNumbers.filter((x) => x === n);
    } else if (mode === "rango") {
      const start = parseInt(v);
      const end = parseInt(rangeEnd);
      if (!isNaN(start) && !isNaN(end)) {
        result = allNumbers.filter((x) => x >= start && x <= end);
      }
    } else if (mode === "empieza") {
      result = allNumbers.filter((x) => String(x).startsWith(v));
    } else if (mode === "termina") {
      result = allNumbers.filter((x) => String(x).endsWith(v));
    } else if (mode === "contiene") {
      result = allNumbers.filter((x) => String(x).includes(v));
    }

    onResult(result.length > 0 ? result : []);
  }

  function reset() {
    setVal("");
    setRangeEnd("");
    onResult(null);
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["exacto", "rango", "empieza", "termina", "contiene"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              mode === m
                ? "bg-red-600 text-white"
                : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-red-400"
            }`}
          >
            {m === "exacto" ? "Exacto" : m === "rango" ? "Rango" : m === "empieza" ? "Empieza con" : m === "termina" ? "Termina con" : "Contiene"}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <input
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={mode === "rango" ? "Desde" : "Número..."}
          className="w-28 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
        />
        {mode === "rango" && (
          <input
            type="number"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            placeholder="Hasta"
            className="w-28 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        )}
        <button
          onClick={search}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Buscar
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-sm font-medium rounded-lg transition-colors"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}
