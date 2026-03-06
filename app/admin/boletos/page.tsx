"use client";

import { useEffect, useState } from "react";
import { getBoletos, markBoletoPagadoConNumeros, getRifas, cancelApartado, cancelPagado, cancelarBoletosExpirados, revertPagadoToApartado, getAppSettings, Boleto, Rifa } from "@/lib/firestore";

const PAGE_SIZE = 20;

export default function AdminBoletosPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [rifas, setRifas] = useState<Map<string, Rifa>>(new Map());
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendiente" | "pagado" | "cancelado">("todos");
  const [filterRifa, setFilterRifa] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [marking, setMarking] = useState<string | null>(null);
  const [canceladosMsg, setCanceladosMsg] = useState<string | null>(null);
  const [limitHoras, setLimitHoras] = useState(24);
  const [cancelacionActiva, setCancelacionActiva] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  async function load() {
    const [bs, rs] = await Promise.all([getBoletos(), getRifas()]);
    setBoletos(bs);
    setRifas(new Map(rs.map((r) => [r.id!, r])));
  }

  useEffect(() => {
    getAppSettings().then(async (s) => {
      setLimitHoras(s.cancelacion_horas);
      setCancelacionActiva(s.cancelacion_activa);
      if (s.cancelacion_activa) {
        const cancelados = await cancelarBoletosExpirados(s.cancelacion_horas);
        if (cancelados > 0) {
          setCanceladosMsg(`${cancelados} boleto${cancelados > 1 ? "s" : ""} expirado${cancelados > 1 ? "s" : ""} cancelado${cancelados > 1 ? "s" : ""} automáticamente.`);
        }
      }
    }).finally(() => load());
  }, []);

  // Actualizar "ahora" cada minuto para que los tiempos sean en vivo
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [filterStatus, filterRifa, search]);

  async function handleMarkPagado(boleto: Boleto) {
    if (!confirm(`¿Marcar boleto ${boleto.folio} como pagado?`)) return;
    setMarking(boleto.id!);
    await markBoletoPagadoConNumeros({ id: boleto.id!, rifa_id: boleto.rifa_id, numeros: boleto.numeros });
    setMarking(null);
    await load();
  }

  async function handleCancel(boleto: Boleto) {
    if (!confirm(`¿Cancelar boleto ${boleto.folio}?`)) return;
    setMarking(boleto.id!);
    if (boleto.status === "pendiente") {
      await cancelApartado({ id: boleto.id!, rifa_id: boleto.rifa_id, numeros: boleto.numeros });
    } else if (boleto.status === "pagado") {
      await cancelPagado({ id: boleto.id!, rifa_id: boleto.rifa_id, numeros: boleto.numeros });
    }
    setMarking(null);
    await load();
  }

  async function handleRevertir(boleto: Boleto) {
    if (!confirm(`¿Revertir boleto ${boleto.folio} a "pendiente"? Los números volverán a estado apartado.`)) return;
    setMarking(boleto.id!);
    await revertPagadoToApartado({ id: boleto.id!, rifa_id: boleto.rifa_id, numeros: boleto.numeros });
    setMarking(null);
    await load();
  }

  const q = search.trim().toUpperCase();
  const filtered = boletos.filter((b) => {
    if (filterStatus !== "todos" && b.status !== filterStatus) return false;
    if (filterRifa && b.rifa_id !== filterRifa) return false;
    if (q) {
      const nombre = `${b.nombre} ${b.apellidos}`.toUpperCase();
      if (!b.folio.includes(q) && !nombre.includes(q) && !b.celular.includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rifaOptions = Array.from(rifas.values());

  return (
    <div>
      <h1 className="text-2xl font-black mb-6">Boletos</h1>

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
        <span className="px-3 py-2 text-sm text-slate-500">{filtered.length} boletos</span>
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
            {paginated.map((b) => (
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
                    : <span className="text-slate-400">{b.created_at?.toDate?.()?.toLocaleDateString("es-MX") ?? "—"}</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {b.status === "pendiente" && (
                      <button
                        onClick={() => handleMarkPagado(b)}
                        disabled={marking === b.id}
                        className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                      >
                        {marking === b.id ? "..." : "Marcar pagado"}
                      </button>
                    )}
                    {b.status === "pagado" && (
                      <button
                        onClick={() => handleRevertir(b)}
                        disabled={marking === b.id}
                        className="text-xs px-2 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 dark:text-amber-300 font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {marking === b.id ? "..." : "Revertir"}
                      </button>
                    )}
                    {(b.status === "pendiente" || b.status === "pagado") && (
                      <button
                        onClick={() => handleCancel(b)}
                        disabled={marking === b.id}
                        className="text-xs px-2 py-1.5 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 dark:bg-slate-700 dark:hover:bg-red-900/30 dark:text-slate-300 font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center py-8 text-slate-400">Sin boletos.</p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Página {page} de {totalPages} · {filtered.length} resultados
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
