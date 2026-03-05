"use client";

import { useEffect, useState } from "react";
import { getRifas, createBoleto, getNumerosOcupados, registrarNumerosVendidos, Rifa } from "@/lib/firestore";
import { generateFolio } from "@/lib/folio";
import { Timestamp } from "firebase/firestore";
import NumberGrid from "@/components/NumberGrid";

export default function RegalosPage() {
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [rifaId, setRifaId] = useState("");
  const [rifa, setRifa] = useState<Rifa | null>(null);
  const [vendidosArr, setVendidosArr] = useState<number[]>([]);
  const [apartadosArr, setApartadosArr] = useState<number[]>([]);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [form, setForm] = useState({ nombre: "", apellidos: "", celular: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{ folio: string; count: number } | null>(null);

  useEffect(() => {
    getRifas().then((rs) => setRifas(rs.filter((r) => r.activa)));
  }, []);

  useEffect(() => {
    if (!rifaId) { setRifa(null); setVendidosArr([]); setApartadosArr([]); setSeleccionados([]); return; }
    const found = rifas.find((r) => r.id === rifaId) ?? null;
    setRifa(found);
    setSeleccionados([]);
    if (found) {
      getNumerosOcupados(rifaId).then(({ vendidos, apartados }) => {
        setVendidosArr(vendidos);
        setApartadosArr(apartados);
      });
    }
  }, [rifaId, rifas]);

  function toggleNumber(n: number) {
    setSeleccionados((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  }

  async function handleRegalar(e: React.FormEvent) {
    e.preventDefault();
    if (!rifa || seleccionados.length === 0) return;
    if (!confirm(`¿Regalar ${seleccionados.length} boleto(s) a ${form.nombre || "sin nombre"}? Los números quedarán marcados como vendidos.`)) return;

    setSaving(true);
    setSuccess(null);
    try {
      const folio = generateFolio();

      await createBoleto({
        folio,
        rifa_id: rifa.id!,
        numeros: seleccionados,
        nombre: form.nombre || "Regalo",
        apellidos: form.apellidos,
        celular: form.celular,
        estado: "",
        codigo_descuento: "REGALO",
        descuento_aplicado: 100,
        precio_total: 0,
        status: "pagado",
        created_at: Timestamp.now(),
      });

      // Mark numbers directly as vendido in subcollection
      await registrarNumerosVendidos(rifa.id!, seleccionados);

      // Refresh grid
      const { vendidos, apartados } = await getNumerosOcupados(rifa.id!);
      setVendidosArr(vendidos);
      setApartadosArr(apartados);

      setSuccess({ folio, count: seleccionados.length });
      setSeleccionados([]);
      setForm({ nombre: "", apellidos: "", celular: "" });
    } catch {
      alert("Error al registrar el regalo. Intenta de nuevo.");
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black">Regalos</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Asigna boletos gratuitos a una persona. Los números quedan marcados como vendidos inmediatamente.
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-start gap-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-2xl p-4 mb-6">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="font-bold text-green-800 dark:text-green-300">
              {success.count} boleto{success.count !== 1 ? "s" : ""} regalado{success.count !== 1 ? "s" : ""} correctamente
            </p>
            <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
              Folio generado: <span className="font-mono font-black">{success.folio}</span>
            </p>
          </div>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700 text-lg leading-none">&times;</button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left: rifa selector + form */}
        <div className="space-y-5">

          {/* Rifa selector */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow p-5">
            <h2 className="font-bold mb-3">1. Selecciona la rifa</h2>
            <select
              value={rifaId}
              onChange={(e) => setRifaId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm"
            >
              <option value="">— Elige una rifa —</option>
              {rifas.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>

            {rifa && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1 text-xs text-slate-500">
                <p>Rango: {rifa.num_inicio}–{rifa.num_fin}</p>
                <p>Disponibles: {(rifa.num_fin - rifa.num_inicio + 1) - (rifa.num_vendidos ?? 0) - (rifa.num_apartados ?? 0)}</p>
              </div>
            )}
          </div>

          {/* Recipient form */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow p-5">
            <h2 className="font-bold mb-3">2. Datos del destinatario</h2>
            <form id="regalo-form" onSubmit={handleRegalar} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Opcional"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Apellidos</label>
                <input
                  value={form.apellidos}
                  onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                  placeholder="Opcional"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Celular</label>
                <input
                  value={form.celular}
                  onChange={(e) => setForm({ ...form, celular: e.target.value })}
                  placeholder="Opcional"
                  maxLength={10}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                />
              </div>
            </form>
          </div>

          {/* Summary + submit */}
          {rifa && (
            <div className={`rounded-2xl border-2 p-5 transition-colors ${
              seleccionados.length > 0
                ? "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            }`}>
              <h2 className="font-bold mb-3">3. Confirmar regalo</h2>

              {seleccionados.length === 0 ? (
                <p className="text-sm text-slate-400">Selecciona al menos un número de la cuadrícula.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1 mb-4 max-h-28 overflow-y-auto">
                    {seleccionados.map((n) => (
                      <span key={n} className="text-xs bg-blue-500 text-white rounded px-2 py-0.5 font-mono font-bold">
                        {n}
                      </span>
                    ))}
                  </div>
                  <div className="text-sm space-y-1 mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Boletos</span>
                      <span className="font-bold">{seleccionados.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Precio total</span>
                      <span className="font-black text-green-600">$0 MXN</span>
                    </div>
                  </div>
                  <button
                    type="submit"
                    form="regalo-form"
                    disabled={saving}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black rounded-xl transition-colors text-sm"
                  >
                    {saving ? "Registrando..." : `Regalar ${seleccionados.length} boleto${seleccionados.length !== 1 ? "s" : ""}`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: number grid */}
        <div className="lg:col-span-2">
          {!rifa ? (
            <div className="h-full flex items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow p-12 text-center">
              <div>
                <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <p className="text-slate-400 text-sm">Selecciona una rifa para ver los números disponibles</p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">Números — {rifa.nombre}</h2>
                {seleccionados.length > 0 && (
                  <button
                    onClick={() => setSeleccionados([])}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Limpiar selección
                  </button>
                )}
              </div>
              <NumberGrid
                numInicio={rifa.num_inicio}
                numFin={rifa.num_fin}
                vendidos={vendidosArr}
                apartados={apartadosArr}
                seleccionados={seleccionados}
                onToggle={toggleNumber}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
