"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getBoletoByFolio, getBoletosByCelular, getRifa, Boleto, Rifa } from "@/lib/firestore";
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

      if (val.startsWith("JNS-") || !val.match(/^\d+$/)) {
        const b = await getBoletoByFolio(val);
        if (b) boletos = [b];
      } else {
        boletos = await getBoletosByCelular(val);
      }

      if (boletos.length === 0) {
        setError("No encontramos ningún boleto con ese dato. Verifica el folio o celular.");
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
          Ingresa tu folio o número de celular para ver el estado de tus boletos.
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
          Folio o número de celular
        </label>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="JNS-XXXXXX o 5512345678"
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
  const fecha = boleto.created_at?.toDate?.()?.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }) ?? "—";

  const headerGradient =
    status === "pagado"    ? "bg-gradient-to-r from-green-600 to-green-500" :
    status === "cancelado" ? "bg-gradient-to-r from-slate-600 to-slate-500" :
                             "bg-gradient-to-r from-amber-500 to-amber-400";

  const statusLabel =
    status === "pagado"    ? "Pago confirmado" :
    status === "cancelado" ? "Boleto cancelado" :
                             "Pendiente de pago";

  const statusIcon =
    status === "pagado" ? (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ) : status === "cancelado" ? (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ) : (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden mb-6">

      {/* Status header bar */}
      <div className={`px-6 py-4 flex items-center justify-between ${headerGradient}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            {statusIcon}
          </div>
          <div>
            <p className="text-white/70 text-xs font-medium">Estado del boleto</p>
            <p className="text-white font-black text-lg leading-none">{statusLabel}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/70 text-xs">Folio</p>
          <p className="text-white font-black text-xl tracking-wider">{boleto.folio}</p>
        </div>
      </div>

      {/* Pending notice */}
      {status === "pendiente" && (
        <div className="mx-6 mt-4 flex gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
            Tu boleto está apartado. Una vez que realices tu pago por transferencia, nuestro equipo lo confirmará y el estado cambiará a <strong>Pago confirmado</strong>.
          </p>
        </div>
      )}

      {/* Cancelled notice */}
      {status === "cancelado" && (
        <div className="mx-6 mt-4 flex gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
            Este boleto fue cancelado y sus números ya están disponibles nuevamente. Si tienes dudas, contacta a nuestro equipo.
          </p>
        </div>
      )}

      {/* Details */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Sorteo</p>
            <p className="font-bold text-base">{rifa?.nombre ?? boleto.rifa_id}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Titular</p>
            <p className="font-bold text-base">{boleto.nombre} {boleto.apellidos}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Total</p>
            <p className="font-black text-lg text-red-600 dark:text-red-400">
              ${boleto.precio_total.toLocaleString("es-MX")} MXN
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Apartado el</p>
            <p className="font-semibold text-sm">{fecha}</p>
          </div>
        </div>

        {/* Numbers */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Números seleccionados ({boleto.numeros.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {boleto.numeros.map((n) => (
              <span
                key={n}
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold text-sm border border-red-100 dark:border-red-800"
              >
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* Download button — hidden for cancelled boletos */}
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
