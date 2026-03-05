"use client";

import { useState } from "react";
import { createRifa, updateRifa, Rifa } from "@/lib/firestore";
import ImageUploader from "./ImageUploader";

type RifaForm = Omit<Rifa, "id" | "num_vendidos" | "num_apartados">;

const EMPTY_FORM: RifaForm = {
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

interface RifaFormModalProps {
  editRifa?: Rifa | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function RifaFormModal({ editRifa, onClose, onSaved }: RifaFormModalProps) {
  const [form, setForm] = useState<RifaForm>(
    editRifa
      ? {
          nombre: editRifa.nombre,
          descripcion: editRifa.descripcion,
          precio_boleto: editRifa.precio_boleto,
          imagen_url: editRifa.imagen_url,
          imagenes_url: editRifa.imagenes_url ?? [],
          texto_inferior: editRifa.texto_inferior ?? "",
          num_inicio: editRifa.num_inicio,
          num_fin: editRifa.num_fin,
          fecha_sorteo: editRifa.fecha_sorteo,
          activa: editRifa.activa,
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const savedForm = {
      ...form,
      imagen_url: form.imagenes_url[0] ?? form.imagen_url,
    };
    try {
      if (editRifa?.id) {
        await updateRifa(editRifa.id, savedForm);
      } else {
        await createRifa({ ...savedForm, num_vendidos: 0, num_apartados: 0 });
      }
      onSaved();
    } catch {
      alert("Error al guardar la rifa.");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">{editRifa ? "Editar rifa" : "Nueva rifa"}</h2>
            <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-600">&times;</button>
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

            <ImageUploader
              images={form.imagenes_url}
              onChange={(urls) => setForm((f) => ({ ...f, imagenes_url: urls }))}
            />

            <div>
              <label className="block text-sm font-medium mb-1">
                Texto debajo de la imagen
                <span className="text-xs text-slate-400 ml-2">visible para los compradores</span>
              </label>
              <textarea
                value={form.texto_inferior}
                onChange={(e) => setForm({ ...form, texto_inferior: e.target.value })}
                rows={4}
                placeholder="Ej: Premio: Auto 2024 seminuevo. Sorteo en vivo por Facebook..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="activa" checked={form.activa} onChange={(e) => setForm({ ...form, activa: e.target.checked })} />
              <label htmlFor="activa" className="text-sm font-medium">Rifa activa</label>
            </div>
            <button type="submit" disabled={saving}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm">
              {saving ? "Guardando..." : (editRifa ? "Guardar cambios" : "Crear rifa")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
