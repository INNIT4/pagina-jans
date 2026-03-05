"use client";

import { useEffect, useState, useMemo } from "react";
import { getBoletos, getRifas, getDiscountCodes, Boleto, Rifa, DiscountCode } from "@/lib/firestore";

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-5">
      <div className={`w-8 h-1 rounded-full ${color} mb-3`} />
      <p className="text-2xl font-black mb-0.5">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MetricasPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 14 | 30>(14);

  useEffect(() => {
    Promise.all([getBoletos(), getRifas(), getDiscountCodes()]).then(([bs, rs, cs]) => {
      setBoletos(bs);
      setRifas(rs);
      setCodes(cs);
      setLoading(false);
    });
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────

  const pagados   = useMemo(() => boletos.filter((b) => b.status === "pagado"), [boletos]);
  const pendientes= useMemo(() => boletos.filter((b) => b.status === "pendiente"), [boletos]);
  const cancelados= useMemo(() => boletos.filter((b) => b.status === "cancelado"), [boletos]);
  const regalos   = useMemo(() => pagados.filter((b) => b.codigo_descuento === "REGALO"), [pagados]);

  const ingresoTotal     = useMemo(() => pagados.reduce((s, b) => s + b.precio_total, 0), [pagados]);
  const ingresoPendiente = useMemo(() => pendientes.reduce((s, b) => s + b.precio_total, 0), [pendientes]);
  const descuentoTotal   = useMemo(() =>
    pagados.reduce((s, b) => s + (b.precio_total / (1 - b.descuento_aplicado / 100) - b.precio_total || 0), 0)
  , [pagados]);

  const ticketPromedio = pagados.length > 0 ? ingresoTotal / pagados.length : 0;

  const clientesUnicos = useMemo(() =>
    new Set(boletos.filter((b) => b.celular).map((b) => b.celular)).size
  , [boletos]);

  const conversion = boletos.length > 0 ? (pagados.length / boletos.length) * 100 : 0;

  // Total numbers across all rifas
  const totalNumeros    = useMemo(() => rifas.reduce((s, r) => s + (r.num_fin - r.num_inicio + 1), 0), [rifas]);
  const totalVendidos   = useMemo(() => rifas.reduce((s, r) => s + (r.num_vendidos ?? 0), 0), [rifas]);
  const totalApartados  = useMemo(() => rifas.reduce((s, r) => s + (r.num_apartados ?? 0), 0), [rifas]);
  const totalDisponibles= totalNumeros - totalVendidos - totalApartados;

  // ── Revenue by rifa ─────────────────────────────────────────────────────────
  const rifaMap = useMemo(() => new Map(rifas.map((r) => [r.id!, r])), [rifas]);

  const revenueByRifa = useMemo(() => {
    const map = new Map<string, number>();
    pagados.forEach((b) => map.set(b.rifa_id, (map.get(b.rifa_id) ?? 0) + b.precio_total));
    return Array.from(map.entries())
      .map(([id, total]) => ({ name: rifaMap.get(id)?.nombre ?? id, total }))
      .sort((a, b) => b.total - a.total);
  }, [pagados, rifaMap]);

  const boletosByRifa = useMemo(() => {
    const map = new Map<string, number>();
    pagados.forEach((b) => map.set(b.rifa_id, (map.get(b.rifa_id) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([id, count]) => ({ name: rifaMap.get(id)?.nombre ?? id, count }))
      .sort((a, b) => b.count - a.count);
  }, [pagados, rifaMap]);

  // ── Time series (sales per day) ──────────────────────────────────────────────
  const timeSeries = useMemo(() => {
    const days: { date: string; label: string; pagados: number; ingresos: number }[] = [];
    const now = new Date();
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
      days.push({ date: key, label, pagados: 0, ingresos: 0 });
    }
    pagados.forEach((b) => {
      const d = b.created_at?.toDate?.();
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      const entry = days.find((x) => x.date === key);
      if (entry) { entry.pagados += 1; entry.ingresos += b.precio_total; }
    });
    return days;
  }, [pagados, period]);

  const maxIngresos = useMemo(() => Math.max(...timeSeries.map((d) => d.ingresos), 1), [timeSeries]);

  // ── Top customers ────────────────────────────────────────────────────────────
  const topClientes = useMemo(() => {
    const map = new Map<string, { nombre: string; total: number; boletos: number; celular: string }>();
    pagados.forEach((b) => {
      const key = b.celular || b.nombre;
      const existing = map.get(key);
      if (existing) {
        existing.total += b.precio_total;
        existing.boletos += b.numeros.length;
      } else {
        map.set(key, { nombre: `${b.nombre} ${b.apellidos}`.trim(), total: b.precio_total, boletos: b.numeros.length, celular: b.celular });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [pagados]);

  // ── Geographic distribution ──────────────────────────────────────────────────
  const byEstado = useMemo(() => {
    const map = new Map<string, number>();
    boletos.filter((b) => b.estado).forEach((b) => map.set(b.estado, (map.get(b.estado) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([estado, count]) => ({ estado, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [boletos]);

  // ── Discount codes usage ─────────────────────────────────────────────────────
  const discountUsage = useMemo(() => {
    const map = new Map<string, { usos: number; ahorro: number }>();
    pagados.filter((b) => b.codigo_descuento && b.codigo_descuento !== "REGALO").forEach((b) => {
      const existing = map.get(b.codigo_descuento);
      const ahorro = b.precio_total * (b.descuento_aplicado / (100 - b.descuento_aplicado));
      if (existing) { existing.usos++; existing.ahorro += ahorro; }
      else map.set(b.codigo_descuento, { usos: 1, ahorro });
    });
    return Array.from(map.entries())
      .map(([codigo, data]) => ({ codigo, ...data }))
      .sort((a, b) => b.usos - a.usos);
  }, [pagados]);

  // ── Number popularity (top sold per rifa) ────────────────────────────────────
  const popularNumbers = useMemo(() => {
    const map = new Map<number, number>();
    pagados.forEach((b) => b.numeros.forEach((n) => map.set(n, (map.get(n) ?? 0) + 1)));
    return Array.from(map.entries())
      .map(([n, count]) => ({ n, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [pagados]);

  // ── Recent boletos ───────────────────────────────────────────────────────────
  const recentBoletos = useMemo(() => boletos.slice(0, 8), [boletos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Métricas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {boletos.length} boletos · {rifas.length} rifas · {clientesUnicos} clientes únicos
          </p>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Ingresos confirmados" value={currency(ingresoTotal)} color="bg-green-500" />
        <KpiCard label="Ingresos pendientes" value={currency(ingresoPendiente)} color="bg-amber-400" />
        <KpiCard label="Boleto promedio" value={currency(Math.round(ticketPromedio))} color="bg-blue-500" />
        <KpiCard label="Tasa de conversión" value={`${conversion.toFixed(1)}%`} sub={`${pagados.length} de ${boletos.length}`} color="bg-purple-500" />
        <KpiCard label="Clientes únicos" value={clientesUnicos} color="bg-red-500" />
        <KpiCard label="Descuentos otorgados" value={currency(Math.round(descuentoTotal))} color="bg-slate-400" />
      </div>

      {/* ── Status overview ── */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Funnel */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>Estado de boletos</SectionTitle>
          <div className="space-y-3">
            {[
              { label: "Pagados", count: pagados.length, color: "bg-green-500", textColor: "text-green-700 dark:text-green-400" },
              { label: "Apartados (pendiente)", count: pendientes.length, color: "bg-amber-400", textColor: "text-amber-700 dark:text-amber-400" },
              { label: "Cancelados", count: cancelados.length, color: "bg-slate-400", textColor: "text-slate-500" },
              { label: "Regalos", count: regalos.length, color: "bg-red-400", textColor: "text-red-600 dark:text-red-400" },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-400">{s.label}</span>
                  <span className={`font-black ${s.textColor}`}>{s.count} <span className="font-normal text-slate-400">({pct(s.count, boletos.length)}%)</span></span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{ width: barW(s.count, boletos.length) }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Numbers overview */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>Números globales</SectionTitle>

          {/* Stacked bar */}
          <div className="h-6 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-700 mb-4">
            <div className="h-full bg-green-500 transition-all duration-700" style={{ width: barW(totalVendidos, totalNumeros) }} title="Vendidos" />
            <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: barW(totalApartados, totalNumeros) }} title="Apartados" />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Vendidos", value: totalVendidos, color: "text-green-600 dark:text-green-400", dot: "bg-green-500" },
              { label: "Apartados", value: totalApartados, color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-400" },
              { label: "Disponibles", value: totalDisponibles, color: "text-slate-600 dark:text-slate-300", dot: "bg-slate-300" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl py-3">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className={`w-2 h-2 rounded-full inline-block ${s.dot}`} />
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
                <p className="text-xs text-slate-400">{pct(s.value, totalNumeros)}%</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">{totalNumeros} números totales en {rifas.length} rifa{rifas.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* ── Time series ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Ingresos por día</SectionTitle>
          <div className="flex gap-1">
            {([7, 14, 30] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${period === p ? "bg-red-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>
                {p}d
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-1 h-36">
          {timeSeries.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
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

      {/* ── Revenue by rifa + Boletos by rifa ── */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>Ingresos por rifa</SectionTitle>
          <div className="space-y-3">
            {revenueByRifa.length === 0
              ? <p className="text-sm text-slate-400">Sin datos aún.</p>
              : revenueByRifa.map((r) => (
                <HBar key={r.name} label={r.name} value={r.total} max={revenueByRifa[0].total} formatted={currency(r.total)} color="bg-red-500" />
              ))
            }
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>Boletos vendidos por rifa</SectionTitle>
          <div className="space-y-3">
            {boletosByRifa.length === 0
              ? <p className="text-sm text-slate-400">Sin datos aún.</p>
              : boletosByRifa.map((r) => (
                <HBar key={r.name} label={r.name} value={r.count} max={boletosByRifa[0].count} formatted={`${r.count} boleto${r.count !== 1 ? "s" : ""}`} color="bg-blue-500" />
              ))
            }
          </div>
        </div>
      </div>

      {/* ── Per-rifa detail ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
        <SectionTitle>Detalle por rifa</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                {["Rifa", "Estado", "Total nums.", "Vendidos", "Apartados", "Disponibles", "Ingresos", "Ocup."].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {rifas.map((r) => {
                const total = r.num_fin - r.num_inicio + 1;
                const vend = r.num_vendidos ?? 0;
                const apart = r.num_apartados ?? 0;
                const disp = total - vend - apart;
                const ing = pagados.filter((b) => b.rifa_id === r.id).reduce((s, b) => s + b.precio_total, 0);
                const ocup = total > 0 ? ((vend + apart) / total) * 100 : 0;
                return (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-3 font-semibold">{r.nombre}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.activa ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-slate-100 text-slate-500 dark:bg-slate-700"}`}>
                        {r.activa ? "Activa" : "Finalizada"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">{total}</td>
                    <td className="py-3 px-3 text-center font-bold text-green-600 dark:text-green-400">{vend}</td>
                    <td className="py-3 px-3 text-center font-bold text-amber-600 dark:text-amber-400">{apart}</td>
                    <td className="py-3 px-3 text-center text-slate-500">{disp}</td>
                    <td className="py-3 px-3 font-black text-red-600 dark:text-red-400">{currency(ing)}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
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
      </div>

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
            )
          }
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>Distribución por estado</SectionTitle>
          {byEstado.length === 0
            ? <p className="text-sm text-slate-400">Sin datos aún.</p>
            : (
              <div className="space-y-2.5">
                {byEstado.map((e) => (
                  <HBar key={e.estado} label={e.estado} value={e.count} max={byEstado[0].count} formatted={`${e.count} cliente${e.count !== 1 ? "s" : ""}`} color="bg-purple-500" />
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* ── Popular numbers + Discount codes ── */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
          <SectionTitle>Números más populares</SectionTitle>
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
            )
          }
        </div>

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
            )
          }

          {/* Registered codes summary */}
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
        </div>
      </div>

      {/* ── Recent activity ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
        <SectionTitle>Actividad reciente</SectionTitle>
        <div className="space-y-2">
          {recentBoletos.map((b) => {
            const rifaNombre = rifaMap.get(b.rifa_id)?.nombre ?? "—";
            const fecha = b.created_at?.toDate?.()?.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) ?? "—";
            return (
              <div key={b.id} className="flex items-center gap-3 py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.status === "pagado" ? "bg-green-500" : b.status === "cancelado" ? "bg-slate-400" : "bg-amber-400"}`} />
                <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400 w-24 flex-shrink-0">{b.folio}</span>
                <span className="text-sm flex-1 truncate">{b.nombre} {b.apellidos}</span>
                <span className="text-xs text-slate-400 hidden sm:block">{rifaNombre}</span>
                <span className="text-xs font-bold">{currency(b.precio_total)}</span>
                <span className="text-xs text-slate-400 hidden md:block whitespace-nowrap">{fecha}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
