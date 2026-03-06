"use client";

import { useEffect, useState } from "react";
import { getRifas, updateRifa, deleteRifa, anunciarGanador, Rifa, Ganador } from "@/lib/firestore";
import RifaFormModal from "@/components/admin/RifaFormModal";
import RifaToggleGrid from "@/components/admin/RifaToggleGrid";

function GanadorModal({ rifa, onClose, onDone }: { rifa: Rifa; onClose: () => void; onDone: () => void }) {
  const [numero, setNumero] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<Ganador | null>(null);

  async function handleConfirmar() {
    const n = parseInt(numero);
    if (isNaN(n) || n < rifa.num_inicio || n > rifa.num_fin) {
      setError(`Número inválido. Debe estar entre ${rifa.num_inicio} y ${rifa.num_fin}.`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const g = await anunciarGanador(rifa.id!, n);
      setResultado(g);
      onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al anunciar ganador.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        {resultado ? (
          <div className="text-center">
            <div className="text-5xl mb-3">🏆</div>
            <h2 className="text-xl font-black mb-1">¡Ganador anunciado!</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">La rifa fue marcada como inactiva.</p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold mb-1">NÚMERO GANADOR</p>
              <p className="text-3xl font-black text-yellow-600 dark:text-yellow-400 mb-2">{resultado.numero}</p>
              <p className="font-bold">{resultado.nombre} {resultado.apellidos}</p>
              <p className="text-sm text-slate-500">{resultado.folio}</p>
            </div>
            <button onClick={onClose} className="w-full px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-sm">
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-black mb-1">Anunciar ganador</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
              Ingresa el número ganador de <span className="font-semibold">{rifa.nombre}</span>. La rifa se marcará como inactiva automáticamente.
            </p>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Número ganador</label>
            <input
              type="number"
              min={rifa.num_inicio}
              max={rifa.num_fin}
              value={numero}
              onChange={(e) => { setNumero(e.target.value); setError(""); }}
              placeholder={`${rifa.num_inicio} – ${rifa.num_fin}`}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm bg-white dark:bg-slate-700 mb-1 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold">
                Cancelar
              </button>
              <button onClick={handleConfirmar} disabled={loading || !numero} className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
                {loading ? "Guardando..." : "Confirmar ganador"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminRifasPage() {
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [editRifa, setEditRifa] = useState<Rifa | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [ganadorRifa, setGanadorRifa] = useState<Rifa | null>(null);

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

      {ganadorRifa && (
        <GanadorModal
          rifa={ganadorRifa}
          onClose={() => setGanadorRifa(null)}
          onDone={() => { load(); }}
        />
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 w-14" />
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
                <td className="px-4 py-3">
                  {(r.imagenes_url?.[0] || r.imagen_url) ? (
                    <img
                      src={r.imagenes_url?.[0] ?? r.imagen_url}
                      alt={r.nombre}
                      className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                      <svg className="w-5 h-5 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">
                  <div>{r.nombre}</div>
                  {r.ganador && (
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold mt-0.5">
                      Ganador: #{r.ganador.numero} — {r.ganador.nombre} {r.ganador.apellidos}
                    </div>
                  )}
                </td>
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
                  <div className="flex gap-2 flex-wrap">
                    {!r.ganador && (
                      <button onClick={() => setGanadorRifa(r)} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 rounded-lg hover:bg-yellow-200">
                        Ganador
                      </button>
                    )}
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
