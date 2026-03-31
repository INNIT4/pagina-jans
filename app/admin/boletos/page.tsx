"use client";

import { useEffect, useRef, useState } from "react";
import {
  getBoletosPaginados, markBoletoPagadoConNumeros, getRifas,
  cancelApartado, cancelPagado, cancelarBoletosExpirados,
  revertPagadoToApartado, getAppSettings, Boleto, Rifa,
} from "@/lib/firestore";
import { DocumentSnapshot } from "firebase/firestore";

const PAGE_SIZE = 25;

export default function AdminBoletosPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [rifas, setRifas] = useState<Map<string, Rifa>>(new Map());
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendiente" | "pagado" | "cancelado">("todos");
  const [filterRifa, setFilterRifa] = useState("");
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState<string | null>(null);
  const [canceladosMsg, setCanceladosMsg] = useState<string | null>(null);
  const [limitHoras, setLimitHoras] = useState(24);
  const [cancelacionActiva, setCancelacionActiva] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [reminderBoleto, setReminderBoleto] = useState<Boleto | null>(null);
  const [reminderText, setReminderText] = useState("");

  // Cursor stack: index 0 = null (primera página), index N = cursor para llegar a la página N
  const cursorStack = useRef<(DocumentSnapshot | null)[]>([null]);
  const [pageIdx, setPageIdx] = useState(0);

  const isSearching = search.trim().length > 0;

  // Ref para poder llamar loadPage con los valores actuales sin dependencias stale
  const filtersRef = useRef({ filterStatus, filterRifa, isSearching, pageIdx });
  useEffect(() => { filtersRef.current = { filterStatus, filterRifa, isSearching, pageIdx }; });

  async function loadPage(idx: number, stack: (DocumentSnapshot | null)[]) {
    setLoading(true);
    const { filterStatus: status, filterRifa: rifaId, isSearching: searching } = filtersRef.current;
    try {
      const { boletos: bs, hasMore: more, lastDoc } = await getBoletosPaginados({
        status: status !== "todos" ? status : undefined,
        rifaId: rifaId || undefined,
        pageSize: PAGE_SIZE,
        cursor: stack[idx] ?? null,
        loadAll: searching,
      });
      setBoletos(bs);
      setHasMore(!searching && more);
      if (!searching && lastDoc && stack.length <= idx + 1) {
        stack.push(lastDoc);
      }
    } catch (e) {
      console.error("Error cargando boletos:", e);
    } finally {
      setLoading(false);
    }
  }

  // Inicialización única: auto-cancel + rifas + primera carga
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    getRifas().then((rs) => setRifas(new Map(rs.map((r) => [r.id!, r]))));

    getAppSettings().then(async (s) => {
      setLimitHoras(s.cancelacion_horas);
      setCancelacionActiva(s.cancelacion_activa);
      if (s.cancelacion_activa) {
        const cancelados = await cancelarBoletosExpirados(s.cancelacion_horas);
        if (cancelados > 0) {
          setCanceladosMsg(`${cancelados} boleto${cancelados > 1 ? "s" : ""} cancelado${cancelados > 1 ? "s" : ""} automáticamente.`);
        }
      }
    }).finally(() => loadPage(0, cursorStack.current));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al cambiar filtros o búsqueda: resetear a página 0 (no corre en el primer mount)
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    cursorStack.current = [null];
    setPageIdx(0);
    loadPage(0, cursorStack.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterRifa, search]);

  // Actualizar "ahora" cada minuto
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

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

  async function reloadCurrentPage() {
    await loadPage(pageIdx, cursorStack.current);
  }

  async function handleMarkPagado(boleto: Boleto) {
    if (!confirm(`¿Marcar boleto ${boleto.folio} como pagado?`)) return;
    
    let notifyWhatsApp = false;
    let waWindow: Window | null = null;
    if (confirm(`¿Deseas enviar un mensaje de confirmación por WhatsApp al numero ${boleto.celular}?`)) {
      notifyWhatsApp = true;
      waWindow = window.open("", "_blank");
    }

    setMarking(boleto.id!);
    try {
      await markBoletoPagadoConNumeros({ id: boleto.id!, rifa_id: boleto.rifa_id, numeros: boleto.numeros });
      if (notifyWhatsApp && waWindow) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const msg = `El pago de tu folio ${boleto.folio} ha sido confirmado exitosamente.\nVerifica el estado de tu boleto: ${baseUrl}/consulta?f=${boleto.folio}&act=1`;
        waWindow.location.href = `https://wa.me/52${boleto.celular.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
      } else if (waWindow) {
        waWindow.close();
      }
    } catch (e) {
      if (waWindow) waWindow.close();
      console.error(e);
      alert("Error al marcar como pagado.");
    }
    setMarking(null);
    await reloadCurrentPage();
  }

  async function handleCancel(boleto: Boleto) {
    if (!confirm(`¿Cancelar boleto ${boleto.folio}?`)) return;
    setMarking(boleto.id!);
    if (boleto.status === "pendiente") {
      await cancelApartado({ id: boleto.id!, rifa_id: boleto.rifa_id, numeros: boleto.numeros });
    } else {
      await cancelPagado({ id: boleto.id!, rifa_id: boleto.rifa_id, numeros: boleto.numeros });
    }
    setMarking(null);
    await reloadCurrentPage();
  }

  async function handleRevertir(boleto: Boleto) {
    if (!confirm(`¿Revertir boleto ${boleto.folio} a "pendiente"? Los números volverán a estado apartado.`)) return;
    setMarking(boleto.id!);
    await revertPagadoToApartado({ id: boleto.id!, rifa_id: boleto.rifa_id, numeros: boleto.numeros });
    setMarking(null);
    await reloadCurrentPage();
  }

  // Filtro de texto client-side sobre los boletos cargados
  const q = search.trim().toUpperCase();
  const STATUS_PRIORITY: Record<string, number> = { pendiente: 0, pagado: 1, cancelado: 2 };

  const displayed = (q
    ? boletos.filter((b) => {
        const nombre = `${b.nombre} ${b.apellidos}`.toUpperCase();
        return b.folio.includes(q) || nombre.includes(q) || b.celular.includes(q);
      })
    : boletos
  ).slice().sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 3;
    const pb = STATUS_PRIORITY[b.status] ?? 3;
    if (pa !== pb) return pa - pb;
    return (b.created_at?.toMillis?.() ?? 0) - (a.created_at?.toMillis?.() ?? 0);
  });

  const rifaOptions = Array.from(rifas.values());

  async function exportCSV() {
    const { boletos: all } = await getBoletosPaginados({
      status: filterStatus !== "todos" ? filterStatus : undefined,
      rifaId: filterRifa || undefined,
      pageSize: 9999,
      loadAll: true,
    });
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const headers = ["Folio", "Rifa", "Nombre", "Apellidos", "Celular", "Estado MX", "Números", "Total (MXN)", "Status", "Fecha"];
    const rows = all.map((b) => [
      b.folio,
      rifas.get(b.rifa_id)?.nombre ?? b.rifa_id,
      b.nombre,
      b.apellidos,
      b.celular,
      b.estado,
      b.numeros.join(" | "),
      String(b.precio_total),
      b.status,
      b.created_at?.toDate?.()?.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) ?? "",
    ].map(escape).join(","));
    const csv = "\uFEFF" + [headers.map(escape).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boletos${filterStatus !== "todos" ? `-${filterStatus}` : ""}${filterRifa ? `-${rifas.get(filterRifa)?.nombre ?? filterRifa}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Boletos</h1>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
          </svg>
          Exportar CSV
        </button>
      </div>

      {canceladosMsg && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 mb-5 text-sm text-amber-800 dark:text-amber-300">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 102 0V6zm-1 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
          </svg>
          {canceladosMsg}
          <button onClick={() => setCanceladosMsg(null)} className="ml-auto text-amber-500 hover:text-amber-700">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar folio, nombre, celular..."
          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm w-60"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="pagado">Pagados</option>
          <option value="cancelado">Cancelados</option>
        </select>
        <select
          value={filterRifa}
          onChange={(e) => setFilterRifa(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
        >
          <option value="">Todas las rifas</option>
          {rifaOptions.map((r) => (
            <option key={r.id} value={r.id}>{r.nombre}</option>
          ))}
        </select>
        <span className="px-3 py-2 text-sm text-slate-500">
          {loading ? "Cargando..." : `${displayed.length} boletos${isSearching ? " encontrados" : ""}`}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Folio</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Rifa</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Cliente</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Números</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Total</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Estado</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Fecha</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : displayed.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-mono font-bold text-red-600 dark:text-red-400">{b.folio}</td>
                  <td className="px-4 py-3">{rifas.get(b.rifa_id)?.nombre ?? b.rifa_id}</td>
                  <td className="px-4 py-3">
                    <p>{b.nombre} {b.apellidos}</p>
                    <p className="text-xs text-slate-400">{b.celular}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{b.numeros.join(", ")}</td>
                  <td className="px-4 py-3 font-semibold">${b.precio_total.toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      b.status === "pagado"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : b.status === "cancelado"
                        ? "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {b.status === "pendiente" && b.created_at
                      ? (() => {
                          const creado = b.created_at.toDate().getTime();
                          const transcurridoMs = now - creado;
                          const restanteMs = limitHoras * 3_600_000 - transcurridoMs;
                          const transcurridoH = transcurridoMs / 3_600_000;
                          const restanteH = restanteMs / 3_600_000;
                          const expirado = cancelacionActiva && restanteMs <= 0;
                          const urgente = cancelacionActiva && !expirado && restanteH < 2;
                          const advertencia = cancelacionActiva && !expirado && !urgente && restanteH < limitHoras * 0.5;
                          const fmtH = (h: number) => {
                            const abs = Math.abs(h);
                            if (abs < 1) return `${Math.round(abs * 60)} min`;
                            return `${abs.toFixed(1)} h`;
                          };
                          return (
                            <div className={`space-y-0.5 font-medium ${
                              expirado ? "text-red-600 dark:text-red-400" :
                              urgente  ? "text-orange-500 dark:text-orange-400" :
                              advertencia ? "text-yellow-600 dark:text-yellow-400" :
                              "text-slate-500 dark:text-slate-400"
                            }`}>
                              <p>hace {fmtH(transcurridoH)}</p>
                              {cancelacionActiva && (
                                <p className="opacity-75">
                                  {expirado ? `expirado hace ${fmtH(-restanteH)}` : `quedan ${fmtH(restanteH)}`}
                                </p>
                              )}
                            </div>
                          );
                        })()
                      : <span className="text-slate-400">{b.created_at?.toDate?.()?.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) ?? "—"}</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {b.status === "pendiente" && (
                        <>
                          <button onClick={() => handleMarkPagado(b)} disabled={marking === b.id}
                            className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors">
                            {marking === b.id ? "..." : "Marcar pagado"}
                          </button>
                          <button onClick={() => {
                            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
                            setReminderText(`👋 Hola ${b.nombre}, te recordamos que tienes el folio ${b.folio} pendiente de pago.\n\nPara no perder tus números, por favor realiza el pago lo antes posible y envía tu comprobante.\n\n💳 Puedes depositar a nuestras cuentas aquí:\n${baseUrl}/tarjetas\n\n🔍 Consulta el estado de tu boleto en:\n${baseUrl}/consulta?f=${b.folio}&act=1`);
                            setReminderBoleto(b);
                          }} disabled={marking === b.id}
                            className="text-xs px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 dark:text-blue-300 font-bold rounded-lg transition-colors">
                            Recordatorio
                          </button>
                        </>
                      )}
                      {b.status === "pagado" && (
                        <button onClick={() => handleRevertir(b)} disabled={marking === b.id}
                          className="text-xs px-2 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 dark:text-amber-300 font-bold rounded-lg transition-colors disabled:opacity-50">
                          {marking === b.id ? "..." : "Revertir"}
                        </button>
                      )}
                      {(b.status === "pendiente" || b.status === "pagado") && (
                        <button onClick={() => handleCancel(b)} disabled={marking === b.id}
                          className="text-xs px-2 py-1.5 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 dark:bg-slate-700 dark:hover:bg-red-900/30 dark:text-slate-300 font-bold rounded-lg transition-colors disabled:opacity-50">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
        {!loading && displayed.length === 0 && (
          <p className="text-center py-8 text-slate-400">Sin boletos.</p>
        )}
      </div>

      {/* Pagination — solo cuando no hay búsqueda activa */}
      {!isSearching && (pageIdx > 0 || hasMore) && (
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

      {/* Modal Recordatorio */}
      {reminderBoleto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={(e) => { if (e.target === e.currentTarget) setReminderBoleto(null); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <p className="font-black text-slate-900 dark:text-slate-100">Enviar Recordatorio</p>
                <p className="text-xs text-slate-400 font-mono">Folio: {reminderBoleto.folio} — {reminderBoleto.celular}</p>
              </div>
              <button onClick={() => setReminderBoleto(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Edita el mensaje antes de enviarlo por WhatsApp:</p>
              <textarea
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                rows={10}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setReminderBoleto(null)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const url = `https://wa.me/52${reminderBoleto.celular.replace(/\D/g,"")}?text=${encodeURIComponent(reminderText)}`;
                    window.open(url, "_blank");
                    setReminderBoleto(null);
                  }}
                  className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                >
                  Enviar WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
