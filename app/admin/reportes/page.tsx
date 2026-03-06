"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { onSnapshot, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Boleto, Rifa } from "@/lib/firestore";

type ReportType =
  | "resumen"
  | "compradores"
  | "mapa"
  | "ingresos"
  | "clientes"
  | "codigos"
  | "ganador"
  | "privado"
  | "publico";

type SortField = "nombre" | "fecha" | "total" | "numeros";
type SortDir = "asc" | "desc";

const REPORTS: { id: ReportType; label: string; icon: string; needsRifa?: boolean }[] = [
  { id: "resumen",     label: "Resumen ejecutivo",   icon: "📊" },
  { id: "compradores", label: "Compradores",          icon: "👥" },
  { id: "mapa",        label: "Mapa de números",      icon: "🗺️", needsRifa: true },
  { id: "ingresos",    label: "Ingresos",             icon: "💰" },
  { id: "clientes",    label: "Clientes únicos",      icon: "👤" },
  { id: "codigos",     label: "Códigos usados",       icon: "🏷️" },
  { id: "ganador",     label: "Ganador",              icon: "🏆", needsRifa: true },
  { id: "privado",     label: "Reporte privado",      icon: "🔒" },
  { id: "publico",     label: "Reporte público",      icon: "👁️" },
];

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

function StatusBadge({ status }: { status: string }) {
  const cfg =
    status === "pagado"    ? { cls: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",    label: "Pagado" } :
    status === "cancelado" ? { cls: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",    label: "Cancelado" } :
                             { cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300", label: "Pendiente" };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function SortHeader({
  label, field, sortField, sortDir, onSort,
}: {
  label: string; field: SortField; sortField: SortField; sortDir: SortDir; onSort: (f: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <th
      className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className="text-xs opacity-60">{active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
      </span>
    </th>
  );
}

export default function ReportesPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [rifaMap, setRifaMap] = useState<Map<string, Rifa>>(new Map());
  const [selectedRifaId, setSelectedRifaId] = useState("");
  const [activeReport, setActiveReport] = useState<ReportType>("resumen");
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendiente" | "pagado" | "cancelado">("todos");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("fecha");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [hoveredNum, setHoveredNum] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef({ boletos: false, rifas: false });

  useEffect(() => {
    const checkDone = () => {
      if (loadedRef.current.boletos && loadedRef.current.rifas) setLoading(false);
    };
    const unsubBoletos = onSnapshot(collection(db, "boletos"), (snap) => {
      setBoletos(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Boleto));
      loadedRef.current.boletos = true;
      checkDone();
    });
    const unsubRifas = onSnapshot(collection(db, "rifas"), (snap) => {
      const rs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Rifa);
      setRifas(rs);
      setRifaMap(new Map(rs.map((r) => [r.id!, r])));
      loadedRef.current.rifas = true;
      checkDone();
    });
    return () => { unsubBoletos(); unsubRifas(); };
  }, []);

  // Boletos for the selected rifa (or all)
  const rifaBoletos = useMemo(
    () => boletos.filter((b) => !selectedRifaId || b.rifa_id === selectedRifaId),
    [boletos, selectedRifaId],
  );

  // Boletos further filtered by status (for table reports)
  const filtered = useMemo(
    () => rifaBoletos.filter((b) => filterStatus === "todos" || b.status === filterStatus),
    [rifaBoletos, filterStatus],
  );

  const selectedRifa = selectedRifaId ? rifaMap.get(selectedRifaId) : undefined;

  // ── Derived data ────────────────────────────────────────────────────────────

  // Number map: prioritises pagado > pendiente > cancelado
  const numberMapData = useMemo(() => {
    if (!selectedRifa) return null;
    const priority: Record<string, number> = { pagado: 3, pendiente: 2, cancelado: 1 };
    const map = new Map<number, { status: string; boleto: Boleto }>();
    rifaBoletos.forEach((b) => {
      b.numeros.forEach((n) => {
        const existing = map.get(n);
        if (!existing || (priority[b.status] ?? 0) > (priority[existing.status] ?? 0)) {
          map.set(n, { status: b.status, boleto: b });
        }
      });
    });
    return map;
  }, [selectedRifa, rifaBoletos]);

  // Income by day
  const ingresosByDay = useMemo(() => {
    const map = new Map<string, { confirmados: number; potenciales: number }>();
    rifaBoletos.forEach((b) => {
      const date = b.created_at?.toDate?.()?.toLocaleDateString("es-MX") ?? "Sin fecha";
      const cur = map.get(date) ?? { confirmados: 0, potenciales: 0 };
      if (b.status === "pagado") { cur.confirmados += b.precio_total; cur.potenciales += b.precio_total; }
      else if (b.status === "pendiente") { cur.potenciales += b.precio_total; }
      map.set(date, cur);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rifaBoletos]);

  // Unique clients grouped by celular
  const clientesData = useMemo(() => {
    const map = new Map<string, {
      nombre: string; apellidos: string; celular: string; estado: string;
      numeros: number[]; pagado: number; pendiente: number; boletos: number;
    }>();
    rifaBoletos.forEach((b) => {
      const key = b.celular;
      const cur = map.get(key) ?? {
        nombre: b.nombre, apellidos: b.apellidos, celular: b.celular, estado: b.estado,
        numeros: [], pagado: 0, pendiente: 0, boletos: 0,
      };
      cur.numeros.push(...b.numeros);
      cur.boletos++;
      if (b.status === "pagado") cur.pagado += b.precio_total;
      else if (b.status === "pendiente") cur.pendiente += b.precio_total;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.numeros.length - a.numeros.length);
  }, [rifaBoletos]);

  // Discount codes used
  const codigosData = useMemo(() => {
    const map = new Map<string, { codigo: string; usos: number; totalDescuento: number; totalBruto: number }>();
    rifaBoletos.forEach((b) => {
      if (!b.codigo_descuento) return;
      const cur = map.get(b.codigo_descuento) ?? { codigo: b.codigo_descuento, usos: 0, totalDescuento: 0, totalBruto: 0 };
      cur.usos++;
      const pct = b.descuento_aplicado ?? 0;
      const bruto = pct > 0 ? b.precio_total / (1 - pct / 100) : b.precio_total;
      cur.totalDescuento += bruto - b.precio_total;
      cur.totalBruto += bruto;
      map.set(b.codigo_descuento, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.usos - a.usos);
  }, [rifaBoletos]);

  // Compradores with search + sort
  const compradoresData = useMemo(() => {
    let data = filtered.slice();
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((b) =>
        `${b.nombre} ${b.apellidos}`.toLowerCase().includes(q) ||
        b.celular.includes(q) ||
        b.folio.toLowerCase().includes(q),
      );
    }
    data.sort((a, b) => {
      let cmp = 0;
      if (sortField === "nombre") cmp = `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`);
      else if (sortField === "fecha") cmp = (a.created_at?.seconds ?? 0) - (b.created_at?.seconds ?? 0);
      else if (sortField === "total") cmp = a.precio_total - b.precio_total;
      else if (sortField === "numeros") cmp = a.numeros.length - b.numeros.length;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [filtered, search, sortField, sortDir]);

  // Executive summary per rifa
  const summaryStats = useMemo(() => {
    const rifasList = selectedRifaId ? rifas.filter((r) => r.id === selectedRifaId) : rifas;
    return rifasList.map((r) => {
      const rb = boletos.filter((b) => b.rifa_id === r.id);
      const total = r.num_fin - r.num_inicio + 1;
      const pagados = r.num_vendidos ?? 0;
      const apartados = r.num_apartados ?? 0;
      const disponibles = total - pagados - apartados;
      const ingresos = rb.filter((b) => b.status === "pagado").reduce((s, b) => s + b.precio_total, 0);
      const potencial = rb.filter((b) => b.status !== "cancelado").reduce((s, b) => s + b.precio_total, 0);
      const boletosPagados = rb.filter((b) => b.status === "pagado").length;
      const diasSorteo = r.fecha_sorteo
        ? Math.ceil((new Date(r.fecha_sorteo).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      return { rifa: r, total, pagados, apartados, disponibles, ingresos, potencial, boletosPagados, diasSorteo };
    });
  }, [rifas, boletos, selectedRifaId]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }

  // ── CSV Exports ─────────────────────────────────────────────────────────────

  const rifaLabel = selectedRifa?.nombre ?? "todas";

  function exportCompradores() {
    const headers = ["Folio", "Rifa", "Nombre completo", "Celular", "Números", "Cant.", "Total (MXN)", "Estado", "Fecha"];
    downloadCSV(`compradores-${rifaLabel}.csv`, compradoresData.map((b) => [
      b.folio, rifaMap.get(b.rifa_id)?.nombre ?? b.rifa_id, `${b.nombre} ${b.apellidos}`,
      b.celular, b.numeros.join(" | "), String(b.numeros.length), String(b.precio_total),
      b.status === "pagado" ? "Pagado" : b.status === "cancelado" ? "Cancelado" : "Pendiente",
      b.created_at?.toDate?.()?.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) ?? "",
    ]), headers);
  }

  function exportPrivado() {
    const headers = ["Folio", "Rifa", "Nombre", "Apellidos", "Celular", "Estado MX", "Números", "Cód. descuento", "Descuento %", "Total (MXN)", "Status", "Fecha"];
    downloadCSV(`privado-${rifaLabel}.csv`, filtered.map((b) => [
      b.folio, rifaMap.get(b.rifa_id)?.nombre ?? b.rifa_id, b.nombre, b.apellidos, b.celular, b.estado,
      b.numeros.join(" | "), b.codigo_descuento, String(b.descuento_aplicado), String(b.precio_total),
      b.status === "pagado" ? "Pagado" : b.status === "cancelado" ? "Cancelado" : "Pendiente",
      b.created_at?.toDate?.()?.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) ?? "",
    ]), headers);
  }

  function exportPublico() {
    const headers = ["Folio", "Rifa", "Números", "Estado"];
    downloadCSV(`publico-${rifaLabel}.csv`, filtered.map((b) => [
      b.folio, rifaMap.get(b.rifa_id)?.nombre ?? b.rifa_id, b.numeros.join(" | "),
      b.status === "pagado" ? "Pagado" : b.status === "cancelado" ? "Cancelado" : "Pendiente",
    ]), headers);
  }

  function exportClientes() {
    const headers = ["Nombre", "Apellidos", "Celular", "Estado MX", "Números", "Cant.", "Pagado (MXN)", "Pendiente (MXN)", "Boletos"];
    downloadCSV(`clientes-${rifaLabel}.csv`, clientesData.map((c) => [
      c.nombre, c.apellidos, c.celular, c.estado, c.numeros.join(" | "),
      String(c.numeros.length), String(c.pagado), String(c.pendiente), String(c.boletos),
    ]), headers);
  }

  function exportIngresos() {
    const headers = ["Fecha", "Confirmados (MXN)", "Potencial (MXN)"];
    downloadCSV(`ingresos-${rifaLabel}.csv`, ingresosByDay.map(([date, d]) => [date, String(d.confirmados), String(d.potenciales)]), headers);
  }

  function exportCodigos() {
    const headers = ["Código", "Usos", "Total descontado (MXN)", "Venta bruta sin descuento (MXN)"];
    downloadCSV(`codigos-${rifaLabel}.csv`, codigosData.map((c) => [
      c.codigo, String(c.usos), c.totalDescuento.toFixed(2), c.totalBruto.toFixed(2),
    ]), headers);
  }

  const exportFns: Partial<Record<ReportType, () => void>> = {
    compradores: exportCompradores,
    privado: exportPrivado,
    publico: exportPublico,
    clientes: exportClientes,
    ingresos: exportIngresos,
    codigos: exportCodigos,
  };

  const currentReportDef = REPORTS.find((r) => r.id === activeReport)!;
  const needsRifaSelect = currentReportDef.needsRifa && !selectedRifaId;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Reportes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Genera y descarga reportes en CSV listos para Excel
          </p>
        </div>
        {exportFns[activeReport] && (
          <button
            onClick={exportFns[activeReport]}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
            </svg>
            Descargar CSV
          </button>
        )}
      </div>

      {/* Rifa selector pills */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Rifa</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedRifaId("")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              !selectedRifaId
                ? "bg-red-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            }`}
          >
            Todas las rifas
          </button>
          {rifas.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRifaId(r.id!)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                selectedRifaId === r.id
                  ? "bg-red-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              {r.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Selected rifa status header */}
      {selectedRifa && (
        <div className="flex items-center gap-3 mb-5 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
          <div>
            <p className="font-bold text-sm">{selectedRifa.nombre}</p>
            <p className="text-xs text-slate-400">Sorteo: {selectedRifa.fecha_sorteo || "Sin fecha"}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {selectedRifa.ganador && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                🏆 Con ganador
              </span>
            )}
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              selectedRifa.activa
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : "bg-slate-100 text-slate-500 dark:bg-slate-700"
            }`}>
              {selectedRifa.activa ? "Activa" : "Inactiva"}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-5">
        {/* Sidebar: report type nav */}
        <div className="w-48 shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tipo de reporte</p>
          <div className="flex flex-col gap-0.5">
            {REPORTS.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveReport(r.id)}
                className={`text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeReport === r.id
                    ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Report content */}
        <div className="flex-1 min-w-0">
          {needsRifaSelect ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <span className="text-4xl mb-3">👆</span>
              <p className="font-semibold">Selecciona una rifa para ver este reporte</p>
            </div>
          ) : (
            <>
              {/* ── Resumen ejecutivo ── */}
              {activeReport === "resumen" && (
                <div className="space-y-4">
                  {summaryStats.map((s) => (
                    <div key={s.rifa.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h2 className="font-black text-lg">{s.rifa.nombre}</h2>
                          <p className="text-xs text-slate-400 mt-0.5">Números {s.rifa.num_inicio}–{s.rifa.num_fin}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {s.rifa.ganador && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                              🏆 Con ganador
                            </span>
                          )}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            s.rifa.activa
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-700"
                          }`}>
                            {s.rifa.activa ? "Activa" : "Inactiva"}
                          </span>
                          {s.diasSorteo !== null && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              s.diasSorteo < 0
                                ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                : s.diasSorteo <= 7
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            }`}>
                              {s.diasSorteo < 0 ? `Hace ${Math.abs(s.diasSorteo)}d` : s.diasSorteo === 0 ? "Hoy" : `En ${s.diasSorteo}d`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Ocupación ({((s.pagados + s.apartados) / Math.max(s.total, 1) * 100).toFixed(1)}%)</span>
                          <span>{s.pagados + s.apartados} / {s.total} números</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex">
                          <div className="h-full bg-green-500" style={{ width: `${(s.pagados / Math.max(s.total, 1)) * 100}%` }} />
                          <div className="h-full bg-amber-400" style={{ width: `${(s.apartados / Math.max(s.total, 1)) * 100}%` }} />
                        </div>
                        <div className="flex gap-4 mt-1.5 text-xs">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Pagados: {s.pagados}</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Apartados: {s.apartados}</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />Disponibles: {s.disponibles}</span>
                        </div>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                          <p className="text-xs text-green-600 dark:text-green-400 font-semibold">Ingresos confirmados</p>
                          <p className="text-xl font-black text-green-700 dark:text-green-300 mt-1">${s.ingresos.toLocaleString("es-MX")}</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Potencial total</p>
                          <p className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1">${s.potencial.toLocaleString("es-MX")}</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Boletos pagados</p>
                          <p className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1">{s.boletosPagados}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
                          <p className="text-xs text-slate-500 font-semibold">Disponibles</p>
                          <p className="text-xl font-black text-slate-700 dark:text-slate-200 mt-1">{s.disponibles}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {summaryStats.length === 0 && (
                    <p className="text-center py-10 text-slate-400">No hay rifas registradas.</p>
                  )}
                </div>
              )}

              {/* ── Compradores ── */}
              {activeReport === "compradores" && (
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <input
                      type="text"
                      placeholder="Buscar por nombre, celular o folio..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="flex-1 min-w-[200px] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
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
                    <span className="px-3 py-2 text-sm text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg">
                      {compradoresData.length} registros
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Folio</th>
                          {!selectedRifaId && <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Rifa</th>}
                          <SortHeader label="Nombre" field="nombre" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                          <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Celular</th>
                          <SortHeader label="Números" field="numeros" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                          <SortHeader label="Total" field="total" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                          <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Estado</th>
                          <SortHeader label="Fecha" field="fecha" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {compradoresData.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 font-mono font-bold text-red-600 dark:text-red-400 whitespace-nowrap">{b.folio}</td>
                            {!selectedRifaId && <td className="px-4 py-3 font-medium">{rifaMap.get(b.rifa_id)?.nombre ?? "—"}</td>}
                            <td className="px-4 py-3 whitespace-nowrap">{b.nombre} {b.apellidos}</td>
                            <td className="px-4 py-3 text-slate-500">{b.celular}</td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-slate-700 dark:text-slate-300">{b.numeros.length}</span>
                              <span className="text-xs text-slate-400 ml-1 hidden md:inline">
                                ({b.numeros.slice(0, 4).join(", ")}{b.numeros.length > 4 ? "…" : ""})
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold">${b.precio_total.toLocaleString("es-MX")}</td>
                            <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                            <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                              {b.created_at?.toDate?.()?.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {compradoresData.length === 0 && <p className="text-center py-10 text-slate-400">Sin registros.</p>}
                  </div>
                </div>
              )}

              {/* ── Mapa de números ── */}
              {activeReport === "mapa" && selectedRifa && numberMapData && (
                <div>
                  <div className="flex items-center gap-4 mb-3 text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-green-500 inline-block" />Pagado</span>
                    <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-400 inline-block" />Apartado</span>
                    <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-600 inline-block" />Disponible</span>
                    <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-slate-400 inline-block" />Cancelado</span>
                  </div>

                  {/* Hover info panel */}
                  <div className="mb-3 min-h-[60px] p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm flex items-center gap-4">
                    {hoveredNum !== null ? (
                      (() => {
                        const entry = numberMapData.get(hoveredNum);
                        return entry ? (
                          <>
                            <span className="font-black text-2xl text-red-600 dark:text-red-400">#{hoveredNum}</span>
                            <div>
                              <p className="font-bold">{entry.boleto.nombre} {entry.boleto.apellidos}</p>
                              <p className="text-slate-400 text-xs">{entry.boleto.folio} · {entry.boleto.celular}</p>
                            </div>
                            <StatusBadge status={entry.boleto.status} />
                          </>
                        ) : (
                          <>
                            <span className="font-black text-2xl text-slate-400">#{hoveredNum}</span>
                            <span className="text-slate-400">Disponible</span>
                          </>
                        );
                      })()
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600 text-xs">Pasa el cursor sobre un número para ver detalles</span>
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: selectedRifa.num_fin - selectedRifa.num_inicio + 1 }, (_, i) => {
                        const num = selectedRifa.num_inicio + i;
                        const entry = numberMapData.get(num);
                        const colorClass = !entry
                          ? "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                          : entry.status === "pagado"    ? "bg-green-500 text-white hover:bg-green-600"
                          : entry.status === "pendiente" ? "bg-amber-400 text-white hover:bg-amber-500"
                          :                               "bg-slate-400 text-white hover:bg-slate-500";
                        return (
                          <button
                            key={num}
                            onMouseEnter={() => setHoveredNum(num)}
                            onMouseLeave={() => setHoveredNum(null)}
                            className={`w-10 h-8 rounded text-xs font-bold transition-all hover:scale-110 ${colorClass}`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Ingresos ── */}
              {activeReport === "ingresos" && (
                <div>
                  {/* Summary cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                    {(() => {
                      const confirmados = rifaBoletos.filter((b) => b.status === "pagado").reduce((s, b) => s + b.precio_total, 0);
                      const potencial = rifaBoletos.filter((b) => b.status !== "cancelado").reduce((s, b) => s + b.precio_total, 0);
                      const totalDescuento = codigosData.reduce((s, c) => s + c.totalDescuento, 0);
                      return (
                        <>
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                            <p className="text-xs text-green-600 dark:text-green-400 font-semibold">Ingresos confirmados</p>
                            <p className="text-2xl font-black text-green-700 dark:text-green-300 mt-1">${confirmados.toLocaleString("es-MX")}</p>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Potencial (con pendientes)</p>
                            <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">${potencial.toLocaleString("es-MX")}</p>
                          </div>
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
                            <p className="text-xs text-red-600 dark:text-red-400 font-semibold">Total descontado por códigos</p>
                            <p className="text-2xl font-black text-red-700 dark:text-red-300 mt-1">${Number(totalDescuento.toFixed(2)).toLocaleString("es-MX")}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* By day table */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-x-auto">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                      <h3 className="font-bold text-sm">Desglose por día</h3>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          {["Fecha", "Confirmados (MXN)", "Potencial (MXN)"].map((h) => (
                            <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {ingresosByDay.map(([date, d]) => (
                          <tr key={date} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 font-medium">{date}</td>
                            <td className="px-4 py-3 font-bold text-green-600 dark:text-green-400">${d.confirmados.toLocaleString("es-MX")}</td>
                            <td className="px-4 py-3 text-amber-600 dark:text-amber-400">${d.potenciales.toLocaleString("es-MX")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ingresosByDay.length === 0 && <p className="text-center py-10 text-slate-400">Sin datos de ingresos.</p>}
                  </div>
                </div>
              )}

              {/* ── Clientes únicos ── */}
              {activeReport === "clientes" && (
                <div>
                  <div className="mb-4">
                    <span className="text-sm text-slate-500">{clientesData.length} clientes únicos</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          {["Nombre", "Celular", "Estado MX", "Números", "Pagado", "Pendiente"].map((h) => (
                            <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {clientesData.map((c, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 font-medium">{c.nombre} {c.apellidos}</td>
                            <td className="px-4 py-3 text-slate-500">{c.celular}</td>
                            <td className="px-4 py-3 text-slate-500">{c.estado}</td>
                            <td className="px-4 py-3">
                              <span className="font-bold">{c.numeros.length}</span>
                              <span className="text-xs text-slate-400 ml-1">({c.boletos} folio{c.boletos !== 1 ? "s" : ""})</span>
                            </td>
                            <td className="px-4 py-3 font-bold text-green-600 dark:text-green-400">
                              {c.pagado > 0 ? `$${c.pagado.toLocaleString("es-MX")}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-amber-600 dark:text-amber-400">
                              {c.pendiente > 0 ? `$${c.pendiente.toLocaleString("es-MX")}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {clientesData.length === 0 && <p className="text-center py-10 text-slate-400">Sin clientes.</p>}
                  </div>
                </div>
              )}

              {/* ── Códigos de descuento ── */}
              {activeReport === "codigos" && (
                <div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          {["Código", "Usos", "Total descontado", "Venta bruta sin descuento"].map((h) => (
                            <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {codigosData.map((c) => (
                          <tr key={c.codigo} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 font-mono font-bold text-red-600 dark:text-red-400">{c.codigo}</td>
                            <td className="px-4 py-3 font-bold">{c.usos}</td>
                            <td className="px-4 py-3 font-bold text-red-600 dark:text-red-400">-${c.totalDescuento.toFixed(2)}</td>
                            <td className="px-4 py-3 text-slate-500">${c.totalBruto.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {codigosData.length === 0 && (
                      <p className="text-center py-10 text-slate-400">No se han usado códigos de descuento.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Ganador ── */}
              {activeReport === "ganador" && selectedRifa && (
                <div>
                  {selectedRifa.ganador ? (
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-800 p-8 text-center">
                      <p className="text-5xl mb-4">🏆</p>
                      <h2 className="text-2xl font-black mb-1">{selectedRifa.ganador.nombre} {selectedRifa.ganador.apellidos}</h2>
                      <p className="text-slate-500 text-sm mb-6">
                        Folio:{" "}
                        <span className="font-mono font-bold text-red-600 dark:text-red-400">{selectedRifa.ganador.folio}</span>
                      </p>
                      <div className="inline-block bg-white dark:bg-slate-800 rounded-2xl px-8 py-4 shadow-lg">
                        <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Número ganador</p>
                        <p className="text-6xl font-black text-red-600 dark:text-red-400">#{selectedRifa.ganador.numero}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-5">
                        Anunciado el{" "}
                        {selectedRifa.ganador.anunciado_at
                          ? new Date(selectedRifa.ganador.anunciado_at).toLocaleDateString("es-MX", { dateStyle: "long" })
                          : "—"}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <span className="text-5xl mb-3">🎲</span>
                      <p className="font-bold text-lg">Sin ganador registrado</p>
                      <p className="text-sm mt-1">El ganador se registra desde la sección de gestión de rifas.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Reporte privado ── */}
              {activeReport === "privado" && (
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
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
                    <span className="px-3 py-2 text-sm text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg">
                      {filtered.length} registros
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Folio</th>
                          {!selectedRifaId && <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Rifa</th>}
                          {["Nombre", "Apellidos", "Celular", "Estado MX", "Números", "Cód. descuento", "Dto %", "Total", "Status", "Fecha"].map((h) => (
                            <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filtered.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 font-mono font-bold text-red-600 dark:text-red-400">{b.folio}</td>
                            {!selectedRifaId && <td className="px-4 py-3">{rifaMap.get(b.rifa_id)?.nombre ?? "—"}</td>}
                            <td className="px-4 py-3">{b.nombre}</td>
                            <td className="px-4 py-3">{b.apellidos}</td>
                            <td className="px-4 py-3 text-slate-500">{b.celular}</td>
                            <td className="px-4 py-3 text-slate-500">{b.estado}</td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-[160px] truncate">{b.numeros.join(", ")}</td>
                            <td className="px-4 py-3 font-mono text-xs">{b.codigo_descuento || "—"}</td>
                            <td className="px-4 py-3 text-center">{b.descuento_aplicado ? `${b.descuento_aplicado}%` : "—"}</td>
                            <td className="px-4 py-3 font-semibold">${b.precio_total.toLocaleString("es-MX")}</td>
                            <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                            <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                              {b.created_at?.toDate?.()?.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filtered.length === 0 && <p className="text-center py-10 text-slate-400">Sin registros.</p>}
                  </div>
                </div>
              )}

              {/* ── Reporte público ── */}
              {activeReport === "publico" && (
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
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
                    <span className="px-3 py-2 text-sm text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg">
                      {filtered.length} registros
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 overflow-x-auto">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Folio</th>
                          {!selectedRifaId && <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Rifa</th>}
                          <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Números seleccionados</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filtered.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 font-mono font-bold text-red-600 dark:text-red-400">{b.folio}</td>
                            {!selectedRifaId && <td className="px-4 py-3 font-medium">{rifaMap.get(b.rifa_id)?.nombre ?? "—"}</td>}
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{b.numeros.join(", ")}</td>
                            <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filtered.length === 0 && <p className="text-center py-10 text-slate-400">Sin registros.</p>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
