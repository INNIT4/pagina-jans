"use client";

import { useEffect, useState } from "react";
import { getWhatsAppConfig, setWhatsAppConfig } from "@/lib/firestore";
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Phone
} from "lucide-react";

export default function AdminWhatsAppPage() {
  const [numeros, setNumeros] = useState<string[]>([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [nuevo, setNuevo] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ayudaNumero, setAyudaNumero] = useState("");

  useEffect(() => {
    getWhatsAppConfig().then((c) => {
      if (c) {
        setNumeros(c.numeros ?? []);
        setIndiceActual(c.indice_actual ?? 0);
        setAyudaNumero(c.ayuda_numero ?? "");
      }
      setLoading(false);
    });
  }, []);

  async function save(nuevosNumeros: string[], nuevoIndice: number, nuevoAyuda?: string) {
    setSaving(true);
    await setWhatsAppConfig({ 
      numeros: nuevosNumeros, 
      indice_actual: nuevoIndice,
      ayuda_numero: nuevoAyuda !== undefined ? nuevoAyuda : ayudaNumero
    });
    setNumeros(nuevosNumeros);
    setIndiceActual(nuevoIndice);
    if (nuevoAyuda !== undefined) setAyudaNumero(nuevoAyuda);
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
    const nuevoIndice = nuevos.length === 0 ? 0 : indiceActual % nuevos.length;
    await save(nuevos, nuevoIndice);
  }

  async function setActivo(idx: number) {
    await save(numeros, idx);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full" />
        <p className="text-slate-500 font-medium animate-pulse">Cargando configuración...</p>
      </div>
    );
  }

  const indiceVivo = numeros.length ? indiceActual % numeros.length : 0;

  return (
    <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-xl text-green-600 dark:text-green-400">
            <MessageSquare size={24} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">WhatsApp</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400">
          Gestiona la rotación de números para atención a clientes. El sistema usa un método de &quot;round-robin&quot; automático.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Lista de números */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Phone size={18} className="text-slate-400" />
              Números en Rotación
            </h2>
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-500">
              {numeros.length} total
            </span>
          </div>

          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {numeros.length > 0 ? (
              numeros.map((n, i) => (
                <div key={n} className={`group flex items-center gap-4 px-6 py-4 transition-colors ${i === indiceVivo ? 'bg-red-50/30 dark:bg-red-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${i === indiceVivo ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 scale-110 shadow-sm shadow-red-100 dark:shadow-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Phone size={18} />
                  </div>
                  
                  <div className="flex-1">
                    <span className="font-mono text-lg tracking-tight font-medium">{n}</span>
                    {i === indiceVivo && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <CheckCircle2 size={12} className="text-green-500" />
                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Activo para el siguiente click</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setActivo(i)}
                      disabled={saving || i === indiceVivo}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 disabled:hidden"
                    >
                      Activar
                    </button>
                    <button
                      onClick={() => eliminar(i)}
                      disabled={saving}
                      className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center space-y-3">
                <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-3xl flex items-center justify-center mx-auto">
                  <AlertCircle size={32} />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[240px] mx-auto">
                  No hay números configurados. El botón de WhatsApp no aparecerá en el sitio.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Agregar número */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-blue-600 dark:text-blue-400">
              <Plus size={20} />
            </div>
            <h2 className="font-bold">Agregar Nuevo Número</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Phone size={16} />
              </div>
              <input
                value={nuevo}
                onChange={(e) => setNuevo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && agregar()}
                placeholder="Ej. 5512345678"
                maxLength={10}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono focus:ring-2 focus:ring-red-500 outline-none transition-all"
              />
            </div>
            <button
              onClick={agregar}
              disabled={saving}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-100 dark:shadow-none flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              {saving ? "Guardando..." : "Agregar"}
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-400 flex items-center gap-1.5 ml-2">
            <RefreshCw size={12} />
            Solo ingresa los 10 dígitos sin espacios ni guiones.
          </p>
        </section>

        {/* Número de Ayuda */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400">
              <HelpCircle size={20} />
            </div>
            <h2 className="font-bold">Número de Soporte Técnico</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Este número se usa globalmente para el botón de &quot;Ayuda&quot; y consultas técnicas.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Phone size={16} />
              </div>
              <input
                value={ayudaNumero}
                onChange={(e) => setAyudaNumero(e.target.value.replace(/\D/g, ""))}
                placeholder="Ej. 5512345678"
                maxLength={10}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono focus:ring-2 focus:ring-red-500 outline-none transition-all"
              />
            </div>
            <button
              onClick={() => save(numeros, indiceActual, ayudaNumero)}
              disabled={saving}
              className="px-10 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-slate-200 dark:shadow-none"
            >
              {saving ? "..." : "Guardar Cambios"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
