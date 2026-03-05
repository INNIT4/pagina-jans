"use client";

import { useEffect, useState } from "react";
import { getBankAccounts, upsertBankAccount, BankAccount } from "@/lib/firestore";

const DEFAULT_BANKS: Array<{ id: string; banco: string }> = [
  { id: "azteca", banco: "Azteca" },
  { id: "nu", banco: "Nu" },
  { id: "bbva", banco: "BBVA" },
];

export default function AdminTarjetasPage() {
  const [accounts, setAccounts] = useState<Record<string, BankAccount>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    getBankAccounts().then((data) => {
      const map: Record<string, BankAccount> = {};
      data.forEach((a) => { map[a.id!] = a; });
      setAccounts(map);
    });
  }, []);

  function updateField(id: string, field: keyof BankAccount, value: string | boolean) {
    setAccounts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { banco: DEFAULT_BANKS.find((b) => b.id === id)?.banco ?? "", titular: "", clabe: "", num_cuenta: "", activo: true }),
        [field]: value,
      },
    }));
  }

  async function handleSave(id: string, banco: string) {
    const acc = accounts[id] ?? { banco, titular: "", clabe: "", num_cuenta: "", activo: true };
    setSaving(id);
    await upsertBankAccount(id, { banco, titular: acc.titular, clabe: acc.clabe, num_cuenta: acc.num_cuenta, activo: acc.activo });
    setSaving(null);
    alert("Guardado correctamente.");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black mb-6">Datos Bancarios</h1>

      <div className="space-y-6">
        {DEFAULT_BANKS.map(({ id, banco }) => {
          const acc = accounts[id] ?? { banco, titular: "", clabe: "", num_cuenta: "", activo: true };
          return (
            <div key={id} className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{banco}</h2>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={acc.activo ?? true}
                    onChange={(e) => updateField(id, "activo", e.target.checked)}
                  />
                  Visible
                </label>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Titular</label>
                  <input
                    value={acc.titular ?? ""}
                    onChange={(e) => updateField(id, "titular", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                    placeholder="Nombre del titular"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CLABE (18 dígitos)</label>
                  <input
                    value={acc.clabe ?? ""}
                    onChange={(e) => updateField(id, "clabe", e.target.value)}
                    maxLength={18}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono"
                    placeholder="000000000000000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Número de cuenta</label>
                  <input
                    value={acc.num_cuenta ?? ""}
                    onChange={(e) => updateField(id, "num_cuenta", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono"
                    placeholder="00000000"
                  />
                </div>
              </div>
              <button
                onClick={() => handleSave(id, banco)}
                disabled={saving === id}
                className="mt-4 w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
              >
                {saving === id ? "Guardando..." : "Guardar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
