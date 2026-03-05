"use client";

import { useEffect, useState } from "react";
import { getBoletos, markBoletoPagado, getRifas, updateRifa, Boleto, Rifa } from "@/lib/firestore";

export default function AdminBoletosPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [rifas, setRifas] = useState<Map<string, Rifa>>(new Map());
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendiente" | "pagado">("todos");
  const [filterRifa, setFilterRifa] = useState("");
  const [marking, setMarking] = useState<string | null>(null);

  async function load() {
    const [bs, rs] = await Promise.all([getBoletos(), getRifas()]);
    setBoletos(bs);
    setRifas(new Map(rs.map((r) => [r.id!, r])));
  }

  useEffect(() => { load(); }, []);

  async function handleMarkPagado(boleto: Boleto) {
    if (!confirm(`¿Marcar boleto ${boleto.folio} como pagado?`)) return;
    setMarking(boleto.id!);
    await markBoletoPagado(boleto.id!);

    // Move numbers from apartados to vendidos in the rifa
    const rifa = rifas.get(boleto.rifa_id);
    if (rifa) {
      const nuevosApartados = (rifa.numeros_apartados ?? []).filter((n) => !boleto.numeros.includes(n));
      const nuevosVendidos = [...(rifa.numeros_vendidos ?? []), ...boleto.numeros];
      await updateRifa(boleto.rifa_id, {
        numeros_apartados: nuevosApartados,
        numeros_vendidos: nuevosVendidos,
      });
    }

    setMarking(null);
    await load();
  }

  const filtered = boletos.filter((b) => {
    if (filterStatus !== "todos" && b.status !== filterStatus) return false;
    if (filterRifa && b.rifa_id !== filterRifa) return false;
    return true;
  });

  const rifaOptions = Array.from(rifas.values());

  return (
    <div>
      <h1 className="text-2xl font-black mb-6">Boletos</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="pagado">Pagados</option>
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
            {filtered.map((b) => (
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
                <td className="px-4 py-3 text-xs text-slate-400">
                  {b.created_at?.toDate?.()?.toLocaleDateString("es-MX") ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {b.status === "pendiente" && (
                    <button
                      onClick={() => handleMarkPagado(b)}
                      disabled={marking === b.id}
                      className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                    >
                      {marking === b.id ? "..." : "Marcar pagado"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center py-8 text-slate-400">Sin boletos.</p>
        )}
      </div>
    </div>
  );
}
