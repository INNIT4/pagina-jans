"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getBoletoByFolio, getBoletosByCelular, getBoletosByNumero, getRifa, Boleto, Rifa } from "@/lib/firestore";
import { downloadComprobante } from "@/lib/pdf";
import { getRotatedWhatsApp, buildWhatsAppUrl } from "@/lib/whatsapp";
import BankCards from "@/components/BankCards";

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
    <div className="max-w-3xl mx-auto px-4 py-12">
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

      {results && (
        <>
          <ResultsSummary results={results} />
          {results.map(({ boleto, rifa }) => (
            <BoletoCard key={boleto.id} boleto={boleto} rifa={rifa} />
          ))}
          {results.some((r) => r.boleto.status === "pendiente") && (
            <div className="mt-2">
              <div className="border-t border-slate-200 dark:border-slate-700 my-8" />
              <h2 className="text-2xl font-black mb-1">Realiza tu pago</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Transfiere el monto exacto a cualquiera de las siguientes cuentas e indica tu folio en el concepto.
              </p>
              <BankCards />
              <div className="mt-6 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl p-5">
                <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-2">Instrucciones de pago</h3>
                <ol className="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-decimal list-inside">
                  <li>Elige cualquiera de las cuentas bancarias de arriba.</li>
                  <li>Realiza la transferencia por el monto exacto de tu boleto.</li>
                  <li>En el campo concepto/referencia escribe tu folio.</li>
                  <li>Envíanos el comprobante por WhatsApp para agilizar la confirmación.</li>
                  <li>Una vez verificado, tu estado cambiará a <strong>Pago confirmado</strong>.</li>
                </ol>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Multi-result summary ─────────────────────────────────────────────────────

function ResultsSummary({ results }: { results: Result[] }) {
  if (results.length <= 1) return null;
  const pagados   = results.filter((r) => r.boleto.status === "pagado").length;
  const pendientes = results.filter((r) => r.boleto.status === "pendiente").length;
  const cancelados = results.filter((r) => r.boleto.status === "cancelado").length;
  const totalNums  = results.reduce((s, r) => s + r.boleto.numeros.length, 0);
  const totalPago  = results
    .filter((r) => r.boleto.status !== "cancelado")
    .reduce((s, r) => s + r.boleto.precio_total, 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow p-5 mb-6">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
        Resumen — {results.length} boleto{results.length > 1 ? "s" : ""} encontrado{results.length > 1 ? "s" : ""}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Chip label="Total boletos"  value={String(results.length)}          color="slate" />
        <Chip label="Números"        value={String(totalNums)}               color="red"   />
        <Chip label="Pagados"        value={String(pagados)}                 color="green" />
        <Chip label="Pendientes"     value={String(pendientes)}              color="amber" />
        <Chip label="Monto activo"   value={`$${totalPago.toLocaleString("es-MX")}`} color="blue" />
      </div>
      {cancelados > 0 && (
        <p className="text-xs text-slate-400 mt-3">{cancelados} boleto{cancelados > 1 ? "s" : ""} cancelado{cancelados > 1 ? "s" : ""} no incluido{cancelados > 1 ? "s" : ""} en el monto.</p>
      )}
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: "slate" | "red" | "green" | "amber" | "blue" }) {
  const styles: Record<string, string> = {
    slate: "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200",
    red:   "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    green: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300",
    blue:  "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  };
  return (
    <div className={`rounded-xl px-3 py-2 ${styles[color]}`}>
      <p className="text-xs opacity-70 mb-0.5">{label}</p>
      <p className="font-black text-base leading-none">{value}</p>
    </div>
  );
}

// ─── Boleto card ──────────────────────────────────────────────────────────────

function BoletoCard({ boleto, rifa }: { boleto: Boleto; rifa: Rifa | null }) {
  const [downloading, setDownloading] = useState(false);
  const [waLoading, setWaLoading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    await downloadComprobante(boleto, rifa?.nombre ?? "Sorteos Jans");
    setDownloading(false);
  }

  async function handleWhatsApp() {
    setWaLoading(true);
    try {
      const numero = await getRotatedWhatsApp();
      if (!numero) { alert("No hay número de WhatsApp configurado."); return; }
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://srtsjans.com";
      const fecha = boleto.created_at?.toDate?.()?.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) ?? new Date().toLocaleString("es-MX");
      const rifaNombre = rifa?.nombre ?? "Sorteos Jans";
      const message =
        `👋 Hola, soy ${boleto.nombre} ${boleto.apellidos}\nSeleccioné: ${boleto.numeros.length} números\n──────────────\n` +
        `🎫 Números: ${boleto.numeros.join(", ")}\n🎯 Sorteo: ${rifaNombre}\n🏷️ Folio: ${boleto.folio}\n` +
        `📅 Fecha: ${fecha}\n💰 Total: $${boleto.precio_total.toLocaleString("es-MX")}\n──────────────\n` +
        `💳 Métodos de pago: ${siteUrl}/tarjetas\n🏷️ Consulta: ${siteUrl}/consulta?f=${boleto.folio}&act=1`;
      window.open(buildWhatsAppUrl(numero, message), "_blank");
    } catch {
      alert("Error al abrir WhatsApp. Intenta de nuevo.");
    }
    setWaLoading(false);
  }

  const status = boleto.status;

  const fecha = boleto.created_at?.toDate?.()?.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }) ?? "—";

  const fechaSorteo = rifa?.fecha_sorteo
    ? new Date(rifa.fecha_sorteo).toLocaleDateString("es-MX", { dateStyle: "medium" })
    : null;

  const headerGradient =
    status === "pagado"    ? "bg-gradient-to-br from-green-700 to-green-500" :
    status === "cancelado" ? "bg-gradient-to-br from-slate-700 to-slate-500" :
                             "bg-gradient-to-br from-amber-600 to-amber-400";

  const statusLabel =
    status === "pagado"    ? "Pago confirmado" :
    status === "cancelado" ? "Boleto cancelado" :
                             "Pendiente de pago";

  const statusIcon =
    status === "pagado" ? (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ) : status === "cancelado" ? (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ) : (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );

  const numChipColor =
    status === "pagado"    ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700" :
    status === "cancelado" ? "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 line-through" :
                             "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden mb-6">

      {/* ── Header ── */}
      <div className={`${headerGradient} px-6 py-5`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
              {statusIcon}
            </div>
            <div>
              <p className="text-white/70 text-xs font-medium">Estado</p>
              <p className="text-white font-black text-lg leading-tight">{statusLabel}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-white/70 text-xs">Folio</p>
            <p className="text-white font-black text-xl tracking-wider font-mono">{boleto.folio}</p>
          </div>
        </div>

        {/* ── 4-stat grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <StatTile label="Total"       value={`$${boleto.precio_total.toLocaleString("es-MX")}`} />
          <StatTile label="Boletos"     value={String(boleto.numeros.length)} />
          <StatTile label="Apartado"    value={fecha} small />
          {fechaSorteo
            ? <StatTile label="Fecha sorteo" value={fechaSorteo} small />
            : <StatTile label="Sorteo"       value={rifa?.nombre ?? "—"} small />
          }
        </div>
      </div>

      {/* ── Notice banners ── */}
      {status === "pendiente" && (
        <div className="mx-5 mt-4 flex gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
            Tu boleto está apartado. Una vez que realices tu pago por transferencia, nuestro equipo lo confirmará y el estado cambiará a <strong>Pago confirmado</strong>.
          </p>
        </div>
      )}
      {status === "cancelado" && (
        <div className="mx-5 mt-4 flex gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
            Este boleto fue cancelado y sus números ya están disponibles nuevamente. Si tienes dudas, contacta a nuestro equipo.
          </p>
        </div>
      )}

      {/* ── Body grid ── */}
      <div className="p-5 space-y-5">

        {/* Titular + meta */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InfoCell label="Titular" value={`${boleto.nombre} ${boleto.apellidos}`} wide />
          <InfoCell label="Celular"    value={boleto.celular} mono />
          <InfoCell label="Estado"     value={boleto.estado || "—"} />
          <InfoCell label="Apartado el" value={fecha} />
          {rifa?.nombre && (
            <InfoCell label="Sorteo" value={rifa.nombre} wide />
          )}
          {fechaSorteo && (
            <InfoCell label="Fecha sorteo" value={fechaSorteo} />
          )}
          {boleto.descuento_aplicado > 0 && (
            <div className="col-span-2 sm:col-span-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-3 py-2">
              <p className="text-xs text-green-600 dark:text-green-400 mb-0.5">Descuento aplicado</p>
              <p className="font-black text-green-700 dark:text-green-300">
                {boleto.descuento_aplicado}%
                {boleto.codigo_descuento && (
                  <span className="text-xs font-mono ml-1 opacity-70">({boleto.codigo_descuento})</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-700" />

        {/* Numbers grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Números seleccionados
            </p>
            <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
              {boleto.numeros.length} {boleto.numeros.length === 1 ? "número" : "números"}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...boleto.numeros].sort((a, b) => a - b).map((n) => (
              <span
                key={n}
                className={`inline-flex items-center justify-center min-w-[2.5rem] h-10 px-2 rounded-xl font-bold text-sm border ${numChipColor}`}
              >
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        {status !== "cancelado" && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleWhatsApp}
              disabled={waLoading}
              className="flex-1 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              {waLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              )}
              {waLoading ? "Abriendo..." : "Enviar por WhatsApp"}
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 py-3 border-2 border-red-500 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {downloading ? (
                <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
                </svg>
              )}
              {downloading ? "Generando PDF..." : "Descargar comprobante PDF"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-white/15 rounded-xl px-3 py-2">
      <p className="text-white/60 text-xs leading-none mb-1">{label}</p>
      <p className={`text-white font-black leading-tight ${small ? "text-sm" : "text-base"}`}>{value}</p>
    </div>
  );
}

function InfoCell({ label, value, wide, mono }: { label: string; value: string; wide?: boolean; mono?: boolean }) {
  return (
    <div className={wide ? "col-span-2 sm:col-span-1" : ""}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`font-semibold text-sm text-slate-800 dark:text-slate-100 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
