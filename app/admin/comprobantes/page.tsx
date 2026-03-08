"use client";

import { useEffect, useRef, useState } from "react";
import {
  getComprobantesPaginados, updateComprobanteStatus, updateComprobanteComentario,
  getBoletoByFolio, markBoletoPagadoConNumeros, Comprobante,
} from "@/lib/firestore";
import { DocumentSnapshot } from "firebase/firestore";

const PAGE_SIZE = 20;

export default function AdminComprobantesPage() {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendiente" | "revisado">("todos");
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Comprobante | null>(null);
  const [commenting, setCommenting] = useState<Comprobante | null>(null);

  const cursorStack = useRef<(DocumentSnapshot | null)[]>([null]);
  const [pageIdx, setPageIdx] = useState(0);

  const filtersRef = useRef({ filterStatus, pageIdx });
  useEffect(() => { filtersRef.current = { filterStatus, pageIdx }; });

  async function loadPage(idx: number, stack: (DocumentSnapshot | null)[]) {
    setLoading(true);
    const { filterStatus: status } = filtersRef.current;
    try {
      const { comprobantes: cs, hasMore: more, lastDoc } = await getComprobantesPaginados({
        status: status !== "todos" ? status : undefined,
        pageSize: PAGE_SIZE,
        cursor: stack[idx] ?? null,
      });
      setComprobantes(cs);
      setHasMore(more);
      if (more && lastDoc && stack.length <= idx + 1) {
        stack.push(lastDoc);
      }
    } catch (e) {
      console.error("Error cargando comprobantes:", e);
    } finally {
      setLoading(false);
    }
  }

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadPage(0, cursorStack.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    cursorStack.current = [null];
    setPageIdx(0);
    loadPage(0, cursorStack.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  function goNext() {
    const next = pageIdx + 1;
    setPageIdx(next);
    loadPage(next, cursorStack.current);
  }

  function goPrev() {
    const prev = pageIdx - 1;
    setPageIdx(prev);
    loadPage(prev, cursorStack.current);
  }

  async function handleMarcarPagado(c: Comprobante) {
    if (!confirm(`¿Marcar boletos ${c.folios.join(", ")} como PAGADOS?`)) return;
    setMarking(c.id!);
    try {
      for (const folio of c.folios) {
        const boleto = await getBoletoByFolio(folio);
        if (boleto && boleto.status === "pendiente") {
          await markBoletoPagadoConNumeros({ id: boleto.id!, rifa_id: boleto.rifa_id, numeros: boleto.numeros });
        }
      }
      await updateComprobanteStatus(c.id!, "revisado");
      await loadPage(pageIdx, cursorStack.current);
    } catch (e) {
      console.error(e);
      alert("Error al marcar como pagado.");
    }
    setMarking(null);
  }

  async function handleMarcarRevisado(c: Comprobante) {
    setMarking(c.id!);
    await updateComprobanteStatus(c.id!, "revisado");
    setMarking(null);
    await loadPage(pageIdx, cursorStack.current);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Comprobantes</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="revisado">Revisados</option>
        </select>
        <span className="px-3 py-2 text-sm text-slate-500">
          {loading ? "Cargando..." : `${comprobantes.length} comprobante${comprobantes.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Titular</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Folios</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Monto</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Fecha</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Estado</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : comprobantes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-medium">
                    {c.nombre}
                    {c.admin_comentario && (
                      <span className="ml-2 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-1.5 py-0.5 rounded font-bold">
                        comentado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-red-600 dark:text-red-400">
                    {c.folios.join(", ")}
                  </td>
                  <td className="px-4 py-3 font-semibold">${c.monto_total.toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.created_at?.toDate?.()?.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      c.status === "revisado"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => setViewing(c)}
                        className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-colors"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => setCommenting(c)}
                        className="text-xs px-3 py-1.5 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/40 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 font-bold rounded-lg transition-colors"
                      >
                        Comentar
                      </button>
                      {c.status === "pendiente" && (
                        <>
                          <button
                            onClick={() => handleMarcarPagado(c)}
                            disabled={marking === c.id}
                            className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                          >
                            {marking === c.id ? "..." : "Marcar pagado"}
                          </button>
                          <button
                            onClick={() => handleMarcarRevisado(c)}
                            disabled={marking === c.id}
                            className="text-xs px-3 py-1.5 bg-slate-500 hover:bg-slate-600 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                          >
                            {marking === c.id ? "..." : "Marcar revisado"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
        {!loading && comprobantes.length === 0 && (
          <p className="text-center py-8 text-slate-400">Sin comprobantes.</p>
        )}
      </div>

      {/* Pagination */}
      {(pageIdx > 0 || hasMore) && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">Página {pageIdx + 1}</p>
          <div className="flex gap-2">
            <button onClick={goPrev} disabled={pageIdx === 0 || loading}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700">
              Anterior
            </button>
            <button onClick={goNext} disabled={!hasMore || loading}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700">
              Siguiente
            </button>
          </div>
        </div>
      )}

      {viewing && (
        <ComprobanteViewModal comprobante={viewing} onClose={() => setViewing(null)} />
      )}
      {commenting && (
        <ComentarioModal
          comprobante={commenting}
          onClose={() => setCommenting(null)}
          onSaved={async () => {
            setCommenting(null);
            await loadPage(pageIdx, cursorStack.current);
          }}
        />
      )}
    </div>
  );
}

// ─── Ver comprobante ──────────────────────────────────────────────────────────

function ComprobanteViewModal({ comprobante, onClose }: { comprobante: Comprobante; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <div>
            <p className="font-black text-slate-900 dark:text-slate-100">{comprobante.nombre}</p>
            <p className="text-xs text-slate-400 font-mono">{comprobante.folios.join(", ")}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {comprobante.archivo_tipo === "pdf" ? (
            <iframe
              src={comprobante.archivo_url}
              className="w-full h-[70vh] rounded-lg border border-slate-200 dark:border-slate-600"
              title="Comprobante PDF"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={comprobante.archivo_url} alt="Comprobante" className="max-w-full mx-auto rounded-lg shadow" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal comentario admin ───────────────────────────────────────────────────

function ComentarioModal({
  comprobante,
  onClose,
  onSaved,
}: {
  comprobante: Comprobante;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [texto, setTexto] = useState(comprobante.admin_comentario?.texto ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave() {
    if (!texto.trim()) return;
    setSaving(true);
    await updateComprobanteComentario(comprobante.id!, texto.trim());
    await onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <p className="font-black text-slate-900 dark:text-slate-100">Comentario para el cliente</p>
            <p className="text-xs text-slate-400 font-mono">{comprobante.folios.join(", ")} — {comprobante.nombre}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            El usuario verá este mensaje en la página de consulta junto con el archivo que subió.
          </p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej: El comprobante que enviaste no corresponde al monto. Por favor sube el comprobante correcto."
            rows={4}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !texto.trim()}
              className="px-5 py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? "Guardando..." : "Enviar comentario"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
