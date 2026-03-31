"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  getBoletosPaginados, getRifas, Boleto, Rifa,
  cancelApartado, revertPagadoToApartado, cancelPagado, markBoletoPagadoConNumeros,
} from "@/lib/firestore";

type ServiceType = "apartado-pagado" | "apartado-disponible" | "pagado-apartado" | "pagado-disponible";

const SERVICES: { id: ServiceType; label: string; from: string; to: string; fromColor: string; toColor: string; desc: string; filterStatus: "pendiente" | "pagado" }[] = [
  {
    id: "apartado-pagado",
    label: "Apartado → Pagado",
    from: "Apartado",
    to: "Pagado",
    fromColor: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    toColor: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    desc: "Confirma el pago de un boleto pendiente recibido por WhatsApp. Los números pasan de apartados a vendidos.",
    filterStatus: "pendiente",
  },
  {
    id: "apartado-disponible",
    label: "Apartado → Disponible",
    from: "Apartado",
    to: "Disponible",
    fromColor: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    toColor: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    desc: "Cancela un boleto pendiente de pago y libera sus números para que puedan volver a seleccionarse.",
    filterStatus: "pendiente",
  },
  {
    id: "pagado-apartado",
    label: "Pagado → Apartado",
    from: "Pagado",
    to: "Apartado",
    fromColor: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    toColor: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    desc: "Revierte un boleto confirmado de vuelta a pendiente. Los números pasan de vendidos a apartados.",
    filterStatus: "pagado",
  },
  {
    id: "pagado-disponible",
    label: "Pagado → Disponible",
    from: "Pagado",
    to: "Disponible",
    fromColor: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    toColor: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    desc: "Cancela completamente un boleto pagado y libera sus números como disponibles.",
    filterStatus: "pagado",
  },
];

export default function ServiciosPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [rifaMap, setRifaMap] = useState<Map<string, Rifa>>(new Map());
  const [activeTab, setActiveTab] = useState<ServiceType>("apartado-pagado");
  const [filterRifa, setFilterRifa] = useState("");
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rifas, setRifas] = useState<Rifa[]>([]);

  const rifasLoaded = useRef(false);
  const lastLoadedStatus = useRef<string | null>(null);

  async function loadForStatus(status: "pendiente" | "pagado") {
    setLoading(true);
    try {
      const { boletos: bs } = await getBoletosPaginados({ status, pageSize: 9999, loadAll: true });
      setBoletos(bs);
      if (!rifasLoaded.current) {
        const rs = await getRifas();
        setRifas(rs);
        setRifaMap(new Map(rs.map((r) => [r.id!, r])));
        rifasLoaded.current = true;
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const s = SERVICES.find((s) => s.id === activeTab)!;
    if (s.filterStatus === lastLoadedStatus.current) return;
    lastLoadedStatus.current = s.filterStatus;
    loadForStatus(s.filterStatus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const service = SERVICES.find((s) => s.id === activeTab)!;

  const filtered = useMemo(() => {
    return boletos.filter((b) => {
      if (b.status !== service.filterStatus) return false;
      if (filterRifa && b.rifa_id !== filterRifa) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !b.folio.toLowerCase().includes(q) &&
          !b.nombre.toLowerCase().includes(q) &&
          !b.apellidos.toLowerCase().includes(q) &&
          !b.celular.includes(q)
        ) return false;
      }
      return true;
    });
  }, [boletos, service.filterStatus, filterRifa, search]);

  async function handleAction(boleto: Boleto) {
    let notifyWhatsApp = false;
    let waWindow: Window | null = null;
    let confirmMsg = "";

    if (activeTab === "apartado-pagado") {
      confirmMsg = `¿Confirmar pago del folio ${boleto.folio}?`;
    } else if (activeTab === "apartado-disponible") {
      confirmMsg = `¿Cancelar apartado del folio ${boleto.folio} y liberar sus números?`;
    } else if (activeTab === "pagado-apartado") {
      confirmMsg = `¿Revertir el folio ${boleto.folio} de Pagado a Apartado?`;
    } else {
      confirmMsg = `¿Cancelar completamente el folio ${boleto.folio} y liberar sus números como disponibles?`;
    }

    if (!confirm(confirmMsg)) return;

    if (activeTab === "apartado-pagado") {
      if (confirm(`¿Deseas enviar un mensaje de confirmación por WhatsApp al numero ${boleto.celular}?`)) {
        notifyWhatsApp = true;
        waWindow = window.open("", "_blank");
      }
    }

    setProcessing(boleto.id!);
    try {
      if (activeTab === "apartado-pagado") {
        await markBoletoPagadoConNumeros({ id: boleto.id!, rifa_id: boleto.rifa_id, numeros: boleto.numeros });
        if (notifyWhatsApp && waWindow) {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
          const msg = `El pago de tu folio ${boleto.folio} ha sido confirmado exitosamente.\nVerifica el estado de tu boleto: ${baseUrl}/consulta?f=${boleto.folio}&act=1`;
          waWindow.location.href = `https://wa.me/52${boleto.celular.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
        }
      } else if (activeTab === "apartado-disponible") {
        await cancelApartado({ id: boleto.id!, rifa_id: boleto.rifa_id, numeros: boleto.numeros });
      } else if (activeTab === "pagado-apartado") {
        await revertPagadoToApartado({ id: boleto.id!, rifa_id: boleto.rifa_id, numeros: boleto.numeros });
      } else {
        await cancelPagado({ id: boleto.id!, rifa_id: boleto.rifa_id, numeros: boleto.numeros });
      }
      await loadForStatus(service.filterStatus);
    } catch {
      if (waWindow) waWindow.close();
      alert("Error al procesar la acción. Intenta de nuevo.");
    }
    setProcessing(null);
  }

  const actionLabel: Record<ServiceType, string> = {
    "apartado-pagado": "Confirmar pago WhatsApp",
    "apartado-disponible": "Cancelar apartado",
    "pagado-apartado": "Revertir a apartado",
    "pagado-disponible": "Cancelar y liberar",
  };

  const actionColor: Record<ServiceType, string> = {
    "apartado-pagado": "bg-green-600 hover:bg-green-700",
    "apartado-disponible": "bg-amber-500 hover:bg-amber-600",
    "pagado-apartado": "bg-blue-600 hover:bg-blue-700",
    "pagado-disponible": "bg-red-600 hover:bg-red-700",
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
      <div className="mb-6">
        <h1 className="text-2xl font-black">Servicios</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Gestiona manualmente el estado de los boletos y sus números.
        </p>
      </div>

      {/* Service tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {SERVICES.map((s) => (
          <button
            key={s.id}
            onClick={() => { setActiveTab(s.id); setSearch(""); setFilterRifa(""); }}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              activeTab === s.id
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-red-300 dark:hover:border-red-700"
            }`}
          >
            {/* Arrow indicator */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.fromColor}`}>{s.from}</span>
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.toColor}`}>{s.to}</span>
            </div>
            <p className={`font-bold text-sm mb-1 ${activeTab === s.id ? "text-red-700 dark:text-red-400" : ""}`}>
              {s.label}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
          </button>
        ))}
      </div>

      {/* Warning banner */}
      <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl p-4 mb-6">
        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <p className="text-amber-800 dark:text-amber-300 text-sm">
          <strong>Atención:</strong> Estas acciones modifican directamente los números disponibles en la rifa y el estado del boleto. Son irreversibles desde esta pantalla — procede con cuidado.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por folio, nombre o celular..."
          className="flex-1 min-w-[220px] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <select
          value={filterRifa}
          onChange={(e) => setFilterRifa(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
        >
          <option value="">Todas las rifas</option>
          {rifas.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
        <span className="px-3 py-2 text-sm text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg">
          {filtered.length} boleto{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              {["Folio", "Rifa", "Cliente", "Celular", "Números", "Total", "Estado actual", "Fecha", "Acción"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 font-mono font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                  {b.folio}
                </td>
                <td className="px-4 py-3 font-medium whitespace-nowrap">
                  {rifaMap.get(b.rifa_id)?.nombre ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{b.nombre} {b.apellidos}</p>
                  <p className="text-xs text-slate-400">{b.estado}</p>
                </td>
                <td className="px-4 py-3 text-slate-500">{b.celular}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 max-w-[160px]">
                    {b.numeros.slice(0, 6).map((n) => (
                      <span key={n} className="text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800 rounded px-1.5 py-0.5 font-mono">
                        {n}
                      </span>
                    ))}
                    {b.numeros.length > 6 && (
                      <span className="text-xs text-slate-400">+{b.numeros.length - 6}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold whitespace-nowrap">
                  ${b.precio_total.toLocaleString("es-MX")}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                    b.status === "pagado"
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                  }`}>
                    {b.status === "pagado" ? "Pagado" : "Apartado"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                  {b.created_at?.toDate?.()?.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleAction(b)}
                    disabled={processing === b.id}
                    className={`text-xs px-3 py-1.5 text-white font-bold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap ${actionColor[activeTab]}`}
                  >
                    {processing === b.id ? "Procesando..." : actionLabel[activeTab]}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center py-10 text-slate-400">
            No hay boletos con estado &ldquo;{service.from}&rdquo; para mostrar.
          </p>
        )}
      </div>
    </div>
  );
}
