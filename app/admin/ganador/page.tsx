"use client";

import { useEffect, useRef, useState } from "react";
import { getBoletoByFolio, getBoletosByNumero, getRifas, Boleto, Rifa } from "@/lib/firestore";
import { toPng } from "html-to-image";
import { Search, Download, Trophy, ChevronDown } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  pagado: "PAGADO",
  pendiente: "PENDIENTE",
  cancelado: "CANCELADO",
};

function fmtDate(ts: import("firebase/firestore").Timestamp | undefined): string {
  if (!ts) return "—";
  const d = ts.toDate();
  return d
    .toLocaleString("es-MX", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .toUpperCase();
}

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export default function GanadorPage() {
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [selectedRifa, setSelectedRifa] = useState<Rifa | null>(null);
  const [prizeImg, setPrizeImg] = useState<string>("");
  const [logoB64, setLogoB64] = useState<string>("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [boleto, setBoleto] = useState<Boleto | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getRifas().then((all) => {
      const sorted = all.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setRifas(sorted);
    });
    toBase64("/images/3.jpeg").then(setLogoB64).catch(() => {});
  }, []);

  async function selectRifa(rifaId: string) {
    const rifa = rifas.find((r) => r.id === rifaId) ?? null;
    setSelectedRifa(rifa);
    setPrizeImg("");
    setBoleto(null);
    setNotFound(false);
    if (rifa) {
      const imgUrl = rifa.imagenes_url?.[0] ?? rifa.imagen_url ?? "";
      if (imgUrl) {
        try {
          const b64 = await toBase64(imgUrl);
          setPrizeImg(b64);
        } catch {
          setPrizeImg(imgUrl);
        }
      }
    }
  }

  async function buscar() {
    const q = query.trim();
    if (!q || !selectedRifa) return;
    setLoading(true);
    setNotFound(false);
    setBoleto(null);

    try {
      let found: Boleto | null = null;

      if (q.toUpperCase().startsWith("JNS-")) {
        found = await getBoletoByFolio(q.toUpperCase());
      } else {
        const num = parseInt(q);
        if (!isNaN(num)) {
          const results = await getBoletosByNumero(num);
          found =
            results.find((b) => b.status === "pagado" && b.rifa_id === selectedRifa.id) ??
            results.find((b) => b.rifa_id === selectedRifa.id) ??
            results.find((b) => b.status === "pagado") ??
            results[0] ??
            null;
        }
      }

      if (found) {
        setBoleto(found);
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function descargar() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, skipFonts: false });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `ganador-${boleto?.folio ?? "jans"}.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  }

  const numero = boleto?.numeros?.[0] ?? null;
  const sorteoNombre = (selectedRifa?.nombre ?? "SORTEO JANS").toUpperCase();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <Trophy className="text-yellow-500" size={36} />
          Anunciar Ganador
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Selecciona el sorteo, luego busca el boleto ganador.
        </p>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-5">
        {/* Step 1 — pick sorteo */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            1. Sorteo
          </label>
          <div className="relative">
            <select
              value={selectedRifa?.id ?? ""}
              onChange={(e) => selectRifa(e.target.value)}
              className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-10 text-base font-semibold focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
            >
              <option value="">— Selecciona un sorteo —</option>
              {rifas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}{r.activa ? " (activa)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>

        {/* Step 2 — search boleto */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            2. Boleto ganador
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
              placeholder="Folio (JNS-XXXXXX) o número"
              disabled={!selectedRifa}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-lg font-mono focus:ring-2 focus:ring-yellow-400 outline-none transition-all disabled:opacity-40"
            />
            <button
              onClick={buscar}
              disabled={loading || !query.trim() || !selectedRifa}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-bold rounded-xl transition-all shadow-sm"
            >
              <Search size={18} />
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
          {notFound && (
            <p className="mt-3 text-sm text-red-500 font-medium">
              No se encontró ningún boleto con ese folio o número.
            </p>
          )}
        </div>
      </div>

      {/* Card preview */}
      {boleto && selectedRifa && (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <div
              ref={cardRef}
              style={{
                width: "420px",
                background: "#ffffff",
                fontFamily: "'Arial', 'Helvetica', sans-serif",
                display: "flex",
                flexDirection: "row",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
              }}
            >
              {/* Left red bar */}
              <div
                style={{
                  width: "36px",
                  background: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {sorteoNombre}
                </span>
              </div>

              {/* Center content */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Header */}
                <div
                  style={{
                    padding: "18px 20px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    borderBottom: "2px dashed #e5e7eb",
                  }}
                >
                  {logoB64 && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoB64}
                      alt="Sorteos Jans"
                      style={{ width: "52px", height: "52px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  )}
                  <p style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#111827", letterSpacing: "0.05em" }}>
                    SORTEOS JANS
                  </p>
                </div>

                {/* Boleto number */}
                <div style={{ padding: "14px 20px", borderBottom: "2px dashed #e5e7eb" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>Boleto:</span>
                    <span style={{ fontSize: "36px", fontWeight: 900, color: "#dc2626", lineHeight: 1 }}>
                      {numero !== null ? String(numero) : "—"}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#dc2626", fontWeight: 600, fontFamily: "monospace" }}>
                    {boleto.folio}
                  </p>
                </div>

                {/* Data rows */}
                <div style={{ padding: "14px 20px 4px", borderBottom: "2px dashed #e5e7eb" }}>
                  {[
                    { label: "SORTEO:", value: sorteoNombre },
                    { label: "NOMBRE:", value: boleto.nombre.toUpperCase() },
                    { label: "APELLIDO:", value: boleto.apellidos.toUpperCase() },
                    { label: "PAGADO:", value: STATUS_LABEL[boleto.status] ?? boleto.status.toUpperCase() },
                    { label: "COMPRA:", value: fmtDate(boleto.created_at) },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "baseline" }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 900,
                          color: "#111827",
                          letterSpacing: "0.06em",
                          minWidth: "76px",
                          flexShrink: 0,
                        }}
                      >
                        {label}
                      </span>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "#dc2626", letterSpacing: "0.04em" }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Prize image */}
                {prizeImg ? (
                  <div style={{ width: "100%", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={prizeImg}
                      alt="Premio"
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  </div>
                ) : (
                  <div style={{ height: "20px" }} />
                )}

                {/* Footer */}
                <div style={{ background: "#dc2626", padding: "12px 20px", textAlign: "center" }}>
                  <p style={{ margin: 0, color: "#ffffff", fontSize: "15px", fontWeight: 900, letterSpacing: "0.1em" }}>
                    ¡FELICIDADES!
                  </p>
                </div>
              </div>

              {/* Right red bar */}
              <div
                style={{
                  width: "36px",
                  background: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    writingMode: "vertical-lr",
                    whiteSpace: "nowrap",
                  }}
                >
                  {sorteoNombre}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={descargar}
            disabled={downloading}
            className="flex items-center gap-2 px-8 py-3 bg-slate-900 dark:bg-yellow-400 hover:bg-slate-800 dark:hover:bg-yellow-500 disabled:opacity-50 text-white dark:text-black font-bold rounded-xl transition-all shadow-sm"
          >
            <Download size={18} />
            {downloading ? "Generando imagen..." : "Descargar imagen"}
          </button>
        </div>
      )}
    </div>
  );
}
