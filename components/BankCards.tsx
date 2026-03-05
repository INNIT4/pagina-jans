"use client";

import { useEffect, useState } from "react";
import { getBankAccounts, BankAccount } from "@/lib/firestore";

const BANK_COLORS: Record<string, string> = {
  Azteca: "from-blue-600 to-blue-400",
  Nu: "from-red-600 to-red-400",
  BBVA: "from-blue-800 to-blue-600",
};

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
    return <p className="text-center text-slate-400">Cargando datos bancarios...</p>;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map((acc) => {
        const gradient = BANK_COLORS[acc.banco] ?? "from-slate-600 to-slate-400";
        return (
          <div
            key={acc.id}
            className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white shadow-lg`}
          >
            <p className="text-lg font-bold mb-4">{acc.banco}</p>
            <p className="text-xs opacity-80 mb-1">Titular</p>
            <p className="font-semibold mb-3">{acc.titular}</p>

            <p className="text-xs opacity-80 mb-1">CLABE</p>
            <div className="flex items-center justify-between bg-white/20 rounded-lg px-3 py-2 mb-3">
              <span className="font-mono text-sm tracking-widest">{acc.clabe}</span>
              <button
                onClick={() => copy(acc.clabe, `clabe-${acc.id}`)}
                className="text-xs bg-white/30 hover:bg-white/50 px-2 py-1 rounded transition-colors ml-2"
              >
                {copied === `clabe-${acc.id}` ? "Copiado!" : "Copiar"}
              </button>
            </div>

            {acc.num_cuenta && (
              <>
                <p className="text-xs opacity-80 mb-1">N° Cuenta</p>
                <div className="flex items-center justify-between bg-white/20 rounded-lg px-3 py-2">
                  <span className="font-mono text-sm">{acc.num_cuenta}</span>
                  <button
                    onClick={() => copy(acc.num_cuenta, `cuenta-${acc.id}`)}
                    className="text-xs bg-white/30 hover:bg-white/50 px-2 py-1 rounded transition-colors ml-2"
                  >
                    {copied === `cuenta-${acc.id}` ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
