"use client";

import { useEffect, useState } from "react";
import { getRifas, createRifa, updateRifa, deleteRifa, Rifa } from "@/lib/firestore";

const EMPTY_FORM: Omit<Rifa, "id" | "numeros_vendidos" | "numeros_apartados"> = {
  nombre: "",
  descripcion: "",
  precio_boleto: 50,
  imagen_url: "",
  imagenes_url: [],
  texto_inferior: "",
  num_inicio: 0,
  num_fin: 99,
  fecha_sorteo: "",
  activa: true,
};

export default function AdminRifasPage() {
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");

  async function load() { setRifas(await getRifas()); }
  useEffect(() => { load(); }, []);

  function startNew() {
    setForm(EMPTY_FORM);
    setNewImageUrl("");
    setEditId(null);
    setShowForm(true);
  }

  function startEdit(r: Rifa) {
    setForm({
      nombre: r.nombre,
      descripcion: r.descripcion,
      precio_boleto: r.precio_boleto,
      imagen_url: r.imagen_url,
      imagenes_url: r.imagenes_url ?? [],
      texto_inferior: r.texto_inferior ?? "",
      num_inicio: r.num_inicio,
      num_fin: r.num_fin,
      fecha_sorteo: r.fecha_sorteo,
      activa: r.activa,
    });
    setNewImageUrl("");
    setEditId(r.id!);
    setShowForm(true);
  }

  function addImage() {
    const url = newImageUrl.trim();
    if (!url) return;
    setForm((f) => ({ ...f, imagenes_url: [...f.imagenes_url, url] }));
    setNewImageUrl("");
  }

  function removeImage(i: number) {
    setForm((f) => ({ ...f, imagenes_url: f.imagenes_url.filter((_, idx) => idx !== i) }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // First image of the list becomes imagen_url for backwards compat
    const savedForm = {
      ...form,
      imagen_url: form.imagenes_url[0] ?? form.imagen_url,
    };
    try {
      if (editId) {
        await updateRifa(editId, savedForm);
      } else {
        await createRifa({ ...savedForm, numeros_vendidos: [], numeros_apartados: [] });
      }
      setShowForm(false);
      await load();
    } catch {
      alert("Error al guardar la rifa.");
    }
    setSaving(false);
  }

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
        <button onClick={startNew} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors">
          + Nueva rifa
        </button>
      </div>

      {/* ── Activar / Desactivar rifas ── */}
      {rifas.length > 0 && (
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

                {/* Toggle switch */}
                <button
                  onClick={() => toggleActiva(r)}
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
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">{editId ? "Editar rifa" : "Nueva rifa"}</h2>
                <button onClick={() => setShowForm(false)} className="text-2xl text-slate-400 hover:text-slate-600">&times;</button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre</label>
                  <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Precio boleto</label>
                    <input type="number" min={1} value={form.precio_boleto} onChange={(e) => setForm({ ...form, precio_boleto: Number(e.target.value) })} required
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Num. inicio</label>
                    <input type="number" min={0} value={form.num_inicio} onChange={(e) => setForm({ ...form, num_inicio: Number(e.target.value) })} required
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Num. fin</label>
                    <input type="number" min={0} value={form.num_fin} onChange={(e) => setForm({ ...form, num_fin: Number(e.target.value) })} required
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha sorteo</label>
                  <input type="date" value={form.fecha_sorteo} onChange={(e) => setForm({ ...form, fecha_sorteo: e.target.value })} required
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
                </div>

                {/* Multi-image section */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Imágenes ({form.imagenes_url.length})
                    <span className="text-xs text-slate-400 ml-2">La primera será la principal</span>
                  </label>

                  {/* Image list */}
                  {form.imagenes_url.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {form.imagenes_url.map((url, i) => (
                        <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="w-12 h-10 object-cover rounded flex-shrink-0"
                            onError={(e) => (e.currentTarget.style.display = "none")} />
                          <span className="flex-1 text-xs text-slate-500 truncate">{url}</span>
                          {i === 0 && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Principal</span>}
                          <button type="button" onClick={() => removeImage(i)}
                            className="text-slate-400 hover:text-red-500 flex-shrink-0 text-lg leading-none">
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add image input */}
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImage())}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                    />
                    <button type="button" onClick={addImage}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-sm font-medium rounded-lg transition-colors">
                      + Agregar
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Pega URLs de Imgur, Google Drive, etc. Presiona Enter o clic en Agregar.</p>
                </div>

                {/* Texto inferior */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Texto debajo de la imagen
                    <span className="text-xs text-slate-400 ml-2">visible para los compradores</span>
                  </label>
                  <textarea
                    value={form.texto_inferior}
                    onChange={(e) => setForm({ ...form, texto_inferior: e.target.value })}
                    rows={4}
                    placeholder="Ej: Premio: Auto 2024 seminuevo. Sorteo en vivo por Facebook. Número ganador elegido con Lotería Nacional..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="activa" checked={form.activa} onChange={(e) => setForm({ ...form, activa: e.target.checked })} />
                  <label htmlFor="activa" className="text-sm font-medium">Rifa activa</label>
                </div>
                <button type="submit" disabled={saving}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm">
                  {saving ? "Guardando..." : (editId ? "Guardar cambios" : "Crear rifa")}
                </button>
              </form>
            </div>
          </div>
        </div>
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
                    <button onClick={() => startEdit(r)} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-lg hover:bg-blue-200">Editar</button>
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
