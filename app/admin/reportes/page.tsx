"use client";

import { useEffect, useState, useMemo } from "react";
import { getBoletos, getRifas, Boleto, Rifa } from "@/lib/firestore";

type ReportType = "folios" | "privado" | "publico" | "cantidades";

function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportesPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [rifaMap, setRifaMap] = useState<Map<string, Rifa>>(new Map());
  const [activeTab, setActiveTab] = useState<ReportType>("folios");
  const [filterRifa, setFilterRifa] = useState("");
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendiente" | "pagado">("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getBoletos(), getRifas()]).then(([bs, rs]) => {
      setBoletos(bs);
      setRifas(rs);
      setRifaMap(new Map(rs.map((r) => [r.id!, r])));
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return boletos.filter((b) => {
      if (filterRifa && b.rifa_id !== filterRifa) return false;
      if (filterStatus !== "todos" && b.status !== filterStatus) return false;
      return true;
    });
  }, [boletos, filterRifa, filterStatus]);

  const tabs: { id: ReportType; label: string; desc: string }[] = [
    { id: "folios", label: "Por folios", desc: "Listado ordenado por folio con datos principales" },
    { id: "privado", label: "Reporte privado", desc: "Datos completos incluyendo información personal" },
    { id: "publico", label: "Reporte público", desc: "Solo folio, números y estado — sin datos personales" },
    { id: "cantidades", label: "Por cantidades", desc: "Resumen de números y revenue por rifa" },
  ];

  // ── CSV exports ────────────────────────────────────────────────────────────

  function exportFolios() {
    const headers = ["Folio", "Rifa", "Nombre completo", "Celular", "Números", "Total (MXN)", "Estado", "Fecha"];
    const rows = filtered
      .slice()
      .sort((a, b) => a.folio.localeCompare(b.folio))
      .map((b) => [
        b.folio,
        rifaMap.get(b.rifa_id)?.nombre ?? b.rifa_id,
        `${b.nombre} ${b.apellidos}`,
        b.celular,
        b.numeros.join(" | "),
        String(b.precio_total),
        b.status === "pagado" ? "Pagado" : "Pendiente",
        b.created_at?.toDate?.()?.toLocaleDateString("es-MX") ?? "",
      ]);
    downloadCSV("reporte-folios.csv", rows, headers);
  }

  function exportPrivado() {
    const headers = ["Folio", "Rifa", "Nombre", "Apellidos", "Celular", "Estado MX", "Números", "Código descuento", "Descuento %", "Total (MXN)", "Status", "Fecha"];
    const rows = filtered.map((b) => [
      b.folio,
      rifaMap.get(b.rifa_id)?.nombre ?? b.rifa_id,
      b.nombre,
      b.apellidos,
      b.celular,
      b.estado,
      b.numeros.join(" | "),
      b.codigo_descuento,
      String(b.descuento_aplicado),
      String(b.precio_total),
      b.status === "pagado" ? "Pagado" : "Pendiente",
      b.created_at?.toDate?.()?.toLocaleDateString("es-MX") ?? "",
    ]);
    downloadCSV("reporte-privado.csv", rows, headers);
  }

  function exportPublico() {
    const headers = ["Folio", "Rifa", "Números", "Estado"];
    const rows = filtered.map((b) => [
      b.folio,
      rifaMap.get(b.rifa_id)?.nombre ?? b.rifa_id,
      b.numeros.join(" | "),
      b.status === "pagado" ? "Pagado" : "Pendiente",
    ]);
    downloadCSV("reporte-publico.csv", rows, headers);
  }

  function exportCantidades() {
    const headers = ["Rifa", "Total números", "Pagados", "Apartados", "Disponibles", "Ingresos (MXN)"];
    const rows = rifas.map((r) => {
      const total = r.num_fin - r.num_inicio + 1;
      const pagados = r.numeros_vendidos?.length ?? 0;
      const apartados = r.numeros_apartados?.length ?? 0;
      const disponibles = total - pagados - apartados;
      const ingresos = boletos
        .filter((b) => b.rifa_id === r.id && b.status === "pagado")
        .reduce((s, b) => s + b.precio_total, 0);
      return [r.nombre, String(total), String(pagados), String(apartados), String(disponibles), String(ingresos)];
    });
    downloadCSV("reporte-cantidades.csv", rows, headers);
  }

  const exportFns: Record<ReportType, () => void> = {
    folios: exportFolios,
    privado: exportPrivado,
    publico: exportPublico,
    cantidades: exportCantidades,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Reportes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Genera y descarga reportes en CSV listos para Excel
          </p>
        </div>
        <button
          onClick={exportFns[activeTab]}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
          </svg>
          Descargar CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              activeTab === t.id
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-red-300 dark:hover:border-red-700"
            }`}
          >
            <p className={`font-bold text-sm ${activeTab === t.id ? "text-red-700 dark:text-red-400" : ""}`}>
              {t.label}
            </p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Filters (hidden for cantidades) */}
      {activeTab !== "cantidades" && (
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filterRifa}
            onChange={(e) => setFilterRifa(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="">Todas las rifas</option>
            {rifas.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="pagado">Pagados</option>
          </select>
          <span className="px-3 py-2 text-sm text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg">
            {filtered.length} registros
          </span>
        </div>
      )}

      {/* Tables */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 overflow-x-auto">

        {/* ── Reporte por folios ── */}
        {activeTab === "folios" && (
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                {["Folio", "Rifa", "Nombre completo", "Celular", "Números", "Total", "Estado", "Fecha"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered
                .slice()
                .sort((a, b) => a.folio.localeCompare(b.folio))
                .map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-mono font-bold text-red-600 dark:text-red-400">{b.folio}</td>
                    <td className="px-4 py-3 font-medium">{rifaMap.get(b.rifa_id)?.nombre ?? "—"}</td>
                    <td className="px-4 py-3">{b.nombre} {b.apellidos}</td>
                    <td className="px-4 py-3 text-slate-500">{b.celular}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                      {b.numeros.join(", ")}
                    </td>
                    <td className="px-4 py-3 font-semibold">${b.precio_total.toLocaleString("es-MX")}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {b.created_at?.toDate?.()?.toLocaleDateString("es-MX") ?? "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {/* ── Reporte privado ── */}
        {activeTab === "privado" && (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                {["Folio", "Rifa", "Nombre", "Apellidos", "Celular", "Estado MX", "Números", "Cód. descuento", "Dto %", "Total", "Status", "Fecha"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-mono font-bold text-red-600 dark:text-red-400">{b.folio}</td>
                  <td className="px-4 py-3">{rifaMap.get(b.rifa_id)?.nombre ?? "—"}</td>
                  <td className="px-4 py-3">{b.nombre}</td>
                  <td className="px-4 py-3">{b.apellidos}</td>
                  <td className="px-4 py-3 text-slate-500">{b.celular}</td>
                  <td className="px-4 py-3 text-slate-500">{b.estado}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-[160px] truncate">
                    {b.numeros.join(", ")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{b.codigo_descuento || "—"}</td>
                  <td className="px-4 py-3 text-center">{b.descuento_aplicado ? `${b.descuento_aplicado}%` : "—"}</td>
                  <td className="px-4 py-3 font-semibold">${b.precio_total.toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {b.created_at?.toDate?.()?.toLocaleDateString("es-MX") ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Reporte público ── */}
        {activeTab === "publico" && (
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                {["Folio", "Rifa", "Números seleccionados", "Estado"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-mono font-bold text-red-600 dark:text-red-400">{b.folio}</td>
                  <td className="px-4 py-3 font-medium">{rifaMap.get(b.rifa_id)?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                    {b.numeros.join(", ")}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Reporte por cantidades ── */}
        {activeTab === "cantidades" && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                {["Rifa", "Estado", "Total números", "Pagados", "Apartados", "Disponibles", "Ingresos"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rifas.map((r) => {
                const total = r.num_fin - r.num_inicio + 1;
                const pagados = r.numeros_vendidos?.length ?? 0;
                const apartados = r.numeros_apartados?.length ?? 0;
                const disponibles = total - pagados - apartados;
                const pctPagados = total > 0 ? (pagados / total) * 100 : 0;
                const pctApartados = total > 0 ? (apartados / total) * 100 : 0;
                const pctDisponibles = total > 0 ? (disponibles / total) * 100 : 0;
                const ingresos = boletos
                  .filter((b) => b.rifa_id === r.id && b.status === "pagado")
                  .reduce((s, b) => s + b.precio_total, 0);

                return (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 align-top">
                    <td className="px-4 py-4">
                      <p className="font-bold">{r.nombre}</p>
                      <p className="text-xs text-slate-400">{r.num_inicio}–{r.num_fin}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        r.activa
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-700"
                      }`}>
                        {r.activa ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold">{total}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pctPagados}%` }} />
                        </div>
                        <span className="font-bold text-green-700 dark:text-green-400">{pagados}</span>
                        <span className="text-xs text-slate-400">({pctPagados.toFixed(1)}%)</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pctApartados}%` }} />
                        </div>
                        <span className="font-bold text-amber-700 dark:text-amber-400">{apartados}</span>
                        <span className="text-xs text-slate-400">({pctApartados.toFixed(1)}%)</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full bg-slate-400 rounded-full" style={{ width: `${pctDisponibles}%` }} />
                        </div>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{disponibles}</span>
                        <span className="text-xs text-slate-400">({pctDisponibles.toFixed(1)}%)</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-black text-red-600 dark:text-red-400">
                      ${ingresos.toLocaleString("es-MX")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {activeTab !== "cantidades" && filtered.length === 0 && (
          <p className="text-center py-10 text-slate-400">Sin registros con los filtros actuales.</p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg =
    status === "pagado"    ? { cls: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", label: "Pagado" } :
    status === "cancelado" ? { cls: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400", label: "Cancelado" } :
                             { cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300", label: "Pendiente" };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
