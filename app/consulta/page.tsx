"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getBoletoByFolio, getBoletosByCelular, getBoletosByNumero, getRifa, Boleto, Rifa } from "@/lib/firestore";
import { downloadComprobante } from "@/lib/pdf";

interface Result {
  boleto: Boleto;
  rifa: Rifa | null;
}

export default function ConsultaPage() {
  return (
    <Suspense>
      <ConsultaInner />
    </Suspense>
  );
}

function ConsultaInner() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState("");

  const buscarFolio = useCallback(async (val: string) => {
    setLoading(true);
    setError("");
    setResults(null);

    try {
      let boletos: Boleto[] = [];

      const soloDigitos = /^\d+$/.test(val);
      if (!soloDigitos || val.startsWith("JNS-")) {
        // Folio
        const b = await getBoletoByFolio(val);
        if (b) boletos = [b];
      } else if (val.length === 10) {
        // Celular
        boletos = await getBoletosByCelular(val);
      } else {
        // Número de boleto
        boletos = await getBoletosByNumero(Number(val));
      }

      if (boletos.length === 0) {
        setError("No encontramos ningún boleto con ese dato. Verifica el folio, celular o número de boleto.");
      } else {
        const res: Result[] = await Promise.all(
          boletos.map(async (b) => {
            let rifa: Rifa | null = null;
            try { rifa = await getRifa(b.rifa_id); } catch {}
            return { boleto: b, rifa };
          })
        );
        setResults(res);
      }
    } catch {
      setError("Ocurrió un error al buscar. Intenta de nuevo.");
    }
    setLoading(false);
  }, []);

  // Auto-search when ?f=FOLIO&act=1 params are present
  useEffect(() => {
    const f = searchParams.get("f");
    const act = searchParams.get("act");
    if (f && act === "1") {
      setInput(f.toUpperCase());
      buscarFolio(f.toUpperCase());
    }
  }, [searchParams, buscarFolio]);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const val = input.trim().toUpperCase();
    if (!val) return;
    await buscarFolio(val);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Consultar Boleto</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Ingresa tu folio, número de celular o número de boleto para ver el estado de tus boletos.
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl p-4 mb-8">
        <div className="flex-shrink-0 w-6 h-6 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-amber-500" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-1">Importante</p>
          <p className="text-amber-700 dark:text-amber-400 text-sm leading-relaxed">
            Si ya realizaste tu pago por transferencia, <strong>por favor no realices el pago en línea</strong>.
            Espera confirmación por parte de nuestro equipo.
          </p>
        </div>
      </div>

      {/* Search form */}
      <form onSubmit={buscar} className="mb-8">
        <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
          Folio, celular o número de boleto
        </label>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="JNS-XXXXXX, 5512345678 o 042"
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            )}
            {loading ? "Buscando" : "Buscar"}
          </button>
        </div>
      </form>

      {error && (
        <div className="flex gap-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4 text-red-700 dark:text-red-300 text-sm mb-6">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
          {error}
        </div>
      )}

      {results && results.map(({ boleto, rifa }) => (
        <BoletoCard key={boleto.id} boleto={boleto} rifa={rifa} />
      ))}
    </div>
  );
}

function BoletoCard({ boleto, rifa }: { boleto: Boleto; rifa: Rifa | null }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    await downloadComprobante(boleto, rifa?.nombre ?? "Sorteos Jans");
    setDownloading(false);
  }

  const status = boleto.status;

  const statusConfig = {
    pagado:    { label: "Pago confirmado",  gradient: "from-green-600 to-emerald-500", badge: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700" },
    cancelado: { label: "Cancelado",        gradient: "from-slate-500 to-slate-600",   badge: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600" },
    pendiente: { label: "Pendiente de pago",gradient: "from-amber-500 to-orange-400",  badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700" },
  }[status];

  const fechaApartado = boleto.created_at?.toDate?.()?.toLocaleDateString("es-MX", { dateStyle: "medium" }) ?? "—";
  const horaApartado  = boleto.created_at?.toDate?.()?.toLocaleTimeString("es-MX", { timeStyle: "short" }) ?? "";
  const fechaPago     = boleto.fecha_pago?.toDate?.()?.toLocaleDateString("es-MX", { dateStyle: "medium" }) ?? null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">

      {/* ── Header ── */}
      <div className={`bg-gradient-to-r ${statusConfig.gradient} px-5 py-4 flex items-center justify-between`}>
        <div>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Folio</p>
          <p className="text-white font-black text-2xl tracking-wider leading-none">{boleto.folio}</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${statusConfig.badge}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* ── Sorteo ── */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Sorteo</p>
        <p className="font-bold text-base text-slate-800 dark:text-slate-100">{rifa?.nombre ?? boleto.rifa_id}</p>
      </div>

      <div className="p-5 space-y-5">

        {/* ── Info grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Nombre</p>
            <p className="font-bold text-slate-800 dark:text-slate-100">{boleto.nombre}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Apellidos</p>
            <p className="font-bold text-slate-800 dark:text-slate-100">{boleto.apellidos}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Estado</p>
            <p className="font-bold text-slate-800 dark:text-slate-100">{boleto.estado}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Fecha apartado</p>
            <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">{fechaApartado}</p>
            {horaApartado && <p className="text-xs text-slate-400">{horaApartado}</p>}
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Fecha de pago</p>
            <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">{fechaPago ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Total</p>
            <p className="font-black text-red-600 dark:text-red-400">${boleto.precio_total.toLocaleString("es-MX")} MXN</p>
          </div>
        </div>

        {/* ── Números + Oportunidades ── */}
        <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">
              Números ({boleto.numeros.length})
            </p>
            {boleto.oportunidades != null && (
              <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {boleto.oportunidades} oportunidades
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {boleto.numeros.map((n) => (
              <span
                key={n}
                className="inline-flex items-center justify-center min-w-[2.5rem] h-10 px-2 rounded-xl bg-white dark:bg-slate-800 text-red-700 dark:text-red-300 font-black text-sm border-2 border-red-200 dark:border-red-800 shadow-sm"
              >
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* ── Notices ── */}
        {status === "pendiente" && (
          <div className="flex gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
              Tu boleto está apartado. Una vez que realices tu pago, nuestro equipo lo confirmará y el estado cambiará a <strong>Pago confirmado</strong>.
            </p>
          </div>
        )}
        {status === "cancelado" && (
          <div className="flex gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
              Este boleto fue cancelado y sus números ya están disponibles nuevamente. Si tienes dudas, contacta a nuestro equipo.
            </p>
          </div>
        )}

        {/* ── Download ── */}
        {status !== "cancelado" && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3 border-2 border-red-500 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
            </svg>
            {downloading ? "Generando PDF..." : "Descargar comprobante PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
