"use client";

import { useEffect, useState } from "react";
import {
  getDiscountCodes, createDiscountCode, updateDiscountCode,
  deleteDiscountCode, getRifas, DiscountCode, Rifa,
} from "@/lib/firestore";

const EMPTY: Omit<DiscountCode, "id"> = {
  codigo: "", porcentaje: 10, activo: true, usos: 0, max_usos: 100, rifa_ids: [],
};

function generateCode() {
  const words = ["RIFA", "JANS", "WIN", "LUCKY", "PROMO", "VIP", "SUPER", "MEGA"];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${word}${num}`;
}

export default function AdminCodigosPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);

  async function load() { setCodes(await getDiscountCodes()); }
  useEffect(() => {
    load();
    getRifas().then(setRifas);
  }, []);

  function startNew() { setForm(EMPTY); setEditId(null); setShowForm(true); }
  function startEdit(c: DiscountCode) {
    setForm({ codigo: c.codigo, porcentaje: c.porcentaje, activo: c.activo, usos: c.usos, max_usos: c.max_usos, rifa_ids: c.rifa_ids ?? [] });
    setEditId(c.id!);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await updateDiscountCode(editId, form);
      } else {
        await createDiscountCode({ ...form, codigo: form.codigo.toUpperCase() });
      }
      setShowForm(false);
      await load();
    } catch { alert("Error al guardar."); }
    setSaving(false);
  }

  async function toggleActivo(c: DiscountCode) {
    await updateDiscountCode(c.id!, { activo: !c.activo });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este código?")) return;
    await deleteDiscountCode(id);
    await load();
  }

  async function handleReset(c: DiscountCode) {
    if (!confirm(`¿Resetear los usos de "${c.codigo}" a 0?`)) return;
    setResetting(c.id!);
    await updateDiscountCode(c.id!, { usos: 0 });
    await load();
    setResetting(null);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  // Stats
  const totalActivos = codes.filter((c) => c.activo && c.usos < c.max_usos).length;
  const totalUsos = codes.reduce((s, c) => s + c.usos, 0);
  const agotados = codes.filter((c) => c.usos >= c.max_usos).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Códigos de Descuento</h1>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo código
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Total</p>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{codes.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">códigos creados</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Activos</p>
          <p className="text-2xl font-black text-green-600">{totalActivos}</p>
          <p className="text-xs text-slate-400 mt-0.5">{agotados > 0 ? `${agotados} agotado${agotados > 1 ? "s" : ""}` : "sin agotados"}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Usos totales</p>
          <p className="text-2xl font-black text-blue-600">{totalUsos}</p>
          <p className="text-xs text-slate-400 mt-0.5">veces aplicado</p>
        </div>
      </div>

      {/* Cards grid */}
      {codes.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
          <p className="text-slate-400 mb-3">Sin códigos de descuento</p>
          <button onClick={startNew} className="text-sm text-red-600 font-bold hover:underline">
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {codes.map((c) => {
            const pct = c.max_usos > 0 ? Math.min((c.usos / c.max_usos) * 100, 100) : 0;
            const agotado = c.usos >= c.max_usos;
            const isCopied = copied === c.codigo;

            return (
              <div
                key={c.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 flex flex-col gap-3 transition-all ${
                  agotado
                    ? "border-slate-200 dark:border-slate-700 opacity-60"
                    : c.activo
                    ? "border-green-200 dark:border-green-800"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-lg text-slate-900 dark:text-slate-100 tracking-widest">
                        {c.codigo}
                      </span>
                      <button
                        onClick={() => copyCode(c.codigo)}
                        title="Copiar código"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      >
                        {isCopied ? (
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {c.porcentaje}% de descuento
                    </p>
                  </div>
                  {/* Status badge */}
                  <button
                    onClick={() => toggleActivo(c)}
                    className={`flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                      agotado
                        ? "bg-slate-100 text-slate-500 dark:bg-slate-700 cursor-default"
                        : c.activo
                        ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 hover:bg-green-200"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                    disabled={agotado}
                  >
                    {agotado ? "Agotado" : c.activo ? "Activo" : "Inactivo"}
                  </button>
                </div>

                {/* Usage progress */}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{c.usos} usos</span>
                    <span>{c.max_usos} máximo</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-green-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{Math.round(pct)}% utilizado</p>
                </div>

                {/* Rifas */}
                <div className="flex flex-wrap gap-1.5">
                  {!c.rifa_ids || c.rifa_ids.length === 0 ? (
                    <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                      Todas las rifas
                    </span>
                  ) : c.rifa_ids.map((rid) => {
                    const r = rifas.find((r) => r.id === rid);
                    return (
                      <span key={rid} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                        {r?.nombre ?? rid}
                      </span>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => startEdit(c)}
                    className="flex-1 text-xs py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg transition-colors"
                  >
                    Editar
                  </button>
                  {c.usos > 0 && (
                    <button
                      onClick={() => handleReset(c)}
                      disabled={resetting === c.id}
                      className="flex-1 text-xs py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {resetting === c.id ? "..." : "Resetear"}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(c.id!)}
                    className="flex-1 text-xs py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-semibold rounded-lg transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-black text-lg">{editId ? "Editar código" : "Nuevo código"}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Código */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Código</label>
                <div className="flex gap-2">
                  <input
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase().replace(/\s/g, "") })}
                    required
                    placeholder="VERANO25"
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm uppercase font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, codigo: generateCode() })}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    Generar
                  </button>
                </div>
              </div>

              {/* Porcentaje */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Descuento: <span className="text-red-600 font-black">{form.porcentaje}%</span>
                </label>
                <input
                  type="range" min={1} max={100} value={form.porcentaje}
                  onChange={(e) => setForm({ ...form, porcentaje: Number(e.target.value) })}
                  className="w-full accent-red-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1%</span><span>50%</span><span>100%</span>
                </div>
              </div>

              {/* Usos máximos */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Usos máximos</label>
                <input
                  type="number" min={1} value={form.max_usos}
                  onChange={(e) => setForm({ ...form, max_usos: Number(e.target.value) })}
                  required
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Rifas */}
              {rifas.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Válido para</label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!form.rifa_ids || form.rifa_ids.length === 0}
                        onChange={() => setForm({ ...form, rifa_ids: [] })}
                        className="accent-red-600"
                      />
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Todas las rifas</span>
                    </label>
                    {rifas.map((r) => {
                      const selected = (form.rifa_ids ?? []).includes(r.id!);
                      return (
                        <label key={r.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              const current = form.rifa_ids ?? [];
                              setForm({
                                ...form,
                                rifa_ids: selected
                                  ? current.filter((id) => id !== r.id)
                                  : [...current, r.id!],
                              });
                            }}
                            className="accent-red-600"
                          />
                          <span className="text-sm">{r.nombre}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Activo toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <span className="text-sm font-semibold">Activo al crear</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, activo: !form.activo })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.activo ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.activo ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              {/* Preview */}
              {form.codigo && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-red-400 mb-1">Vista previa</p>
                  <p className="font-mono font-black text-red-700 dark:text-red-300 tracking-widest">{form.codigo}</p>
                  <p className="text-xs text-red-500 mt-1">{form.porcentaje}% off · hasta {form.max_usos} usos</p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
              >
                {saving ? "Guardando..." : editId ? "Guardar cambios" : "Crear código"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
