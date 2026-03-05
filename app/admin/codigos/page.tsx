"use client";

import { useEffect, useState } from "react";
import {
  getDiscountCodes,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  DiscountCode,
} from "@/lib/firestore";

const EMPTY: Omit<DiscountCode, "id"> = {
  codigo: "",
  porcentaje: 10,
  activo: true,
  usos: 0,
  max_usos: 100,
};

export default function AdminCodigosPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setCodes(await getDiscountCodes());
  }

  useEffect(() => { load(); }, []);

  function startNew() {
    setForm(EMPTY);
    setEditId(null);
    setShowForm(true);
  }

  function startEdit(c: DiscountCode) {
    setForm({ codigo: c.codigo, porcentaje: c.porcentaje, activo: c.activo, usos: c.usos, max_usos: c.max_usos });
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
    } catch {
      alert("Error al guardar.");
    }
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Códigos de Descuento</h1>
        <button
          onClick={startNew}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors"
        >
          + Nuevo código
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">{editId ? "Editar código" : "Nuevo código"}</h2>
              <button onClick={() => setShowForm(false)} className="text-2xl text-slate-400">&times;</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Código</label>
                <input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                  required className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm uppercase font-mono"
                  placeholder="DESCUENTO20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Porcentaje de descuento</label>
                <input
                  type="number" min={1} max={100} value={form.porcentaje}
                  onChange={(e) => setForm({ ...form, porcentaje: Number(e.target.value) })}
                  required className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Usos máximos</label>
                <input
                  type="number" min={1} value={form.max_usos}
                  onChange={(e) => setForm({ ...form, max_usos: Number(e.target.value) })}
                  required className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="activo_code" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
                <label htmlFor="activo_code" className="text-sm font-medium">Activo</label>
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Código</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Descuento</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Usos</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Estado</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {codes.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 font-mono font-bold">{c.codigo}</td>
                <td className="px-4 py-3">{c.porcentaje}%</td>
                <td className="px-4 py-3">{c.usos} / {c.max_usos}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActivo(c)}
                    className={`text-xs font-bold px-2 py-1 rounded-full ${c.activo ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-slate-100 text-slate-500"}`}>
                    {c.activo ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(c)} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-lg">Editar</button>
                    <button onClick={() => handleDelete(c.id!)} className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-lg">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {codes.length === 0 && <p className="text-center py-8 text-slate-400">Sin códigos.</p>}
      </div>
    </div>
  );
}
