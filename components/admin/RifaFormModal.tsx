"use client";

import { useState } from "react";
import { Rifa } from "@/lib/firestore";
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
  oportunidades: 1,
  premios: [],
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
          oportunidades: editRifa.oportunidades ?? 1,
          premios: editRifa.premios ?? [],
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
      const body = editRifa?.id
        ? { action: "update", id: editRifa.id, data: savedForm }
        : { action: "create", id: "_", data: savedForm };
      const res = await fetch("/api/admin/rifas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Error al guardar.");
      }
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar la rifa.");
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
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">Precio boleto</label>
                <input type="number" min={1} value={form.precio_boleto} onChange={(e) => setForm({ ...form, precio_boleto: Number(e.target.value) })} required
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">Num. inicio</label>
                <input type="number" min={0} value={form.num_inicio} onChange={(e) => setForm({ ...form, num_inicio: Number(e.target.value) })} required
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">Num. fin</label>
                <input type="number" min={0} value={form.num_fin} onChange={(e) => setForm({ ...form, num_fin: Number(e.target.value) })} required
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1" title="Cuantos números tendrá cada boleto principal">Op. por boleto</label>
                <input type="number" min={1} value={form.oportunidades} onChange={(e) => setForm({ ...form, oportunidades: Number(e.target.value) })} required
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha y hora del sorteo</label>
              <input type="datetime-local" value={form.fecha_sorteo} onChange={(e) => setForm({ ...form, fecha_sorteo: e.target.value })} required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
            </div>

            <ImageUploader
              images={form.imagenes_url}
              onChange={(urls) => setForm((f) => ({ ...f, imagenes_url: urls }))}
            />

            {/* Prizes Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Premios</h3>
                <button
                  type="button"
                  onClick={() => {
                    const id = Math.random().toString(36).substr(2, 9);
                    setForm({
                      ...form,
                      premios: [...(form.premios || []), { id, nombre: "", es_principal: false }],
                    });
                  }}
                  className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 px-2 py-1 rounded-lg font-bold transition-colors"
                >
                  + Agregar Premio
                </button>
              </div>

              <div className="space-y-3">
                {(form.premios || []).map((p, idx) => (
                  <div key={p.id} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 relative group">
                    <button
                      type="button"
                      onClick={() => {
                        const newPremios = [...(form.premios || [])];
                        newPremios.splice(idx, 1);
                        setForm({ ...form, premios: newPremios });
                      }}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      &times;
                    </button>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre</label>
                        <input
                          value={p.nombre}
                          onChange={(e) => {
                            const newPremios = [...(form.premios || [])];
                            newPremios[idx] = { ...p, nombre: e.target.value };
                            setForm({ ...form, premios: newPremios });
                          }}
                          placeholder="Ej: Auto 2024"
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Condición (opcional)</label>
                        <input
                          value={p.condicion || ""}
                          onChange={(e) => {
                            const newPremios = [...(form.premios || [])];
                            newPremios[idx] = { ...p, condicion: e.target.value };
                            setForm({ ...form, premios: newPremios });
                          }}
                          placeholder="Ej: Compra 5+ boletos"
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                    
                    {/* Prize Image */}
                    <div className="mb-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Imagen del Premio</label>
                      <ImageUploader 
                        images={p.imagen_url ? [p.imagen_url] : []} 
                        onChange={(urls) => {
                          const newPremios = [...(form.premios || [])];
                          newPremios[idx] = { ...p, imagen_url: urls[0] || "" };
                          setForm({ ...form, premios: newPremios });
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`principal-${p.id}`}
                          checked={p.es_principal}
                          onChange={(e) => {
                            const newPremios = [...(form.premios || [])];
                            newPremios[idx] = { ...p, es_principal: e.target.checked };
                            setForm({ ...form, premios: newPremios });
                          }}
                        />
                        <label htmlFor={`principal-${p.id}`} className="text-[10px] font-bold text-slate-500 uppercase">Premio Principal</label>
                      </div>
                      <div className="flex-1">
                        <input
                          value={p.descripcion || ""}
                          onChange={(e) => {
                            const newPremios = [...(form.premios || [])];
                            newPremios[idx] = { ...p, descripcion: e.target.value };
                            setForm({ ...form, premios: newPremios });
                          }}
                          placeholder="Descripción breve..."
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {(form.premios || []).length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-2 italic">Sin premios específicos configurados.</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Texto debajo de la imagen
                <span className="text-xs text-slate-400 ml-2">visible para los compradores</span>
              </label>
              <textarea
                value={form.texto_inferior}
                onChange={(e) => setForm({ ...form, texto_inferior: e.target.value })}
                rows={4}
                placeholder="Ej: Sorteo en vivo por Facebook..."
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
