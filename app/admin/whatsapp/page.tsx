"use client";

import { useEffect, useState } from "react";
import { getWhatsAppConfig, setWhatsAppConfig, WhatsAppConfig } from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";

export default function AdminWhatsAppPage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [nuevoNumero, setNuevoNumero] = useState("");
  const [intervalo, setIntervalo] = useState(24);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWhatsAppConfig().then((c) => {
      if (c) {
        setConfig(c);
        setIntervalo(c.intervalo_horas);
      }
      setLoading(false);
    });
  }, []);

  async function addNumero() {
    const num = nuevoNumero.trim().replace(/\D/g, "");
    if (!num || num.length < 10) { alert("Ingresa un número válido de 10 dígitos."); return; }
    const newConfig: WhatsAppConfig = config
      ? { ...config, numeros: [...config.numeros, num] }
      : { numeros: [num], intervalo_horas: intervalo, indice_actual: 0, ultima_rotacion: Timestamp.now() };
    await setWhatsAppConfig(newConfig);
    setConfig(newConfig);
    setNuevoNumero("");
  }

  async function removeNumero(num: string) {
    if (!config) return;
    const newNums = config.numeros.filter((n) => n !== num);
    const newConfig = { ...config, numeros: newNums, indice_actual: Math.min(config.indice_actual, Math.max(0, newNums.length - 1)) };
    await setWhatsAppConfig(newConfig);
    setConfig(newConfig);
  }

  async function saveIntervalo() {
    if (!config) return;
    setSaving(true);
    const newConfig = { ...config, intervalo_horas: intervalo };
    await setWhatsAppConfig(newConfig);
    setConfig(newConfig);
    setSaving(false);
    alert("Intervalo guardado.");
  }

  async function resetRotacion() {
    if (!config) return;
    const newConfig = { ...config, indice_actual: 0, ultima_rotacion: Timestamp.now() };
    await setWhatsAppConfig(newConfig);
    setConfig(newConfig);
    alert("Rotación reiniciada al primer número.");
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black mb-6">Rotación de WhatsApp</h1>

      {/* Current status */}
      {config && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-green-700 dark:text-green-300">
            Número activo actual:
          </p>
          <p className="text-2xl font-black text-green-800 dark:text-green-200">
            {config.numeros[config.indice_actual] ?? "—"}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            Índice: {config.indice_actual} · Última rotación: {config.ultima_rotacion?.toDate?.()?.toLocaleString("es-MX") ?? "—"}
          </p>
        </div>
      )}

      {/* Numbers list */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-5 mb-6">
        <h2 className="font-bold mb-3">Números configurados</h2>
        <div className="space-y-2 mb-4">
          {config?.numeros.map((num, i) => (
            <div key={num} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                {i === config.indice_actual && (
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                )}
                <span className="font-mono">{num}</span>
                {i === config.indice_actual && <span className="text-xs text-green-600 font-semibold">Activo</span>}
              </div>
              <button
                onClick={() => removeNumero(num)}
                className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
              >
                Eliminar
              </button>
            </div>
          ))}
          {(!config || config.numeros.length === 0) && (
            <p className="text-slate-400 text-sm text-center py-2">Sin números configurados.</p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={nuevoNumero}
            onChange={(e) => setNuevoNumero(e.target.value)}
            placeholder="5512345678"
            maxLength={10}
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={addNumero}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Interval config */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-5 mb-4">
        <h2 className="font-bold mb-3">Intervalo de rotación</h2>
        <div className="flex gap-3 items-center">
          <input
            type="number"
            min={0}
            value={intervalo}
            onChange={(e) => setIntervalo(Number(e.target.value))}
            className="w-24 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
          />
          <span className="text-sm text-slate-500">horas (0 = rotar en cada compra)</span>
          <button
            onClick={saveIntervalo}
            disabled={saving}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-lg text-sm"
          >
            {saving ? "..." : "Guardar"}
          </button>
        </div>
      </div>

      <button
        onClick={resetRotacion}
        className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium rounded-lg text-sm transition-colors"
      >
        Reiniciar rotación
      </button>
    </div>
  );
}
