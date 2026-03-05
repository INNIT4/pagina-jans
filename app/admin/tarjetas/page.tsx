"use client";

import { useEffect, useState } from "react";
import { getBankAccounts, upsertBankAccount, deleteBankAccount, BankAccount } from "@/lib/firestore";

const EMPTY_FORM = { banco: "", titular: "", clabe: "", num_cuenta: "", activo: true };

export default function AdminTarjetasPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<BankAccount, "id">>(EMPTY_FORM);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<Omit<BankAccount, "id">>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await getBankAccounts();
    setAccounts(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── Edit ──────────────────────────────────────────────────────────────────

  function startEdit(acc: BankAccount) {
    setEditingId(acc.id!);
    setEditForm({ banco: acc.banco, titular: acc.titular, clabe: acc.clabe, num_cuenta: acc.num_cuenta, activo: acc.activo });
  }

  async function saveEdit() {
    if (!editingId) return;
    if (!editForm.banco || !editForm.titular || editForm.clabe.length < 18) {
      alert("Banco, titular y CLABE de 18 dígitos son obligatorios."); return;
    }
    setSaving(true);
    await upsertBankAccount(editingId, editForm);
    setEditingId(null);
    await load();
    setSaving(false);
  }

  // ── Add ───────────────────────────────────────────────────────────────────

  async function saveAdd() {
    if (!addForm.banco || !addForm.titular || addForm.clabe.length < 18) {
      alert("Banco, titular y CLABE de 18 dígitos son obligatorios."); return;
    }
    setSaving(true);
    const id = addForm.banco.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    await upsertBankAccount(id, addForm);
    setAddForm(EMPTY_FORM);
    setShowAdd(false);
    await load();
    setSaving(false);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(acc: BankAccount) {
    if (!confirm(`¿Eliminar la cuenta de ${acc.banco} (${acc.titular})?`)) return;
    await deleteBankAccount(acc.id!);
    await load();
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Datos Bancarios</h1>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar tarjeta
        </button>
      </div>

      {/* Lista de cuentas */}
      <div className="space-y-4 mb-6">
        {accounts.length === 0 && (
          <p className="text-center py-10 text-slate-400">No hay cuentas bancarias. Agrega una.</p>
        )}
        {accounts.map((acc) => (
          <div key={acc.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 overflow-hidden">

            {editingId === acc.id ? (
              /* ── Formulario de edición ── */
              <div className="p-5 space-y-3">
                <p className="font-bold text-sm mb-1">Editando cuenta</p>
                <AccountForm form={editForm} onChange={setEditForm} />
                <div className="flex gap-2 pt-1">
                  <button onClick={saveEdit} disabled={saving}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* ── Vista de la cuenta ── */
              <div className="p-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-base">{acc.banco}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${acc.activo ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-slate-100 text-slate-500 dark:bg-slate-700"}`}>
                      {acc.activo ? "Visible" : "Oculta"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{acc.titular}</p>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{acc.clabe}</p>
                  {acc.num_cuenta && <p className="text-xs font-mono text-slate-400">Cta: {acc.num_cuenta}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => startEdit(acc)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    title="Editar">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(acc)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 transition-colors"
                    title="Eliminar">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Formulario agregar */}
      {showAdd && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-5">
          <p className="font-bold text-sm mb-3">Nueva cuenta bancaria</p>
          <AccountForm form={addForm} onChange={setAddForm} />
          <div className="flex gap-2 mt-3">
            <button onClick={saveAdd} disabled={saving}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
              {saving ? "Guardando..." : "Agregar cuenta"}
            </button>
            <button onClick={() => { setShowAdd(false); setAddForm(EMPTY_FORM); }}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountForm({
  form,
  onChange,
}: {
  form: Omit<BankAccount, "id">;
  onChange: (f: Omit<BankAccount, "id">) => void;
}) {
  function set(field: keyof Omit<BankAccount, "id">, value: string | boolean) {
    onChange({ ...form, [field]: value });
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1">Banco</label>
          <input value={form.banco} onChange={(e) => set("banco", e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
            placeholder="BBVA, Nu, Azteca…" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Titular</label>
          <input value={form.titular} onChange={(e) => set("titular", e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
            placeholder="Nombre completo" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1">CLABE (18 dígitos)</label>
        <input value={form.clabe} onChange={(e) => set("clabe", e.target.value.replace(/\D/g, ""))}
          maxLength={18}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono"
          placeholder="000000000000000000" />
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1">N° de cuenta (opcional)</label>
        <input value={form.num_cuenta} onChange={(e) => set("num_cuenta", e.target.value)}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono"
          placeholder="00000000" />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.activo} onChange={(e) => set("activo", e.target.checked)}
          className="rounded" />
        <span>Visible para los compradores</span>
      </label>
    </div>
  );
}
