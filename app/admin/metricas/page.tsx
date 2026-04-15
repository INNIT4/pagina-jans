"use client";

import { useEffect, useState, useMemo } from "react";
import { onSnapshot, collection, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Boleto, Rifa, DiscountCode } from "@/lib/firestore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number, total: number) {
  return total > 0 ? ((n / total) * 100).toFixed(1) : "0.0";
}

function currency(n: number) {
  return `$${n.toLocaleString("es-MX")}`;
}

function barW(n: number, max: number) {
  return max > 0 ? `${Math.round((n / max) * 100)}%` : "0%";
}

function trendPct(curr: number, prev: number): { pct: number; up: boolean } | null {
  if (prev === 0) return null;
  const p = ((curr - prev) / prev) * 100;
  return { pct: Math.abs(p), up: p >= 0 };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color, trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  trend?: { pct: number; up: boolean } | null;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-5">
      <div className={`w-8 h-1 rounded-full ${color} mb-3`} />
      <p className="text-2xl font-black mb-0.5">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
      {trend ? (
        <p className={`text-xs font-semibold mt-1 ${trend.up ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {trend.up ? "↑" : "↓"} {trend.pct.toFixed(1)}% vs período anterior
        </p>
      ) : sub ? (
        <p className="text-xs text-slate-400 mt-1">{sub}</p>
      ) : null}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-4">{children}</h2>;
}

function HBar({ label, value, max, formatted, color = "bg-red-500" }: {
  label: string; value: number; max: number; formatted: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <p className="w-32 text-xs text-slate-600 dark:text-slate-400 truncate flex-shrink-0">{label}</p>
      <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: barW(value, max) }} />
      </div>
      <p className="w-20 text-xs font-bold text-right flex-shrink-0">{formatted}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg =
    status === "pagado"    ? { cls: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",    label: "Pagado" } :
    status === "cancelado" ? { cls: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",    label: "Cancelado" } :
                             { cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300", label: "Pendiente" };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MetricasPage() {
  const [boletos, setBoletos]         = useState<Boleto[]>([]);
  const [rifas, setRifas]             = useState<Rifa[]>([]);
  const [codes, setCodes]             = useState<DiscountCode[]>([]);
  const [loading, setLoading]         = useState(true);
  const [period, setPeriod]           = useState<0 | 7 | 14 | 30>(14);
  const [selectedRifaId, setSelectedRifaId] = useState<string | null>(null);

  // ── Real-time subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    let loadedB = false, loadedR = false, loadedC = false;
    const check = () => { if (loadedB && loadedR && loadedC) setLoading(false); };

    // Solo boletos de los últimos 90 días — cubre todos los períodos del selector (7/14/30 días)
    const cutoff = Timestamp.fromDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const boletosQuery = query(
      collection(db, "boletos"),
      where("created_at", ">=", cutoff),
      orderBy("created_at", "desc")
    );

    const unsubB = onSnapshot(boletosQuery, (snap) => {
      setBoletos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Boleto)));
      loadedB = true; check();
    });
    const unsubR = onSnapshot(collection(db, "rifas"), (snap) => {
      setRifas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rifa)));
      loadedR = true; check();
    });
    const unsubC = onSnapshot(collection(db, "discount_codes"), (snap) => {
      setCodes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DiscountCode)));
      loadedC = true; check();
    });

    return () => { unsubB(); unsubR(); unsubC(); };
  }, []);

  // ── Rifa seleccionada ───────────────────────────────────────────────────────
  const selectedRifa = useMemo(() =>
    selectedRifaId ? (rifas.find((r) => r.id === selectedRifaId) ?? null) : null,
  [selectedRifaId, rifas]);

  const isGlobal = selectedRifaId === null;

  // ── Boletos activos (filtrados por rifa si se seleccionó una) ───────────────
  const activeBoletos = useMemo(() =>
    selectedRifaId ? boletos.filter((b) => b.rifa_id === selectedRifaId) : boletos,
  [boletos, selectedRifaId]);

  // ── Period boundaries ───────────────────────────────────────────────────────
  const periodStart = useMemo(() => {
    if (period === 0) return null;
    return new Date(Date.now() - period * 24 * 60 * 60 * 1000);
  }, [period]);

  const prevPeriodStart = useMemo(() => {
    if (period === 0) return null;
    return new Date(Date.now() - period * 2 * 24 * 60 * 60 * 1000);
  }, [period]);

  // ── Boletos filtrados por período (sobre activeBoletos) ─────────────────────
  const boletosPeriod = useMemo(() => {
    if (!periodStart) return activeBoletos;
    return activeBoletos.filter((b) => { const d = b.created_at?.toDate?.(); return d && d >= periodStart; });
  }, [activeBoletos, periodStart]);

  const boletosPrev = useMemo(() => {
    if (!periodStart || !prevPeriodStart) return [];
    return activeBoletos.filter((b) => {
      const d = b.created_at?.toDate?.();
      return d && d >= prevPeriodStart && d < periodStart;
    });
  }, [activeBoletos, periodStart, prevPeriodStart]);

  // ── Sets base ───────────────────────────────────────────────────────────────
  const pagadosAll    = useMemo(() => activeBoletos.filter((b) => b.status === "pagado"),    [activeBoletos]);
  const pendientesAll = useMemo(() => activeBoletos.filter((b) => b.status === "pendiente"), [activeBoletos]);
  const canceladosAll = useMemo(() => activeBoletos.filter((b) => b.status === "cancelado"), [activeBoletos]);
  const regalosAll    = useMemo(() => pagadosAll.filter((b) => b.codigo_descuento === "REGALO"), [pagadosAll]);

  // Alertas siempre globales
  const pendientesGlobal = useMemo(() => boletos.filter((b) => b.status === "pendiente"), [boletos]);

  // ── Period sets ─────────────────────────────────────────────────────────────
  const pagadosPeriod = useMemo(() => boletosPeriod.filter((b) => b.status === "pagado"), [boletosPeriod]);
  const pagadosPrev   = useMemo(() => boletosPrev.filter((b) => b.status === "pagado"),   [boletosPrev]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const ingresoTotal      = useMemo(() => pagadosAll.reduce((s, b) => s + b.precio_total, 0), [pagadosAll]);
  const ingresoPendiente  = useMemo(() => pendientesAll.reduce((s, b) => s + b.precio_total, 0), [pendientesAll]);
  const descuentoTotal    = useMemo(() =>
    pagadosAll.reduce((s, b) => s + (b.precio_total / (1 - b.descuento_aplicado / 100) - b.precio_total || 0), 0)
  , [pagadosAll]);
  const ticketPromedio    = pagadosAll.length > 0 ? ingresoTotal / pagadosAll.length : 0;
  const clientesUnicosAll = useMemo(() =>
    new Set(activeBoletos.filter((b) => b.celular).map((b) => b.celular)).size, [activeBoletos]);
  const conversionAll     = activeBoletos.length > 0 ? (pagadosAll.length / activeBoletos.length) * 100 : 0;

  const totalNumerosVendidosPagados = useMemo(() =>
    pagadosAll.reduce((s, b) => s + b.numeros.length, 0), [pagadosAll]);
  const precioPorNumero   = totalNumerosVendidosPagados > 0 ? ingresoTotal / totalNumerosVendidosPagados : 0;
  const numPromedioCompra = pagadosAll.length > 0 ? totalNumerosVendidosPagados / pagadosAll.length : 0;

  // ── Calidad de revenue ──────────────────────────────────────────────────────
  const pagadosConDesc   = useMemo(() =>
    pagadosAll.filter((b) => b.codigo_descuento && b.codigo_descuento !== "" && b.codigo_descuento !== "REGALO"),
  [pagadosAll]);
  const pagadosSinDesc   = useMemo(() =>
    pagadosAll.filter((b) => !b.codigo_descuento || b.codigo_descuento === ""),
  [pagadosAll]);
  const boletosConCodigo = useMemo(() =>
    activeBoletos.filter((b) => b.codigo_descuento && b.codigo_descuento !== "" && b.codigo_descuento !== "REGALO"),
  [activeBoletos]);
  const boletosSinCodigo = useMemo(() =>
    activeBoletos.filter((b) => !b.codigo_descuento || b.codigo_descuento === ""),
  [activeBoletos]);
  const conversionConDesc  = boletosConCodigo.length > 0 ? (pagadosConDesc.length / boletosConCodigo.length) * 100 : 0;
  const conversionSinDesc  = boletosSinCodigo.length > 0 ? (pagadosSinDesc.length / boletosSinCodigo.length) * 100 : 0;
  const revenuePerdido     = useMemo(() => canceladosAll.reduce((s, b) => s + b.precio_total, 0), [canceladosAll]);

  // ── Pareto ─────────────────────────────────────────────────────────────────
  const paretoDatos = useMemo(() => {
    if (ingresoTotal === 0) return { top20pct: 0, top5pct: 0, top20count: 0 };
    const map = new Map<string, number>();
    pagadosAll.forEach((b) => map.set(b.celular || b.nombre, (map.get(b.celular || b.nombre) ?? 0) + b.precio_total));
    const sorted = Array.from(map.values()).sort((a, b) => b - a);
    const top20count  = Math.max(1, Math.ceil(sorted.length * 0.2));
    const top20revenue = sorted.slice(0, top20count).reduce((s, v) => s + v, 0);
    const top5revenue  = sorted.slice(0, Math.min(5, sorted.length)).reduce((s, v) => s + v, 0);
    return { top20pct: (top20revenue / ingresoTotal) * 100, top5pct: (top5revenue / ingresoTotal) * 100, top20count };
  }, [pagadosAll, ingresoTotal]);

  // ── Period KPIs (tendencias) ─────────────────────────────────────────────────
  const ingresoCurr     = useMemo(() => pagadosPeriod.reduce((s, b) => s + b.precio_total, 0), [pagadosPeriod]);
  const ingresoPrevVal  = useMemo(() => pagadosPrev.reduce((s, b) => s + b.precio_total, 0),   [pagadosPrev]);
  const clientesCurr    = useMemo(() =>
    new Set(pagadosPeriod.filter((b) => b.celular).map((b) => b.celular)).size, [pagadosPeriod]);
  const clientesPrevVal = useMemo(() =>
    new Set(pagadosPrev.filter((b) => b.celular).map((b) => b.celular)).size, [pagadosPrev]);
  const conversionCurr    = boletosPeriod.length > 0 ? (pagadosPeriod.length / boletosPeriod.length) * 100 : 0;
  const conversionPrevVal = boletosPrev.length > 0   ? (pagadosPrev.length   / boletosPrev.length)   * 100 : 0;

  const trendIngresos   = period > 0 ? trendPct(ingresoCurr,          ingresoPrevVal)     : null;
  const trendPagados    = period > 0 ? trendPct(pagadosPeriod.length,  pagadosPrev.length) : null;
  const trendClientes   = period > 0 ? trendPct(clientesCurr,          clientesPrevVal)    : null;
  const trendConversion = period > 0 ? trendPct(conversionCurr,        conversionPrevVal)  : null;

  // ── Alertas (siempre globales) ───────────────────────────────────────────────
  const riesgoVencer = useMemo(() => {
    const threshold = new Date(Date.now() - 20 * 60 * 60 * 1000);
    return pendientesGlobal.filter((b) => { const d = b.created_at?.toDate?.(); return d && d < threshold; });
  }, [pendientesGlobal]);
  const riesgoVencerValor = useMemo(() => riesgoVencer.reduce((s, b) => s + b.precio_total, 0), [riesgoVencer]);

  const rifasOcupacionBaja = useMemo(() =>
    rifas.filter((r) => {
      if (!r.activa || !r.fecha_sorteo) return false;
      const total = r.num_fin - r.num_inicio + 1;
      const ocup  = total > 0 ? ((r.num_vendidos ?? 0) + (r.num_apartados ?? 0)) / total : 0;
      if (ocup >= 0.15) return false;
      const dias = (new Date(r.fecha_sorteo).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return dias >= 0 && dias < 14;
    })
  , [rifas]);

  const codesEnRiesgo   = useMemo(() => codes.filter((c) => c.activo && c.max_usos > 0 && c.usos >= c.max_usos - 1), [codes]);
  const rifasSinGanador = useMemo(() => rifas.filter((r) => !r.activa && !r.ganador), [rifas]);
  const hasAlerts       = riesgoVencer.length > 0 || rifasOcupacionBaja.length > 0 || codesEnRiesgo.length > 0 || rifasSinGanador.length > 0;

  // ── rifaMap ─────────────────────────────────────────────────────────────────
  const rifaMap = useMemo(() => new Map(rifas.map((r) => [r.id!, r])), [rifas]);

  // ── Números: global o por rifa seleccionada ──────────────────────────────────
  const numDisplay = useMemo(() => {
    if (selectedRifa) {
      const total     = selectedRifa.num_fin - selectedRifa.num_inicio + 1;
      const vendidos  = selectedRifa.num_vendidos ?? 0;
      const apartados = selectedRifa.num_apartados ?? 0;
      return { total, vendidos, apartados, disponibles: total - vendidos - apartados };
    }
    const total     = rifas.reduce((s, r) => s + (r.num_fin - r.num_inicio + 1), 0);
    const vendidos  = rifas.reduce((s, r) => s + (r.num_vendidos ?? 0), 0);
    const apartados = rifas.reduce((s, r) => s + (r.num_apartados ?? 0), 0);
    return { total, vendidos, apartados, disponibles: total - vendidos - apartados };
  }, [selectedRifa, rifas]);

  // ── Revenue by rifa (solo en vista global) ───────────────────────────────────
  const revenueByRifa = useMemo(() => {
    const map = new Map<string, number>();
    pagadosAll.forEach((b) => map.set(b.rifa_id, (map.get(b.rifa_id) ?? 0) + b.precio_total));
    return Array.from(map.entries())
      .map(([id, total]) => ({ name: rifaMap.get(id)?.nombre ?? id, total }))
      .sort((a, b) => b.total - a.total);
  }, [pagadosAll, rifaMap]);

  const boletosByRifa = useMemo(() => {
    const map = new Map<string, number>();
    pagadosAll.forEach((b) => map.set(b.rifa_id, (map.get(b.rifa_id) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([id, count]) => ({ name: rifaMap.get(id)?.nombre ?? id, count }))
      .sort((a, b) => b.count - a.count);
  }, [pagadosAll, rifaMap]);

  // ── Time series ──────────────────────────────────────────────────────────────
  const timeSeries = useMemo(() => {
    const p = period > 0 ? period : 30;
    const days: { date: string; label: string; ingresos: number }[] = [];
    const now = new Date();
    for (let i = p - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, label: d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }), ingresos: 0 });
    }
    pagadosAll.forEach((b) => {
      const d = b.created_at?.toDate?.();
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      const entry = days.find((x) => x.date === key);
      if (entry) entry.ingresos += b.precio_total;
    });
    return days;
  }, [pagadosAll, period]);
  const maxIngresos = useMemo(() => Math.max(...timeSeries.map((d) => d.ingresos), 1), [timeSeries]);

  // ── Velocidad ────────────────────────────────────────────────────────────────
  const velocidadBoletos  = period > 0 ? pagadosPeriod.length / period : pagadosAll.length / Math.max(1, 30);
  const velocidadIngresos = period > 0 ? ingresoCurr / period          : ingresoTotal / Math.max(1, 30);
  const proyeccionMensual = velocidadIngresos * 30;

  const proyeccionRifas = useMemo(() => {
    const source = isGlobal ? rifas.filter((r) => r.activa) : (selectedRifa ? [selectedRifa] : []);
    return source.map((r) => {
      const disponibles = Math.max(0, (r.num_fin - r.num_inicio + 1) - (r.num_vendidos ?? 0) - (r.num_apartados ?? 0));
      const rifaPagadosPeriod = pagadosPeriod.filter((b) => b.rifa_id === r.id);
      const vel  = period > 0 ? rifaPagadosPeriod.length / period : 0;
      const dias = vel > 0 ? Math.ceil(disponibles / vel) : null;
      return { nombre: r.nombre, disponibles, dias, ingresoProyectado: disponibles * r.precio_boleto };
    });
  }, [rifas, selectedRifa, isGlobal, pagadosPeriod, period]);

  // ── Top customers ────────────────────────────────────────────────────────────
  const topClientes = useMemo(() => {
    const map = new Map<string, { nombre: string; total: number; boletos: number; celular: string }>();
    pagadosAll.forEach((b) => {
      const key = b.celular || b.nombre;
      const existing = map.get(key);
      if (existing) { existing.total += b.precio_total; existing.boletos += b.numeros.length; }
      else map.set(key, { nombre: `${b.nombre} ${b.apellidos}`.trim(), total: b.precio_total, boletos: b.numeros.length, celular: b.celular });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [pagadosAll]);

  // ── Distribución por estado ──────────────────────────────────────────────────
  const byEstado = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    activeBoletos.filter((b) => b.estado).forEach((b) => {
      const existing = map.get(b.estado);
      const rev = b.status === "pagado" ? b.precio_total : 0;
      if (existing) { existing.count++; existing.revenue += rev; }
      else map.set(b.estado, { count: 1, revenue: rev });
    });
    return Array.from(map.entries())
      .map(([estado, data]) => ({ estado, count: data.count, revenue: data.revenue, rpc: data.count > 0 ? data.revenue / data.count : 0 }))
      .sort((a, b) => b.count - a.count).slice(0, 10);
  }, [activeBoletos]);

  // ── Códigos de descuento ─────────────────────────────────────────────────────
  const discountUsage = useMemo(() => {
    const map = new Map<string, { usos: number; ahorro: number }>();
    pagadosAll.filter((b) => b.codigo_descuento && b.codigo_descuento !== "REGALO").forEach((b) => {
      const existing = map.get(b.codigo_descuento);
      const ahorro = b.precio_total * (b.descuento_aplicado / (100 - b.descuento_aplicado));
      if (existing) { existing.usos++; existing.ahorro += ahorro; }
      else map.set(b.codigo_descuento, { usos: 1, ahorro });
    });
    return Array.from(map.entries()).map(([codigo, data]) => ({ codigo, ...data })).sort((a, b) => b.usos - a.usos);
  }, [pagadosAll]);

  // ── Números populares ────────────────────────────────────────────────────────
  const popularNumbers = useMemo(() => {
    const map = new Map<number, number>();
    pagadosAll.forEach((b) => b.numeros.forEach((n) => map.set(n, (map.get(n) ?? 0) + 1)));
    return Array.from(map.entries()).map(([n, count]) => ({ n, count })).sort((a, b) => b.count - a.count).slice(0, 20);
  }, [pagadosAll]);

  // ── Rangos de números ────────────────────────────────────────────────────────
  const rangosNumeros = useMemo(() => {
    const srcRifas = selectedRifa ? [selectedRifa] : rifas;
    if (srcRifas.length === 0 || pagadosAll.length === 0) return [];
    const numMin     = Math.min(...srcRifas.map((r) => r.num_inicio));
    const numMax     = Math.max(...srcRifas.map((r) => r.num_fin));
    const rangeSize  = Math.ceil((numMax - numMin + 1) / 10);
    const rangos = Array.from({ length: 10 }, (_, i) => {
      const start = numMin + i * rangeSize;
      const end   = Math.min(start + rangeSize - 1, numMax);
      return { label: `${String(start).padStart(3, "0")}–${String(end).padStart(3, "0")}`, start, end, count: 0 };
    });
    pagadosAll.forEach((b) => b.numeros.forEach((n) => {
      const idx = Math.min(Math.floor((n - numMin) / rangeSize), 9);
      if (idx >= 0 && idx < rangos.length) rangos[idx].count++;
    }));
    return rangos;
  }, [selectedRifa, rifas, pagadosAll]);

  // ── Distribución de tamaño de compra ────────────────────────────────────────
  const distribucionTamano = useMemo(() => {
    const buckets = [
      { label: "1 número",      min: 1,  max: 1,       count: 0 },
      { label: "2–5 números",   min: 2,  max: 5,       count: 0 },
      { label: "6–10 números",  min: 6,  max: 10,      count: 0 },
      { label: "11–20 números", min: 11, max: 20,      count: 0 },
      { label: "21+ números",   min: 21, max: Infinity, count: 0 },
    ];
    pagadosAll.forEach((b) => {
      const n = b.numeros.length;
      const bucket = buckets.find((bk) => n >= bk.min && n <= bk.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [pagadosAll]);

  // ── Horas pico ───────────────────────────────────────────────────────────────
  const horasPico = useMemo(() => {
    const map = new Array(24).fill(0) as number[];
    boletosPeriod.forEach((b) => { const d = b.created_at?.toDate?.(); if (d) map[d.getHours()]++; });
    return map.map((count, h) => ({ h, count })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [boletosPeriod]);

  // ── Días de semana (con revenue) ─────────────────────────────────────────────
  const diasSemana = useMemo(() => {
    const nombres    = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const mapCount   = new Array(7).fill(0) as number[];
    const mapRevenue = new Array(7).fill(0) as number[];
    boletosPeriod.forEach((b) => {
      const d = b.created_at?.toDate?.();
      if (d) { mapCount[d.getDay()]++; if (b.status === "pagado") mapRevenue[d.getDay()] += b.precio_total; }
    });
    return mapCount.map((count, i) => ({ dia: nombres[i], count, revenue: mapRevenue[i] }));
  }, [boletosPeriod]);

  // ── Clientes recurrentes ─────────────────────────────────────────────────────
  const clientesRecurrentes = useMemo(() => {
    const map = new Map<string, { nombre: string; rifasSet: Set<string>; total: number }>();
    pagadosAll.forEach((b) => {
      const key = b.celular || b.nombre;
      const existing = map.get(key);
      if (existing) { existing.rifasSet.add(b.rifa_id); existing.total += b.precio_total; }
      else map.set(key, { nombre: `${b.nombre} ${b.apellidos}`.trim(), rifasSet: new Set([b.rifa_id]), total: b.precio_total });
    });
    const all = Array.from(map.values());
    const recurrentes = all.filter((c) => c.rifasSet.size >= 2).sort((a, b) => b.total - a.total).map((c) => ({ nombre: c.nombre, rifas: c.rifasSet.size, total: c.total }));
    return { recurrentes, totalClientes: all.length };
  }, [pagadosAll]);

  // ── Actividad reciente ───────────────────────────────────────────────────────
  const recentBoletos = useMemo(() =>
    [...activeBoletos].sort((a, b) => {
      const da = a.created_at?.toDate?.()?.getTime() ?? 0;
      const db_ = b.created_at?.toDate?.()?.getTime() ?? 0;
      return db_ - da;
    }).slice(0, 15),
  [activeBoletos]);

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const periodLabel = period === 0 ? "todo el tiempo" : `últimos ${period} días`;

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black">Métricas</h1>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              En vivo
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isGlobal
              ? `${boletos.length} boletos · ${rifas.length} rifas · ${clientesUnicosAll} clientes únicos`
              : `${activeBoletos.length} boletos · ${clientesUnicosAll} clientes · ${selectedRifa?.nombre}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Período */}
          <div className="flex gap-1">
            {([7, 14, 30, 0] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${period === p ? "bg-red-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>
                {p === 0 ? "Todo" : `${p}d`}
              </button>
            ))}
          </div>

          {/* Selector de rifa */}
          <div className="flex gap-1 border-l border-slate-200 dark:border-slate-700 pl-2 items-center">
            <button
              onClick={() => setSelectedRifaId(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isGlobal ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800" : "bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"}`}
            >
              Global
            </button>
            {rifas.length > 0 && (
              <select
                value={selectedRifaId ?? ""}
                onChange={(e) => setSelectedRifaId(e.target.value || null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border-0 outline-none ${!isGlobal ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}
              >
                <option value="">Ver por rifa...</option>
                {rifas.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ── Card info de la rifa seleccionada ── */}
      {selectedRifa && (
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 flex flex-wrap gap-6 items-center">
          <div>
            <p className="text-lg font-black">{selectedRifa.nombre}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Números {selectedRifa.num_inicio}–{selectedRifa.num_fin} · ${selectedRifa.precio_boleto}/número
              {selectedRifa.fecha_sorteo && ` · Sorteo: ${new Date(selectedRifa.fecha_sorteo).toLocaleDateString("es-MX")}`}
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${selectedRifa.activa ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"}`}>
            {selectedRifa.activa ? "Activa" : "Finalizada"}
          </span>
          {selectedRifa.ganador && (
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full">
              Ganador: {selectedRifa.ganador.nombre} {selectedRifa.ganador.apellidos} — #{selectedRifa.ganador.numero}
            </span>
          )}
          <button onClick={() => setSelectedRifaId(null)} className="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline">
            Ver global
          </button>
        </div>
      )}

      {/* ── Alertas (siempre globales) ── */}
      {hasAlerts && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Alertas operativas</p>
          <div className="space-y-2">
            {riesgoVencer.length > 0 && (
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                <span className="text-base flex-shrink-0">&#128308;</span>
                <div>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">{riesgoVencer.length} boleto{riesgoVencer.length !== 1 ? "s" : ""} en riesgo de vencer</p>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">Pendientes hace más de 20h · Valor: {currency(Math.round(riesgoVencerValor))}</p>
                </div>
              </div>
            )}
            {rifasOcupacionBaja.length > 0 && (
              <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-3">
                <span className="text-base flex-shrink-0">&#128993;</span>
                <div>
                  <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400">{rifasOcupacionBaja.length} rifa{rifasOcupacionBaja.length !== 1 ? "s" : ""} con ocupación &lt; 15% y sorteo en &lt; 14 días</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-0.5">{rifasOcupacionBaja.map((r) => r.nombre).join(", ")}</p>
                </div>
              </div>
            )}
            {codesEnRiesgo.length > 0 && (
              <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-4 py-3">
                <span className="text-base flex-shrink-0">&#128992;</span>
                <div>
                  <p className="text-sm font-bold text-orange-700 dark:text-orange-400">{codesEnRiesgo.length} código{codesEnRiesgo.length !== 1 ? "s" : ""} a punto de agotarse</p>
                  <p className="text-xs text-orange-600 dark:text-orange-500 mt-0.5">{codesEnRiesgo.map((c) => `${c.codigo} (${c.usos}/${c.max_usos})`).join(", ")}</p>
                </div>
              </div>
            )}
            {rifasSinGanador.length > 0 && (
              <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
                <span className="text-base flex-shrink-0">&#128309;</span>
                <div>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{rifasSinGanador.length} rifa{rifasSinGanador.length !== 1 ? "s" : ""} finalizada{rifasSinGanador.length !== 1 ? "s" : ""} sin ganador registrado</p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5">{rifasSinGanador.map((r) => r.nombre).join(", ")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Ingresos confirmados"  value={currency(ingresoTotal)}              color="bg-green-500"  trend={trendIngresos} />
        <KpiCard label="Ingresos pendientes"   value={currency(ingresoPendiente)}           color="bg-amber-400" />
        <KpiCard label="Boleto promedio"        value={currency(Math.round(ticketPromedio))} color="bg-blue-500" />
        <KpiCard label="Tasa de conversión"    value={`${conversionAll.toFixed(1)}%`}       color="bg-purple-500" trend={trendConversion} sub={`${pagadosAll.length} de ${activeBoletos.length}`} />
        <KpiCard label="Clientes únicos"       value={clientesUnicosAll}                    color="bg-red-500"   trend={trendClientes} />
        <KpiCard label="Descuentos otorgados"  value={currency(Math.round(descuentoTotal))} color="bg-slate-400" />
        <KpiCard label="Precio por número"     value={precioPorNumero > 0 ? currency(Math.round(precioPorNumero)) : "—"} color="bg-teal-500" sub="ingreso ÷ números vendidos" />
        <KpiCard label="Números por compra"    value={numPromedioCompra > 0 ? numPromedioCompra.toFixed(1) : "—"}        color="bg-indigo-500" sub="promedio por boleto pagado" />
      </div>

      {/* ── Tendencia boletos ── */}
      {period > 0 && trendPagados !== null && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-5 py-3 border border-slate-100 dark:border-slate-700 flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${trendPagados.up ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
              {trendPagados.up ? "↑" : "↓"} {trendPagados.pct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500">boletos pagados vs período anterior</span>
          </div>
          <p className="text-xs text-slate-400">{pagadosPeriod.length} pagados este período · {pagadosPrev.length} en el anterior</p>
          <p className="text-xs text-slate-400 ml-auto">{periodLabel}</p>
        </div>
      )}

      {/* ── Estado de boletos + Números ── */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>Estado de boletos</SectionTitle>
          <div className="space-y-3">
            {[
              { label: "Pagados",               count: pagadosAll.length,    color: "bg-green-500", textColor: "text-green-700 dark:text-green-400" },
              { label: "Apartados (pendiente)", count: pendientesAll.length, color: "bg-amber-400", textColor: "text-amber-700 dark:text-amber-400" },
              { label: "Cancelados",            count: canceladosAll.length, color: "bg-slate-400", textColor: "text-slate-500" },
              { label: "Regalos",               count: regalosAll.length,    color: "bg-red-400",   textColor: "text-red-600 dark:text-red-400" },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-400">{s.label}</span>
                  <span className={`font-black ${s.textColor}`}>{s.count} <span className="font-normal text-slate-400">({pct(s.count, activeBoletos.length)}%)</span></span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{ width: barW(s.count, activeBoletos.length) }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>{isGlobal ? "Números globales" : `Números — ${selectedRifa?.nombre}`}</SectionTitle>
          <div className="h-6 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-700 mb-4">
            <div className="h-full bg-green-500 transition-all duration-700" style={{ width: barW(numDisplay.vendidos, numDisplay.total) }} title="Vendidos" />
            <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: barW(numDisplay.apartados, numDisplay.total) }} title="Apartados" />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Vendidos",    value: numDisplay.vendidos,    color: "text-green-600 dark:text-green-400", dot: "bg-green-500" },
              { label: "Apartados",   value: numDisplay.apartados,   color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-400" },
              { label: "Disponibles", value: numDisplay.disponibles, color: "text-slate-600 dark:text-slate-300", dot: "bg-slate-300" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl py-3">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className={`w-2 h-2 rounded-full inline-block ${s.dot}`} />
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
                <p className="text-xs text-slate-400">{pct(s.value, numDisplay.total)}%</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">
            {numDisplay.total} números totales{isGlobal ? ` en ${rifas.length} rifa${rifas.length !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
      </div>

      {/* ── Ingresos por día ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Ingresos por día</SectionTitle>
          <p className="text-xs text-slate-400">{periodLabel}</p>
        </div>
        <div className="flex items-end gap-1 h-36">
          {timeSeries.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center group relative">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 text-xs font-bold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {currency(d.ingresos)}
              </div>
              <div className="w-full rounded-t-lg bg-red-500 dark:bg-red-600 transition-all duration-700"
                style={{ height: `${maxIngresos > 0 ? Math.max((d.ingresos / maxIngresos) * 100, d.ingresos > 0 ? 4 : 0) : 0}%` }} />
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          {timeSeries.map((d, i) => (
            <div key={d.date} className="flex-1 text-center">
              {(i === 0 || i === Math.floor(timeSeries.length / 2) || i === timeSeries.length - 1) && (
                <p className="text-[10px] text-slate-400">{d.label}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Velocidad de ventas ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
        <SectionTitle>Velocidad de ventas y proyección</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-xl font-black text-red-600 dark:text-red-400">{velocidadBoletos.toFixed(1)}</p>
            <p className="text-xs text-slate-500 mt-1">boletos / día</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-xl font-black text-green-600 dark:text-green-400">{currency(Math.round(velocidadIngresos))}</p>
            <p className="text-xs text-slate-500 mt-1">ingresos / día</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-xl font-black text-blue-600 dark:text-blue-400">{currency(Math.round(proyeccionMensual))}</p>
            <p className="text-xs text-slate-500 mt-1">proyección mensual</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              {currency(proyeccionRifas.reduce((s, r) => s + r.ingresoProyectado, 0))}
            </p>
            <p className="text-xs text-slate-500 mt-1">potencial disponible</p>
          </div>
        </div>
        {proyeccionRifas.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {isGlobal ? "Por rifa activa" : selectedRifa?.nombre} · {periodLabel}
            </p>
            {proyeccionRifas.map((r) => (
              <div key={r.nombre} className="flex items-center gap-3 py-1.5 border-b border-slate-50 dark:border-slate-700/50 last:border-0 text-sm">
                {isGlobal && <span className="flex-1 font-semibold truncate">{r.nombre}</span>}
                <span className="text-xs text-slate-400">{r.disponibles} disponibles</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">{currency(r.ingresoProyectado)}</span>
                <span className="text-xs text-slate-500 w-32 text-right flex-shrink-0">
                  {r.dias !== null ? `~${r.dias} día${r.dias !== 1 ? "s" : ""} para agotar` : "sin datos de ritmo"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Calidad de revenue ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
        <SectionTitle>Calidad de revenue</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-green-600 dark:text-green-400">
              {pagadosAll.length > 0 ? `${((pagadosSinDesc.length / pagadosAll.length) * 100).toFixed(1)}%` : "—"}
            </p>
            <p className="text-xs text-slate-500 mt-1">ventas a precio lleno</p>
            <p className="text-xs text-slate-400">{pagadosSinDesc.length} boletos</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {pagadosAll.length > 0 ? `${((pagadosConDesc.length / pagadosAll.length) * 100).toFixed(1)}%` : "—"}
            </p>
            <p className="text-xs text-slate-500 mt-1">ventas con descuento</p>
            <p className="text-xs text-slate-400">{pagadosConDesc.length} boletos</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-red-600 dark:text-red-400">{currency(Math.round(revenuePerdido))}</p>
            <p className="text-xs text-slate-500 mt-1">revenue perdido</p>
            <p className="text-xs text-slate-400">{canceladosAll.length} cancelado{canceladosAll.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
            <div className="flex justify-center gap-3 mb-1">
              <div>
                <p className="text-lg font-black text-purple-600 dark:text-purple-400">{conversionConDesc.toFixed(0)}%</p>
                <p className="text-xs text-slate-400">con dto.</p>
              </div>
              <div className="text-slate-300 self-center text-xs">vs</div>
              <div>
                <p className="text-lg font-black text-slate-600 dark:text-slate-300">{conversionSinDesc.toFixed(0)}%</p>
                <p className="text-xs text-slate-400">sin dto.</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">conversión por canal</p>
          </div>
        </div>
      </div>

      {/* ── Pareto + Distribución de tamaño ── */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>Concentración de revenue</SectionTitle>
          {ingresoTotal === 0
            ? <p className="text-sm text-slate-400">Sin datos aún.</p>
            : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-black text-red-600 dark:text-red-400">{paretoDatos.top20pct.toFixed(0)}%</p>
                  <p className="text-sm text-slate-500 mt-1">
                    del revenue viene del top {paretoDatos.top20count} cliente{paretoDatos.top20count !== 1 ? "s" : ""}
                    <span className="text-slate-400"> (20%)</span>
                  </p>
                </div>
                <div className="h-4 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-700">
                  <div className="h-full bg-red-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(paretoDatos.top20pct, 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Top 20% de clientes</span>
                  <span>Resto</span>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Los <strong>5 mejores clientes</strong> generan el{" "}
                    <strong className="text-red-600 dark:text-red-400">{paretoDatos.top5pct.toFixed(0)}%</strong> del revenue
                  </p>
                </div>
              </div>
            )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>Distribución de tamaño de compra</SectionTitle>
          <div className="space-y-3">
            {distribucionTamano.map((bk) => (
              <HBar key={bk.label} label={bk.label} value={bk.count} max={Math.max(...distribucionTamano.map((x) => x.count), 1)} formatted={`${bk.count} boleto${bk.count !== 1 ? "s" : ""}`} color="bg-indigo-500" />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">{pagadosAll.length} boleto{pagadosAll.length !== 1 ? "s" : ""} pagado{pagadosAll.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* ── Comparación entre rifas (solo en global) ── */}
      {isGlobal && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
              <SectionTitle>Ingresos por rifa</SectionTitle>
              {revenueByRifa.length === 0
                ? <p className="text-sm text-slate-400">Sin datos aún.</p>
                : revenueByRifa.map((r) => (
                  <div key={r.name} className="mb-3 last:mb-0">
                    <HBar label={r.name} value={r.total} max={revenueByRifa[0].total} formatted={currency(r.total)} color="bg-red-500" />
                  </div>
                ))}
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
              <SectionTitle>Boletos vendidos por rifa</SectionTitle>
              {boletosByRifa.length === 0
                ? <p className="text-sm text-slate-400">Sin datos aún.</p>
                : boletosByRifa.map((r) => (
                  <div key={r.name} className="mb-3 last:mb-0">
                    <HBar label={r.name} value={r.count} max={boletosByRifa[0].count} formatted={`${r.count} boleto${r.count !== 1 ? "s" : ""}`} color="bg-blue-500" />
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
            <SectionTitle>Detalle por rifa</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[960px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    {["Rifa", "Estado", "Total", "Vendidos", "Aptos.", "Dispon.", "Ingresos", "Rev/núm", "Conversión", "Ticket prom.", "Pend. riesgo", "Ocup."].map((h) => (
                      <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {rifas.map((r) => {
                    const total       = r.num_fin - r.num_inicio + 1;
                    const vend        = r.num_vendidos ?? 0;
                    const apart       = r.num_apartados ?? 0;
                    const disp        = total - vend - apart;
                    const rifaBoletos = boletos.filter((b) => b.rifa_id === r.id);
                    const rifaPagados = rifaBoletos.filter((b) => b.status === "pagado");
                    const rifaPend    = rifaBoletos.filter((b) => b.status === "pendiente");
                    const ing         = rifaPagados.reduce((s, b) => s + b.precio_total, 0);
                    const revNum      = vend > 0 ? ing / vend : 0;
                    const conv        = rifaBoletos.length > 0 ? (rifaPagados.length / rifaBoletos.length) * 100 : 0;
                    const ticket      = rifaPagados.length > 0 ? ing / rifaPagados.length : 0;
                    const threshold   = new Date(Date.now() - 20 * 60 * 60 * 1000);
                    const pendRiesgo  = rifaPend.filter((b) => { const d = b.created_at?.toDate?.(); return d && d < threshold; }).length;
                    const ocup        = total > 0 ? ((vend + apart) / total) * 100 : 0;
                    return (
                      <tr key={r.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                        onClick={() => setSelectedRifaId(r.id!)}
                        title="Ver métricas de esta rifa"
                      >
                        <td className="py-2.5 px-2 font-semibold text-red-600 dark:text-red-400 hover:underline">{r.nombre}</td>
                        <td className="py-2.5 px-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.activa ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-slate-100 text-slate-500 dark:bg-slate-700"}`}>
                            {r.activa ? "Activa" : "Finalizada"}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">{total}</td>
                        <td className="py-2.5 px-2 text-center font-bold text-green-600 dark:text-green-400">{vend}</td>
                        <td className="py-2.5 px-2 text-center font-bold text-amber-600 dark:text-amber-400">{apart}</td>
                        <td className="py-2.5 px-2 text-center text-slate-500">{disp}</td>
                        <td className="py-2.5 px-2 font-black text-red-600 dark:text-red-400">{currency(ing)}</td>
                        <td className="py-2.5 px-2 text-slate-500">{revNum > 0 ? currency(Math.round(revNum)) : "—"}</td>
                        <td className="py-2.5 px-2">
                          <span className={`text-xs font-bold ${conv >= 50 ? "text-green-600 dark:text-green-400" : conv >= 25 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                            {conv.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-slate-500">{ticket > 0 ? currency(Math.round(ticket)) : "—"}</td>
                        <td className="py-2.5 px-2">
                          {pendRiesgo > 0
                            ? <span className="text-xs font-bold text-red-600 dark:text-red-400">{pendRiesgo} &#9888;</span>
                            : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: `${ocup}%` }} />
                            </div>
                            <span className="text-xs font-semibold">{ocup.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-3">Haz clic en una fila para ver las métricas de esa rifa.</p>
          </div>
        </>
      )}

      {/* ── Top clientes + Estado ── */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>Top 10 clientes</SectionTitle>
          {topClientes.length === 0
            ? <p className="text-sm text-slate-400">Sin datos aún.</p>
            : (
              <div className="space-y-2.5">
                {topClientes.map((c, i) => (
                  <div key={c.celular || c.nombre} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${i < 3 ? "bg-red-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.nombre || "—"}</p>
                      <p className="text-xs text-slate-400">{c.celular} · {c.boletos} número{c.boletos !== 1 ? "s" : ""}</p>
                    </div>
                    <p className="font-black text-sm text-red-600 dark:text-red-400 flex-shrink-0">{currency(c.total)}</p>
                  </div>
                ))}
              </div>
            )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>Distribución por estado</SectionTitle>
          {byEstado.length === 0
            ? <p className="text-sm text-slate-400">Sin datos aún.</p>
            : (
              <div className="space-y-2">
                {byEstado.map((e) => (
                  <div key={e.estado} className="flex items-center gap-2">
                    <p className="w-24 text-xs text-slate-600 dark:text-slate-400 truncate flex-shrink-0">{e.estado}</p>
                    <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full transition-all duration-700" style={{ width: barW(e.count, byEstado[0].count) }} />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right flex-shrink-0">{e.count}</span>
                    <span className="text-xs text-green-600 dark:text-green-400 w-20 text-right flex-shrink-0">{currency(Math.round(e.revenue))}</span>
                    <span className="text-xs text-slate-400 hidden lg:block w-20 text-right flex-shrink-0" title="Revenue por cliente">
                      {e.revenue > 0 ? `${currency(Math.round(e.rpc))}/cli` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* ── Horas pico + Días de semana ── */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>Horas pico</SectionTitle>
          {horasPico.length === 0
            ? <p className="text-sm text-slate-400">Sin datos en el período.</p>
            : (
              <div className="space-y-2">
                {horasPico.map((h) => (
                  <HBar key={h.h} label={`${String(h.h).padStart(2, "0")}:00`} value={h.count} max={horasPico[0].count} formatted={`${h.count} boleto${h.count !== 1 ? "s" : ""}`} color="bg-teal-500" />
                ))}
              </div>
            )}
          <p className="text-xs text-slate-400 mt-3">Hora local · {periodLabel}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>Actividad por día de semana</SectionTitle>
          <div className="space-y-2">
            {diasSemana.map((d) => (
              <div key={d.dia} className="flex items-center gap-3">
                <p className="w-8 text-xs text-slate-600 dark:text-slate-400 flex-shrink-0">{d.dia}</p>
                <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all duration-700"
                    style={{ width: barW(d.count, Math.max(...diasSemana.map((x) => x.count), 1)) }} />
                </div>
                <span className="text-xs font-bold w-14 text-right flex-shrink-0">{d.count} bol.</span>
                {d.revenue > 0 && (
                  <span className="text-xs text-green-600 dark:text-green-400 w-20 text-right flex-shrink-0">{currency(Math.round(d.revenue))}</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">{periodLabel}</p>
        </div>
      </div>

      {/* ── Rangos + Números populares ── */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>Rangos de números populares</SectionTitle>
          {rangosNumeros.length === 0
            ? <p className="text-sm text-slate-400">Sin datos aún.</p>
            : (
              <div className="space-y-2">
                {rangosNumeros.map((r) => (
                  <HBar key={r.label} label={r.label} value={r.count} max={Math.max(...rangosNumeros.map((x) => x.count), 1)} formatted={`${r.count} veces`} color="bg-rose-500" />
                ))}
              </div>
            )}
          <p className="text-xs text-slate-400 mt-3">Distribución macro (todo el tiempo)</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>Números más populares (top 20)</SectionTitle>
          {popularNumbers.length === 0
            ? <p className="text-sm text-slate-400">Sin datos aún.</p>
            : (
              <div className="flex flex-wrap gap-2">
                {popularNumbers.map((p, i) => (
                  <div key={p.n} className={`flex flex-col items-center justify-center rounded-xl px-3 py-2 ${i < 3 ? "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800" : "bg-slate-50 dark:bg-slate-700"}`}>
                    <span className={`font-black text-lg ${i < 3 ? "text-red-700 dark:text-red-400" : ""}`}>{p.n}</span>
                    <span className="text-xs text-slate-400">{p.count}x</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* ── Retención de clientes ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
        <SectionTitle>Retención de clientes</SectionTitle>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{clientesRecurrentes.recurrentes.length}</p>
            <p className="text-xs text-slate-500 mt-1">clientes recurrentes</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-slate-600 dark:text-slate-300">{clientesRecurrentes.totalClientes - clientesRecurrentes.recurrentes.length}</p>
            <p className="text-xs text-slate-500 mt-1">clientes nuevos</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-green-600 dark:text-green-400">
              {clientesRecurrentes.totalClientes > 0 ? `${((clientesRecurrentes.recurrentes.length / clientesRecurrentes.totalClientes) * 100).toFixed(1)}%` : "0%"}
            </p>
            <p className="text-xs text-slate-500 mt-1">tasa de retención</p>
          </div>
        </div>
        {clientesRecurrentes.recurrentes.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top clientes recurrentes</p>
            {clientesRecurrentes.recurrentes.slice(0, 8).map((c) => (
              <div key={c.nombre} className="flex items-center gap-3 py-1.5 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                <span className="flex-1 text-sm font-semibold truncate">{c.nombre || "—"}</span>
                <span className="text-xs text-slate-400">{c.rifas} rifa{c.rifas !== 1 ? "s" : ""}</span>
                <span className="text-sm font-black text-red-600 dark:text-red-400">{currency(c.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Códigos de descuento ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
        <SectionTitle>Códigos de descuento usados</SectionTitle>
        {discountUsage.length === 0
          ? <p className="text-sm text-slate-400">Ningún código aplicado aún.</p>
          : (
            <div className="space-y-3">
              {discountUsage.map((d) => (
                <div key={d.codigo} className="flex items-center gap-3">
                  <span className="font-mono font-black text-sm bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg">{d.codigo}</span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: barW(d.usos, discountUsage[0].usos) }} />
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex-shrink-0">{d.usos} uso{d.usos !== 1 ? "s" : ""}</span>
                  <span className="text-xs text-green-600 dark:text-green-400 flex-shrink-0">-{currency(Math.round(d.ahorro))}</span>
                </div>
              ))}
              <p className="text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">
                Total descontado: <strong>{currency(Math.round(discountUsage.reduce((s, d) => s + d.ahorro, 0)))}</strong>
              </p>
            </div>
          )}
        {isGlobal && (
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 mb-2">Códigos registrados</p>
            <div className="space-y-1.5">
              {codes.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold">{c.codigo}</span>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span>{c.porcentaje}% dto.</span>
                    <span>{c.usos}/{c.max_usos} usos</span>
                    <span className={`w-2 h-2 rounded-full ${c.activo ? "bg-green-500" : "bg-slate-300"}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Actividad reciente ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
        <SectionTitle>Actividad reciente</SectionTitle>
        <div className="space-y-1">
          {recentBoletos.map((b) => {
            const rifaNombre = rifaMap.get(b.rifa_id)?.nombre ?? "—";
            const fecha = b.created_at?.toDate?.()?.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) ?? "—";
            return (
              <div key={b.id} className="flex items-center gap-2 py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400 w-24 flex-shrink-0">{b.folio}</span>
                <span className="text-sm flex-1 min-w-0 truncate">{b.nombre} {b.apellidos}</span>
                <span className="text-xs text-slate-400 hidden sm:block flex-shrink-0 w-6 text-center" title="Números comprados">{b.numeros.length}</span>
                {isGlobal && <span className="text-xs text-slate-400 hidden md:block flex-shrink-0 truncate max-w-[100px]">{rifaNombre}</span>}
                <span className="text-xs font-bold flex-shrink-0">{currency(b.precio_total)}</span>
                <StatusBadge status={b.status} />
                <span className="text-xs text-slate-400 hidden lg:block whitespace-nowrap flex-shrink-0">{fecha}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
