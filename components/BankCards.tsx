"use client";

import { useEffect, useState } from "react";
import { getBankAccounts, BankAccount } from "@/lib/firestore";

export const CARD_COLORS: Record<string, { label: string; gradient: string; accent: string; preview: string }> = {
  slate:   { label: "Gris",        gradient: "from-slate-700 via-slate-600 to-slate-400",    accent: "bg-slate-300/20",  preview: "bg-slate-600" },
  blue:    { label: "Azul",        gradient: "from-blue-700 via-blue-500 to-cyan-400",        accent: "bg-cyan-300/20",   preview: "bg-blue-600" },
  darkblue:{ label: "Azul oscuro", gradient: "from-blue-900 via-blue-700 to-blue-500",        accent: "bg-blue-300/20",   preview: "bg-blue-900" },
  purple:  { label: "Morado",      gradient: "from-purple-700 via-purple-500 to-pink-400",    accent: "bg-pink-300/20",   preview: "bg-purple-600" },
  red:     { label: "Rojo",        gradient: "from-red-700 via-red-500 to-orange-400",        accent: "bg-orange-300/20", preview: "bg-red-600" },
  darkred: { label: "Rojo oscuro", gradient: "from-red-900 via-red-700 to-red-500",           accent: "bg-red-300/20",    preview: "bg-red-900" },
  green:   { label: "Verde",       gradient: "from-green-700 via-green-500 to-emerald-400",   accent: "bg-emerald-300/20",preview: "bg-green-600" },
  gold:    { label: "Dorado",      gradient: "from-yellow-700 via-yellow-500 to-amber-400",   accent: "bg-amber-300/20",  preview: "bg-yellow-600" },
  black:   { label: "Negro",       gradient: "from-gray-900 via-gray-800 to-gray-600",        accent: "bg-gray-400/20",   preview: "bg-gray-900" },
};
const DEFAULT_COLOR = CARD_COLORS.slate;

/** Formats an 18-digit CLABE as  XXXX XXXX XXXX XXXX XX */
function formatClabe(clabe: string) {
  return clabe.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export default function BankCards() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    getBankAccounts().then((data) => setAccounts(data.filter((a) => a.activo)));
  }, []);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (accounts.length === 0)
    return <p className="text-center text-slate-400 py-4">Cargando datos bancarios...</p>;

  return (
    <div className="flex flex-col gap-6 max-w-sm mx-auto">
      {accounts.map((acc) => {
        const style = (acc.color && CARD_COLORS[acc.color]) ? CARD_COLORS[acc.color] : DEFAULT_COLOR;
        const clabeKey   = `clabe-${acc.id}`;
        const cuentaKey  = `cuenta-${acc.id}`;

        return (
          /* Card wrapper — standard credit-card aspect ratio 85.6 × 53.98 mm ≈ 1.586 */
          <div
            key={acc.id}
            className={`relative w-full rounded-2xl overflow-hidden shadow-2xl text-white
              bg-gradient-to-br ${style.gradient}`}
            style={{ aspectRatio: "1.75 / 1" }}
          >
            {/* Decorative circles */}
            <div className={`absolute -top-10 -right-10 w-44 h-44 rounded-full ${style.accent}`} />
            <div className={`absolute -bottom-8 -left-8 w-36 h-36 rounded-full ${style.accent}`} />

            {/* Content */}
            <div className="relative h-full flex flex-col justify-between p-6">

              {/* Top row: bank name + contactless icon */}
              <div className="flex items-start justify-between">
                <p className="text-xl font-black tracking-wide drop-shadow">{acc.banco}</p>
                {/* Contactless waves */}
                <svg className="w-7 h-7 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0" />
                </svg>
              </div>

              {/* Middle: chip + CLABE */}
              <div className="space-y-1">
                {/* EMV chip */}
                <div className="w-11 h-8 rounded-md bg-yellow-300/90 border border-yellow-200/60 grid grid-cols-3 grid-rows-3 gap-px p-1 mb-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className={`rounded-sm ${i === 4 ? "bg-yellow-400/50" : "bg-yellow-500/70"}`} />
                  ))}
                </div>
                <p className="font-mono text-lg tracking-widest font-semibold drop-shadow leading-none">
                  {formatClabe(acc.clabe)}
                </p>
                <p className="text-xs uppercase tracking-widest opacity-60 mt-1">CLABE interbancaria</p>
              </div>

              {/* Bottom row: titular + copy buttons */}
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest opacity-60 mb-0.5">Titular</p>
                  <p className="font-bold text-base uppercase tracking-wide leading-tight truncate">
                    {acc.titular}
                  </p>
                  {acc.num_cuenta && (
                    <p className="font-mono text-sm opacity-70 mt-0.5">{acc.num_cuenta}</p>
                  )}
                </div>

                {/* Copy buttons */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={() => copy(acc.clabe, clabeKey)}
                    className="text-xs font-bold bg-white/20 hover:bg-white/35 active:bg-white/50 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors whitespace-nowrap"
                  >
                    {copied === clabeKey ? "Copiado!" : "Copiar CLABE"}
                  </button>
                  {acc.num_cuenta && (
                    <button
                      onClick={() => copy(acc.num_cuenta, cuentaKey)}
                      className="text-xs font-bold bg-white/20 hover:bg-white/35 active:bg-white/50 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors whitespace-nowrap"
                    >
                      {copied === cuentaKey ? "Copiado!" : "Copiar N° Cuenta"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
