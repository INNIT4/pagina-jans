"use client";

import { useEffect, useState } from "react";
import { getWhatsAppConfig, setWhatsAppConfig } from "@/lib/firestore";

export default function AdminWhatsAppPage() {
  const [numeros, setNumeros] = useState<string[]>([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [nuevo, setNuevo] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWhatsAppConfig().then((c) => {
      if (c) {
        setNumeros(c.numeros ?? []);
        setIndiceActual(c.indice_actual ?? 0);
      }
      setLoading(false);
    });
  }, []);

  async function save(nuevosNumeros: string[], nuevoIndice: number) {
    setSaving(true);
    await setWhatsAppConfig({ numeros: nuevosNumeros, indice_actual: nuevoIndice });
    setNumeros(nuevosNumeros);
    setIndiceActual(nuevoIndice);
    setSaving(false);
  }

  async function agregar() {
    const num = nuevo.trim().replace(/\D/g, "");
    if (num.length < 10) { alert("Ingresa un número válido de 10 dígitos."); return; }
    if (numeros.includes(num)) { alert("Ese número ya está en la lista."); return; }
    await save([...numeros, num], indiceActual);
    setNuevo("");
  }

  async function eliminar(idx: number) {
    const nuevos = numeros.filter((_, i) => i !== idx);
    // Ajustar índice si quedó fuera de rango
    const nuevoIndice = nuevos.length === 0 ? 0 : indiceActual % nuevos.length;
    await save(nuevos, nuevoIndice);
  }

  async function setActivo(idx: number) {
    await save(numeros, idx);
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full" /></div>;

  const indiceVivo = numeros.length ? indiceActual % numeros.length : 0;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-black mb-2">WhatsApp</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Los números rotan automáticamente en round-robin cada vez que un usuario hace click.
      </p>

      {/* Lista de números */}
      {numeros.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 mb-5">
          {numeros.map((n, i) => (
            <div key={n} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${i === indiceVivo ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"}`}
                title={i === indiceVivo ? "Siguiente en usarse" : ""}
              />
              <span className="flex-1 font-mono text-sm">{n}</span>
              {i === indiceVivo && (
                <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                  Siguiente
                </span>
              )}
              <button
                onClick={() => setActivo(i)}
                disabled={saving || i === indiceVivo}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-30 disabled:no-underline"
              >
                Usar ahora
              </button>
              <button
                onClick={() => eliminar(i)}
                disabled={saving}
                className="text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                title="Eliminar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 mb-5 text-sm text-amber-700 dark:text-amber-400">
          No hay números configurados. Agrega al menos uno para que el botón de WhatsApp aparezca en el sitio.
        </div>
      )}

      {/* Agregar número */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-5">
        <label className="block text-sm font-semibold mb-2">Agregar número (10 dígitos)</label>
        <div className="flex gap-2">
          <input
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregar()}
            placeholder="5512345678"
            maxLength={10}
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={agregar}
            disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition-colors"
          >
            {saving ? "..." : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}
