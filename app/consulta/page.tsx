"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getRifa, getComprobanteByFolio, Boleto, Rifa, Comprobante, getBankAccounts, BankAccount } from "@/lib/firestore";
import { downloadComprobante } from "@/lib/pdf";
import { getRotatedWhatsApp, buildWhatsAppUrl } from "@/lib/whatsapp";
import BankCards from "@/components/BankCards";

interface Result {
  boleto: Boleto;
  rifa: Rifa | null;
}

// Tipo que devuelve /api/boletos/consulta (created_at como ms en lugar de Timestamp)
interface ApiBoleto {
  id: string;
  folio: string;
  rifa_id: string;
  numeros: number[];
  numeros_completos?: number[];
  nombre: string;
  apellidos: string;
  celular: string;
  estado: string;
  status: "pendiente" | "pagado" | "cancelado";
  precio_total: number;
  descuento_aplicado: number;
  codigo_descuento: string;
  created_at_ms: number | null;
}

function adaptBoleto(b: ApiBoleto): Boleto {
  return {
    ...b,
    // Reconstruir un objeto compatible con Timestamp para BoletoCard
    created_at: {
      toDate: () => new Date(b.created_at_ms ?? Date.now()),
    } as unknown as import("firebase/firestore").Timestamp,
  };
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
  const [searchedByCelular, setSearchedByCelular] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    getBankAccounts().then(data => setAccounts(data.filter(a => a.activo)));
  }, []);

  const buscarFolio = useCallback(async (val: string) => {
    setLoading(true);
    setError("");
    setResults(null);

    try {
      let param: string;
      let esCelular = false;

      const soloDigitos = /^\d+$/.test(val);
      if (!soloDigitos || val.startsWith("JNS-")) {
        param = `folio=${encodeURIComponent(val)}`;
      } else if (val.length === 10) {
        esCelular = true;
        param = `celular=${encodeURIComponent(val)}`;
      } else {
        param = `numero=${encodeURIComponent(val)}`;
      }

      const res = await fetch(`/api/boletos/consulta?${param}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Ocurrio un error al buscar. Intenta de nuevo.");
        setLoading(false);
        return;
      }

      const { boletos: rawBoletos } = await res.json() as { boletos: ApiBoleto[] };
      setSearchedByCelular(esCelular);

      if (rawBoletos.length === 0) {
        setError("No encontramos ningun boleto con ese dato. Verifica el folio, celular o numero de boleto.");
      } else {
        const all: Result[] = await Promise.all(
          rawBoletos.map(async (b) => {
            let rifa: Rifa | null = null;
            try { rifa = await getRifa(b.rifa_id); } catch {}
            return { boleto: adaptBoleto(b), rifa };
          })
        );

        // Bloquear consulta de rifas finalizadas (inactivas o con ganador)
        const activos = all.filter((r) => r.rifa?.activa && !r.rifa?.ganador);

        if (activos.length === 0) {
          setError("Este sorteo ya finalizo. No es posible consultar boletos de rifas pasadas.");
        } else {
          setResults(activos);
        }
      }
    } catch {
      setError("Ocurrio un error al buscar. Intenta de nuevo.");
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
        <h1 className="text-4xl font-bold uppercase tracking-widest mb-2">Consultar Boleto</h1>
        <span className="accent-bar" />
        <p className="text-gray-400 mt-4">
          Ingresa tu folio, numero de celular o numero de boleto para ver el estado de tus boletos.
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex gap-3 bg-amber-900/20 border border-amber-700 rounded-sm p-4 mb-8">
        <div className="flex-shrink-0 w-6 h-6 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-amber-500" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-amber-400 text-sm mb-1">Importante</p>
          <p className="text-amber-400/80 text-sm leading-relaxed">
            Si ya realizaste tu pago por transferencia, <strong>por favor no realices el pago en linea</strong>.
            Espera confirmacion por parte de nuestro equipo.
          </p>
        </div>
      </div>

      {/* Search form */}
      <form onSubmit={buscar} className="mb-8">
        <label className="block text-sm font-semibold mb-2 text-gray-300">
          Folio, celular o numero de boleto
        </label>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="JNS-XXXXXX, 5512345678 o 042"
            className="flex-1 rounded-sm border border-gray-700 bg-brand-dark px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-brand-red hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-sm transition-colors flex items-center gap-2"
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
        <div className="flex gap-3 bg-red-900/30 border border-red-700 rounded-sm p-4 text-red-300 text-sm mb-6">
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
            <BoletoCard key={boleto.id} boleto={boleto} rifa={rifa} showCelular={searchedByCelular} />
          ))}
          {showModal && (
            <ComprobanteModal
              results={results.filter((r) => r.boleto.status === "pendiente")}
              onClose={() => setShowModal(false)}
              accounts={accounts}
            />
          )}
          {results.some((r) => r.boleto.status === "pendiente") && (
            <div className="mt-2">
              <div className="flex justify-center mb-6">
                <button
                  onClick={() => setShowModal(true)}
                  className="animate-heartbeat flex items-center gap-3 px-7 py-3.5 bg-brand-red hover:bg-red-700 text-white font-bold rounded-sm shadow-lg text-base"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
                             2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
                             C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
                             c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  Subir comprobante de pago
                </button>
              </div>
              <div className="border-t border-gray-800 my-8" />
              <h2 className="text-2xl font-bold uppercase tracking-wider mb-1">Realiza tu pago</h2>
              <span className="accent-bar" />
              <p className="text-gray-400 text-sm mb-6 mt-4">
                Transfiere el monto exacto a cualquiera de las siguientes cuentas e indica tu folio en el concepto.
              </p>
              <BankCards accounts={accounts} />
              <div className="mt-6 bg-amber-900/20 border border-amber-700 rounded-sm p-5">
                <h3 className="font-bold text-amber-400 mb-2">Instrucciones de pago</h3>
                <ol className="text-sm text-amber-400/80 space-y-1 list-decimal list-inside">
                  <li>Elige cualquiera de las cuentas bancarias de arriba.</li>
                  <li>Realiza la transferencia por el monto exacto de tu boleto.</li>
                  <li>En el campo concepto/referencia escribe tu folio.</li>
                  <li>Envianos el comprobante por WhatsApp para agilizar la confirmacion.</li>
                  <li>Una vez verificado, tu estado cambiara a <strong>Pago confirmado</strong>.</li>
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
  const totalNums  = results.reduce((s, r) => s + (r.boleto.numeros_completos ?? r.boleto.numeros).length, 0);
  const totalPago  = results
    .filter((r) => r.boleto.status !== "cancelado")
    .reduce((s, r) => s + r.boleto.precio_total, 0);

  return (
    <div className="bg-brand-dark border border-gray-800 rounded-sm shadow p-5 mb-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
        Resumen — {results.length} boleto{results.length > 1 ? "s" : ""} encontrado{results.length > 1 ? "s" : ""}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Chip label="Total boletos"  value={String(results.length)}          color="slate" />
        <Chip label="Numeros"        value={String(totalNums)}               color="red"   />
        <Chip label="Pagados"        value={String(pagados)}                 color="green" />
        <Chip label="Pendientes"     value={String(pendientes)}              color="amber" />
        <Chip label="Monto activo"   value={`$${totalPago.toLocaleString("es-MX")}`} color="blue" />
      </div>
      {cancelados > 0 && (
        <p className="text-xs text-gray-500 mt-3">{cancelados} boleto{cancelados > 1 ? "s" : ""} cancelado{cancelados > 1 ? "s" : ""} no incluido{cancelados > 1 ? "s" : ""} en el monto.</p>
      )}
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: "slate" | "red" | "green" | "amber" | "blue" }) {
  const styles: Record<string, string> = {
    slate: "bg-gray-800 text-gray-200",
    red:   "bg-red-900/30 text-red-300",
    green: "bg-green-900/30 text-green-300",
    amber: "bg-amber-900/20 text-amber-300",
    blue:  "bg-blue-900/30 text-blue-300",
  };
  return (
    <div className={`rounded-sm px-3 py-2 ${styles[color]}`}>
      <p className="text-xs opacity-70 mb-0.5">{label}</p>
      <p className="font-bold text-base leading-none">{value}</p>
    </div>
  );
}

// ─── Boleto card ──────────────────────────────────────────────────────────────

function BoletoCard({ boleto, rifa, showCelular }: { boleto: Boleto; rifa: Rifa | null; showCelular?: boolean }) {
  const [downloading, setDownloading] = useState(false);
  const [waLoading, setWaLoading] = useState(false);
  const [comprobante, setComprobante] = useState<Comprobante | null>(null);

  useEffect(() => {
    if (boleto.status !== "pendiente") return;
    getComprobanteByFolio(boleto.folio).then(setComprobante).catch(() => {});
  }, [boleto.folio, boleto.status]);

  async function handleDownload() {
    setDownloading(true);
    await downloadComprobante(boleto, rifa?.nombre ?? "Sorteos Jans");
    setDownloading(false);
  }

  async function handleWhatsApp() {
    // Abrir ventana en blanco sincronamente para evitar el bloqueo en iOS/Safari
    const newWindow = window.open("", "_blank");
    setWaLoading(true);
    try {
      const numero = await getRotatedWhatsApp();
      if (!numero) { 
        if (newWindow) newWindow.close();
        alert("No hay numero de WhatsApp configurado."); 
        setWaLoading(false);
        return; 
      }
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
      const fecha = boleto.created_at?.toDate?.()?.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) ?? new Date().toLocaleString("es-MX");
      const rifaNombre = rifa?.nombre ?? "Sorteos Jans";
      
      let textNumeros = (boleto.numeros_completos ?? boleto.numeros).join(", ");
      if (rifa && rifa.oportunidades && rifa.oportunidades > 1 && boleto.numeros) {
         const rango = (rifa.num_fin - rifa.num_inicio) + 1;
         textNumeros = boleto.numeros.map(n => {
            const extras = [];
            for (let i = 1; i < rifa.oportunidades!; i++) {
               extras.push(n + (i * rango));
            }
            return extras.length > 0 ? `${n} (${extras.join(", ")})` : `${n}`;
         }).join(", ");
      }
      
      const numsLength = (boleto.numeros_completos ?? boleto.numeros).length;
      const message =
        `👋 Hola, soy ${boleto.nombre} ${boleto.apellidos}\nSeleccione: ${numsLength} numeros\n──────────────\n` +
        `🎫 Numeros: ${textNumeros}\n🎯 Sorteo: ${rifaNombre}\n🏷️ Folio: ${boleto.folio}\n` +
        `📅 Fecha: ${fecha}\n💰 Total: $${boleto.precio_total.toLocaleString("es-MX")}\n──────────────\n` +
        `💳 Metodos de pago: ${siteUrl}/tarjetas\n🏷️ Consulta: ${siteUrl}/consulta?f=${boleto.folio}&act=1`;
      
      const targetUrl = buildWhatsAppUrl(numero, message);
      if (newWindow) {
        newWindow.location.href = targetUrl;
      } else {
        window.location.href = targetUrl;
      }
    } catch {
      if (newWindow) newWindow.close();
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
    status === "cancelado" ? "bg-gradient-to-br from-gray-700 to-gray-500" :
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
    status === "pagado"    ? "bg-green-900/40 text-green-200 border-green-700" :
    status === "cancelado" ? "bg-gray-800 text-gray-500 border-gray-700 line-through" :
                             "bg-red-900/30 text-red-300 border-red-800";

  return (
    <div className="bg-brand-dark border border-gray-800 rounded-sm shadow-lg overflow-hidden mb-6">

      {/* ── Header ── */}
      <div className={`${headerGradient} px-6 py-5`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-sm bg-white/20 flex items-center justify-center text-white flex-shrink-0">
              {statusIcon}
            </div>
            <div>
              <p className="text-white/70 text-xs font-medium">Estado</p>
              <p className="text-white font-bold text-lg leading-tight">{statusLabel}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-white/70 text-xs">Folio</p>
            <p className="text-white font-bold text-xl tracking-wider font-mono">{boleto.folio}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <StatTile label="Total"       value={`$${boleto.precio_total.toLocaleString("es-MX")}`} />
          <StatTile label="Boletos"     value={String((boleto.numeros_completos ?? boleto.numeros).length)} />
          <StatTile label="Apartado"    value={fecha} small />
          {fechaSorteo
            ? <StatTile label="Fecha sorteo" value={fechaSorteo} small />
            : <StatTile label="Sorteo"       value={rifa?.nombre ?? "—"} small />
          }
        </div>
      </div>

      {/* ── Notice banners ── */}
      {status === "pendiente" && (
        <div className="mx-5 mt-4 flex gap-2 bg-amber-900/20 border border-amber-700 rounded-sm px-4 py-3">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-amber-400/80 text-xs leading-relaxed">
            Tu boleto esta apartado. Una vez que realices tu pago por transferencia, nuestro equipo lo confirmara y el estado cambiara a <strong>Pago confirmado</strong>.
          </p>
        </div>
      )}
      {status === "cancelado" && (
        <div className="mx-5 mt-4 flex gap-2 bg-gray-800/50 border border-gray-700 rounded-sm px-4 py-3">
          <svg className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-gray-400 text-xs leading-relaxed">
            Este boleto fue cancelado y sus numeros ya estan disponibles nuevamente. Si tienes dudas, contacta a nuestro equipo.
          </p>
        </div>
      )}

      {/* ── Body grid ── */}
      <div className="p-5 space-y-5">

        {/* Titular + meta */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InfoCell label="Titular" value={`${boleto.nombre} ${boleto.apellidos}`} wide />
          {showCelular && <InfoCell label="Celular" value={boleto.celular} mono />}
          <InfoCell label="Estado"     value={boleto.estado || "—"} />
          <InfoCell label="Apartado el" value={fecha} />
          {rifa?.nombre && (
            <InfoCell label="Sorteo" value={rifa.nombre} wide />
          )}
          {fechaSorteo && (
            <InfoCell label="Fecha sorteo" value={fechaSorteo} />
          )}
          {boleto.descuento_aplicado > 0 && (
            <div className="col-span-2 sm:col-span-1 bg-green-900/20 border border-green-700 rounded-sm px-3 py-2">
              <p className="text-xs text-green-400 mb-0.5">Descuento aplicado</p>
              <p className="font-bold text-green-300">
                {boleto.descuento_aplicado}%
                {boleto.codigo_descuento && (
                  <span className="text-xs font-mono ml-1 opacity-70">({boleto.codigo_descuento})</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800" />

        {/* Numbers grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Numeros seleccionados
            </p>
            <span className="text-xs font-bold bg-gray-800 text-gray-400 px-2 py-0.5 rounded-sm">
              {(boleto.numeros_completos ?? boleto.numeros).length} num{(boleto.numeros_completos ?? boleto.numeros).length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...(boleto.numeros_completos ?? boleto.numeros)].sort((a, b) => a - b).map((n) => (
              <span
                key={n}
                className={`inline-flex items-center justify-center min-w-[2.5rem] h-10 px-2 rounded-sm font-bold text-sm border ${numChipColor}`}
              >
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* Admin comment */}
        {comprobante?.admin_comentario && (
          <div className="border border-orange-700 bg-orange-900/20 rounded-sm p-4 space-y-2">
            <p className="text-xs font-bold text-orange-300 uppercase tracking-widest">
              Comentario del administrador
            </p>
            <p className="text-xs text-orange-400">
              [{comprobante.admin_comentario.created_at.toDate().toLocaleString("es-MX", {
                timeZone: "America/Mexico_City",
                day: "2-digit", month: "short", year: "2-digit",
                hour: "2-digit", minute: "2-digit", hour12: false,
              })} hora CDMX]
            </p>
            <a
              href={comprobante.archivo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-300 underline underline-offset-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Ver comprobante enviado
            </a>
            <p className="text-sm font-semibold text-orange-200">
              {comprobante.admin_comentario.texto}
            </p>
          </div>
        )}

        {/* Actions */}
        {status !== "cancelado" && (
          <div className="flex flex-col sm:flex-row gap-3">
            {status !== "pagado" && (
              <button
                onClick={handleWhatsApp}
                disabled={waLoading}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-sm transition-colors text-sm flex items-center justify-center gap-2"
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
            )}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 py-3 border-2 border-brand-red text-brand-red font-bold rounded-sm hover:bg-brand-red/10 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {downloading ? (
                <span className="w-4 h-4 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
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
    <div className="bg-white/15 rounded-sm px-3 py-2">
      <p className="text-white/60 text-xs leading-none mb-1">{label}</p>
      <p className={`text-white font-bold leading-tight ${small ? "text-sm" : "text-base"}`}>{value}</p>
    </div>
  );
}

function InfoCell({ label, value, wide, mono }: { label: string; value: string; wide?: boolean; mono?: boolean }) {
  return (
    <div className={wide ? "col-span-2 sm:col-span-1" : ""}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`font-semibold text-sm text-white ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

// ─── Comprobante Modal ─────────────────────────────────────────────────────────

function ComprobanteModal({ results, onClose, accounts }: { results: Result[]; onClose: () => void; accounts: BankAccount[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const nombre = results[0]?.boleto
    ? `${results[0].boleto.nombre} ${results[0].boleto.apellidos}`
    : "";
  const folios = results.map((r) => r.boleto.folio);
  const totalNums = results.reduce((s, r) => s + (r.boleto.numeros_completos ?? r.boleto.numeros).length, 0);
  const montoTotal = results.reduce((s, r) => s + r.boleto.precio_total, 0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function validateFile(f: File): string | null {
    const allowed = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
    if (!allowed.includes(f.type)) return "Solo se permiten JPG, PNG, GIF o PDF.";
    const maxSize = f.type === "application/pdf" ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (f.size > maxSize)
      return `El archivo supera el limite de ${f.type === "application/pdf" ? "10" : "5"} MB.`;
    return null;
  }

  function pickFile(f: File) {
    const e = validateFile(f);
    if (e) { setErr(e); return; }
    setErr("");
    setFile(f);
  }

  async function handleSubmit() {
    if (!file) return;
    setUploading(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("nombre", nombre);
      fd.append("folios", JSON.stringify(folios));
      fd.append("monto_total", String(montoTotal));
      
      const res = await fetch("/api/comprobantes/upload", { method: "POST", body: fd });
      
      // Prevent crash if Vercel router returns an HTML error page (e.g., 413 Payload Too Large)
      const isJson = res.headers.get("content-type")?.includes("application/json");
      if (!isJson) {
        if (res.status === 413) {
          setErr("El archivo es demasiado grande para el servidor (Max 4.5MB).");
        } else {
          setErr(`Error del servidor (${res.status}). Intenta mas tarde o contactanos.`);
        }
        setUploading(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Error al subir."); return; }
      setSuccess(true);
    } catch (e) {
      console.error(e);
      setErr("Error de conexion o servidor inalcanzable. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-brand-dark border border-gray-800 rounded-sm w-full max-w-[520px] max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Red top strip */}
        <div className="h-1 bg-brand-red flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-brand-red/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-red" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-lg text-white leading-tight">Subir comprobante</h2>
              <p className="text-xs text-gray-500">de pago</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {success ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-900/40 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-xl text-white mb-1">¡Comprobante enviado!</p>
                <p className="text-sm text-gray-400">
                  Nuestro equipo revisara tu pago y actualizara el estado de tu boleto.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-sm transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              {/* Resumen */}
              <div className="bg-gray-800/50 rounded-sm p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Titular</span>
                  <span className="font-semibold text-white">{nombre}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500 flex-shrink-0">Folio{folios.length > 1 ? "s" : ""}</span>
                  <span className="font-mono font-bold text-brand-red text-right break-all">
                    {folios.join(", ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Numeros</span>
                  <span className="font-semibold text-white">{totalNums}</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                  <span className="font-bold text-gray-300">Total a pagar</span>
                  <span className="font-bold text-brand-red">${montoTotal.toLocaleString("es-MX")}</span>
                </div>
              </div>

              {/* Upload area */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                  Archivo comprobante
                </p>
                {!file ? (
                  <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      const f = e.dataTransfer.files[0];
                      if (f) pickFile(f);
                    }}
                    className={`border-2 border-dashed rounded-sm px-6 py-8 text-center cursor-pointer transition-colors ${
                      dragging
                        ? "border-brand-red bg-brand-red/10"
                        : "border-gray-700 hover:border-brand-red/50 hover:bg-gray-800/30"
                    }`}
                  >
                    <svg className="w-10 h-10 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-semibold text-gray-300 mb-1">
                      Haz clic o arrastra tu archivo aqui
                    </p>
                    <p className="text-xs text-gray-600">JPG, PNG, GIF hasta 5 MB · PDF hasta 10 MB</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-gray-800/50 border border-gray-700 rounded-sm px-4 py-3">
                    <svg className="w-5 h-5 text-brand-red flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-sm font-medium text-white flex-1 truncate">{file.name}</span>
                    <button
                      onClick={() => setFile(null)}
                      className="text-gray-500 hover:text-white flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickFile(f);
                    e.target.value = "";
                  }}
                />
              </div>

              {err && (
                <div className="flex gap-2 bg-red-900/30 border border-red-700 rounded-sm px-4 py-3 text-red-300 text-sm">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                  </svg>
                  {err}
                </div>
              )}

              {file && (
                <button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="w-full py-3.5 bg-brand-red hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-sm transition-colors flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar comprobante"
                  )}
                </button>
              )}

              {/* Payment instructions */}
              <div className="bg-amber-900/20 border border-amber-700 rounded-sm p-5">
                <h3 className="font-bold text-amber-400 mb-2">Instrucciones de pago</h3>
                <ol className="text-sm text-amber-400/80 space-y-1 list-decimal list-inside">
                  <li>Elige cualquiera de las cuentas bancarias de abajo.</li>
                  <li>Realiza la transferencia por el monto exacto de tu boleto.</li>
                  <li>En el campo concepto/referencia escribe tu folio.</li>
                  <li>Sube aqui tu comprobante de pago.</li>
                  <li>Una vez verificado, tu estado cambiara a <strong>Pago confirmado</strong>.</li>
                </ol>
              </div>

              <BankCards accounts={accounts} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
