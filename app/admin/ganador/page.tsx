"use client";

import { useEffect, useRef, useState } from "react";
import { getBoletoByFolio, getBoletosByNumero, getRifas, Boleto, Rifa } from "@/lib/firestore";
import { toPng } from "html-to-image";
import { Search, Download, Trophy, ChevronDown, ArrowLeft } from "lucide-react";
import Link from "next/link";

type CardStatus = "pagado" | "pendiente" | "cancelado" | "no_vendido";

const STATUS_CONFIG: Record<CardStatus, { label: string; color: string; bg: string }> = {
  pagado:    { label: "PAGADO",     color: "#16a34a", bg: "#dcfce7" },
  pendiente: { label: "PENDIENTE",  color: "#d97706", bg: "#fef3c7" },
  cancelado: { label: "CANCELADO",  color: "#6b7280", bg: "#f3f4f6" },
  no_vendido:{ label: "NO VENDIDO", color: "#6b7280", bg: "#f3f4f6" },
};

const STATUS_PRIORITY: Record<CardStatus, number> = { pagado: 0, pendiente: 1, cancelado: 2, no_vendido: 3 };

function fmtDate(ts: import("firebase/firestore").Timestamp | undefined): string {
  if (!ts) return "—";
  return ts.toDate()
    .toLocaleString("es-MX", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
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

type PremioState = {
  query: string;
  boleto: Boleto | null;
  searchedNum: number | null;
  shown: boolean;
  loading: boolean;
  downloading: boolean;
  prizeImg: string;
};

function emptyState(): PremioState {
  return { query: "", boleto: null, searchedNum: null, shown: false, loading: false, downloading: false, prizeImg: "" };
}

// ─── Single winner card (pure UI, no state) ─────────────────────────────────

function WinnerCard({
  cardRef,
  boleto,
  searchedNum,
  cardStatus,
  sorteoNombre,
  premioNombre,
  logoB64,
  prizeImg,
}: {
  cardRef: (el: HTMLDivElement | null) => void;
  boleto: Boleto | null;
  searchedNum: number | null;
  cardStatus: CardStatus;
  sorteoNombre: string;
  premioNombre: string;
  logoB64: string;
  prizeImg: string;
}) {
  const statusCfg = STATUS_CONFIG[cardStatus];
  const numero = searchedNum ?? boleto?.numeros?.[0] ?? null;

  return (
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
      {/* Left bar */}
      <div style={{ width: "36px", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ color: "#fff", fontSize: "11px", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap" }}>
          {sorteoNombre}
        </span>
      </div>

      {/* Center */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "2px dashed #e5e7eb" }}>
          {logoB64 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoB64} alt="Sorteos Jans" style={{ width: "52px", height: "52px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          )}
          <div>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#111827", letterSpacing: "0.05em" }}>SORTEOS JANS</p>
            {premioNombre && (
              <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#dc2626", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {premioNombre}
              </p>
            )}
          </div>
        </div>

        {/* Boleto number + status */}
        <div style={{ padding: "14px 20px", borderBottom: "2px dashed #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>Boleto: </span>
              <span style={{ fontSize: "36px", fontWeight: 900, color: "#dc2626", lineHeight: 1 }}>
                {numero !== null ? String(numero) : "—"}
              </span>
            </div>
            <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", padding: "4px 10px", borderRadius: "6px", background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}55` }}>
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Data rows */}
        <div style={{ padding: "14px 20px 4px", borderBottom: "2px dashed #e5e7eb" }}>
          {boleto ? (
            [
              { label: "SORTEO:",   value: sorteoNombre },
              { label: "NOMBRE:",   value: boleto.nombre.toUpperCase() },
              { label: "APELLIDO:", value: boleto.apellidos.toUpperCase() },
              { label: "PAGADO:",   value: STATUS_CONFIG[boleto.status as CardStatus]?.label ?? boleto.status.toUpperCase() },
              { label: "COMPRA:",   value: fmtDate(boleto.created_at) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "baseline" }}>
                <span style={{ fontSize: "11px", fontWeight: 900, color: "#111827", letterSpacing: "0.06em", minWidth: "76px", flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#dc2626", letterSpacing: "0.04em" }}>{value}</span>
              </div>
            ))
          ) : (
            <div style={{ padding: "8px 0 4px" }}>
              <div style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "baseline" }}>
                <span style={{ fontSize: "11px", fontWeight: 900, color: "#111827", letterSpacing: "0.06em", minWidth: "76px" }}>SORTEO:</span>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#dc2626" }}>{sorteoNombre}</span>
              </div>
              <p style={{ fontSize: "12px", color: "#9ca3af", fontStyle: "italic", marginBottom: "10px" }}>
                Este número no fue seleccionado por ningún participante.
              </p>
            </div>
          )}
        </div>

        {/* Prize image */}
        {prizeImg ? (
          <div style={{ width: "100%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={prizeImg} alt="Premio" style={{ width: "100%", height: "auto", display: "block", opacity: cardStatus === "no_vendido" ? 0.5 : 1 }} />
          </div>
        ) : (
          <div style={{ height: "20px" }} />
        )}

        {/* Footer */}
        <div style={{ background: statusCfg.color, padding: "12px 20px", textAlign: "center" }}>
          <p style={{ margin: 0, color: "#fff", fontSize: "15px", fontWeight: 900, letterSpacing: "0.1em" }}>
            {cardStatus === "pagado" ? "¡FELICIDADES!" : cardStatus === "pendiente" ? "PAGO PENDIENTE" : cardStatus === "cancelado" ? "BOLETO CANCELADO" : "NO VENDIDO"}
          </p>
        </div>
      </div>

      {/* Right bar */}
      <div style={{ width: "36px", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ color: "#fff", fontSize: "11px", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", writingMode: "vertical-lr", whiteSpace: "nowrap" }}>
          {sorteoNombre}
        </span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GanadorPage() {
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [selectedRifa, setSelectedRifa] = useState<Rifa | null>(null);
  const [selectedPremioKey, setSelectedPremioKey] = useState<string>("");
  const [logoB64, setLogoB64] = useState<string>("");
  const [rifaFallbackImg, setRifaFallbackImg] = useState<string>("");
  const [prizeImgCache, setPrizeImgCache] = useState<Record<string, string>>({});

  const [st, setSt] = useState<PremioState>(emptyState());
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getRifas().then((all) => setRifas(all.sort((a, b) => a.nombre.localeCompare(b.nombre))));
    toBase64("/images/3.jpeg").then(setLogoB64).catch(() => {});
  }, []);

  async function selectRifa(rifaId: string) {
    const rifa = rifas.find((r) => r.id === rifaId) ?? null;
    setSelectedRifa(rifa);
    setSelectedPremioKey("");
    setSt(emptyState());
    setPrizeImgCache({});

    if (!rifa) { setRifaFallbackImg(""); return; }

    const imgUrl = rifa.imagenes_url?.[0] ?? rifa.imagen_url ?? "";
    let fallback = "";
    if (imgUrl) {
      try { fallback = await toBase64(imgUrl); } catch { fallback = imgUrl; }
    }
    setRifaFallbackImg(fallback);

    // If no premios, auto-select "single"
    if (!rifa.premios?.length) {
      setSelectedPremioKey("single");
      setSt({ ...emptyState(), prizeImg: fallback });
    }
  }

  async function selectPremio(key: string) {
    setSelectedPremioKey(key);
    setSt(emptyState());
    if (!selectedRifa) return;

    let img = prizeImgCache[key];
    if (!img) {
      const premio = selectedRifa.premios?.find((p) => p.id === key);
      const url = premio?.imagen_url ?? "";
      if (url) {
        try { img = await toBase64(url); } catch { img = url; }
      } else {
        img = rifaFallbackImg;
      }
      setPrizeImgCache((prev) => ({ ...prev, [key]: img }));
    }
    setSt({ ...emptyState(), prizeImg: img || rifaFallbackImg });
  }

  async function buscar() {
    const q = st.query.trim();
    if (!q || !selectedRifa) return;
    setSt((prev) => ({ ...prev, loading: true, boleto: null, searchedNum: null, shown: false }));

    try {
      let found: Boleto | null = null;
      let searchedNum: number | null = null;
      if (q.toUpperCase().startsWith("JNS-")) {
        found = await getBoletoByFolio(q.toUpperCase());
      } else {
        const num = parseInt(q);
        if (!isNaN(num)) {
          searchedNum = num;
          const results = await getBoletosByNumero(num);
          const rifaResults = results.filter((b) => b.rifa_id === selectedRifa.id);
          rifaResults.sort((a, b) => (STATUS_PRIORITY[a.status as CardStatus] ?? 9) - (STATUS_PRIORITY[b.status as CardStatus] ?? 9));
          found = rifaResults[0] ?? null;
        }
      }
      setSt((prev) => ({ ...prev, boleto: found ?? null, searchedNum, shown: true, loading: false }));
    } catch {
      setSt((prev) => ({ ...prev, loading: false }));
    }
  }

  async function descargar() {
    if (!cardRef.current || !selectedRifa) return;
    setSt((prev) => ({ ...prev, downloading: true }));
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, skipFonts: false });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `ganador-${st.boleto?.folio ?? st.searchedNum ?? selectedRifa.nombre}.png`;
      a.click();
    } finally {
      setSt((prev) => ({ ...prev, downloading: false }));
    }
  }

  const hasPremios = (selectedRifa?.premios?.length ?? 0) > 0;
  const selectedPremio = selectedRifa?.premios?.find((p) => p.id === selectedPremioKey) ?? null;
  const cardStatus: CardStatus = st.boleto ? (st.boleto.status as CardStatus) : "no_vendido";
  const sorteoNombre = (selectedRifa?.nombre ?? "SORTEO JANS").toUpperCase();
  const premioNombre = selectedPremio ? selectedPremio.nombre.toUpperCase() : "";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Trophy className="text-yellow-500" size={30} />
              Anunciar Ganador
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Selecciona el sorteo, el premio y busca el boleto ganador.
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-5">

          {/* Step 1: Sorteo */}
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
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Step 2: Premio (solo si la rifa tiene premios) */}
          {selectedRifa && hasPremios && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                2. Premio
              </label>
              <div className="relative">
                <select
                  value={selectedPremioKey}
                  onChange={(e) => selectPremio(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-10 text-base font-semibold focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                >
                  <option value="">— Selecciona un premio —</option>
                  {selectedRifa.premios!.map((p, i) => (
                    <option key={p.id} value={p.id}>
                      {i + 1}. {p.nombre}{p.es_principal ? " ★" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          )}

          {/* Step 3: Boleto */}
          {selectedRifa && selectedPremioKey && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                {hasPremios ? "3." : "2."} Boleto ganador
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={st.query}
                  onChange={(e) => setSt((prev) => ({ ...prev, query: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && buscar()}
                  placeholder="Folio (JNS-XXXXXX) o número"
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-lg font-mono focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                />
                <button
                  onClick={buscar}
                  disabled={st.loading || !st.query.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-bold rounded-xl transition-all shadow-sm"
                >
                  <Search size={18} />
                  {st.loading ? "..." : "Buscar"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Winner card */}
        {st.shown && selectedRifa && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <WinnerCard
                cardRef={(el) => { cardRef.current = el; }}
                boleto={st.boleto}
                searchedNum={st.searchedNum}
                cardStatus={cardStatus}
                sorteoNombre={sorteoNombre}
                premioNombre={premioNombre}
                logoB64={logoB64}
                prizeImg={st.prizeImg || rifaFallbackImg}
              />
            </div>
            <button
              onClick={descargar}
              disabled={st.downloading}
              className="flex items-center gap-2 px-8 py-3 bg-slate-900 dark:bg-yellow-400 hover:bg-slate-800 dark:hover:bg-yellow-500 disabled:opacity-50 text-white dark:text-black font-bold rounded-xl transition-all shadow-sm"
            >
              <Download size={18} />
              {st.downloading ? "Generando imagen..." : "Descargar imagen"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
