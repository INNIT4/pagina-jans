"use client";

import { useEffect, useState } from "react";
import { getRifas, updateRifa, deleteRifa, Rifa } from "@/lib/firestore";
import RifaFormModal from "@/components/admin/RifaFormModal";
import RifaToggleGrid from "@/components/admin/RifaToggleGrid";

export default function AdminRifasPage() {
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [editRifa, setEditRifa] = useState<Rifa | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() { setRifas(await getRifas()); }
  useEffect(() => { load(); }, []);

  function openNew() { setEditRifa(null); setShowForm(true); }
  function openEdit(r: Rifa) { setEditRifa(r); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditRifa(null); }
  async function handleSaved() { closeForm(); await load(); }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta rifa?")) return;
    await deleteRifa(id);
    await load();
  }

  async function toggleActiva(r: Rifa) {
    await updateRifa(r.id!, { activa: !r.activa });
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Rifas</h1>
        <button onClick={openNew} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors">
          + Nueva rifa
        </button>
      </div>

      <RifaToggleGrid rifas={rifas} onToggle={toggleActiva} />

      {showForm && (
        <RifaFormModal editRifa={editRifa} onClose={closeForm} onSaved={handleSaved} />
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Nombre</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Precio</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Números</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Sorteo</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Imgs</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Estado</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rifas.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 font-medium">{r.nombre}</td>
                <td className="px-4 py-3">${r.precio_boleto.toLocaleString("es-MX")}</td>
                <td className="px-4 py-3">{r.num_inicio}–{r.num_fin}</td>
                <td className="px-4 py-3">{new Date(r.fecha_sorteo).toLocaleDateString("es-MX")}</td>
                <td className="px-4 py-3 text-slate-400">{r.imagenes_url?.length ?? 0}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActiva(r)}
                    className={`text-xs font-bold px-2 py-1 rounded-full ${r.activa ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-slate-100 text-slate-500 dark:bg-slate-700"}`}>
                    {r.activa ? "Activa" : "Inactiva"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(r)} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-lg hover:bg-blue-200">Editar</button>
                    <button onClick={() => handleDelete(r.id!)} className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-lg hover:bg-red-200">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rifas.length === 0 && <p className="text-center py-8 text-slate-400">Sin rifas creadas.</p>}
      </div>
    </div>
  );
}
