"use client";

import { useEffect, useState } from "react";
import { getWhatsAppConfig, setWhatsAppConfig } from "@/lib/firestore";

export default function AdminWhatsAppPage() {
  const [numero, setNumero] = useState("");
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWhatsAppConfig().then((c) => {
      if (c?.numero) { setNumero(c.numero); setSaved(c.numero); }
      setLoading(false);
    });
  }, []);

  async function guardar() {
    const num = numero.trim().replace(/\D/g, "");
    if (num.length < 10) { alert("Ingresa un número válido de 10 dígitos."); return; }
    setSaving(true);
    await setWhatsAppConfig({ numero: num });
    setSaved(num);
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-black mb-6">WhatsApp</h1>

      {saved && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-green-700 dark:text-green-300">Número activo</p>
          <p className="text-2xl font-black text-green-800 dark:text-green-200 font-mono">{saved}</p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-5">
        <label className="block text-sm font-semibold mb-2">Número de WhatsApp (10 dígitos)</label>
        <div className="flex gap-2">
          <input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="5512345678"
            maxLength={10}
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={guardar}
            disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition-colors"
          >
            {saving ? "..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
