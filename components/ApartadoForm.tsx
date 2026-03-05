"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rifa, createBoleto, reservarNumeros, validateDiscountCode, incrementDiscountUse, getBoletoByFolio } from "@/lib/firestore";
import { generateFolio } from "@/lib/folio";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { Timestamp } from "firebase/firestore";

const ESTADOS_MX = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua",
  "Ciudad de México","Coahuila","Colima","Durango","Estado de México","Guanajuato","Guerrero",
  "Hidalgo","Jalisco","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro",
  "Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala",
  "Veracruz","Yucatán","Zacatecas",
];

interface ApartadoFormProps {
  rifa: Rifa;
  numeros: number[];
  onClose: () => void;
}

export default function ApartadoForm({ rifa, numeros, onClose }: ApartadoFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: "", apellidos: "", celular: "", estado: "",
  });
  const [codigo, setCodigo] = useState("");
  const [descuento, setDescuento] = useState<{ id: string; porcentaje: number } | null>(null);
  const [codigoError, setCodigoError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);

  const subtotal = numeros.length * rifa.precio_boleto;
  const descuentoAmt = descuento ? subtotal * (descuento.porcentaje / 100) : 0;
  const total = subtotal - descuentoAmt;

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function checkCodigo() {
    const code = codigo.trim().toUpperCase();
    if (!code) return;
    setValidatingCode(true);
    setCodigoError("");
    try {
      const result = await validateDiscountCode(code);
      if (result) {
        setDescuento({ id: result.id!, porcentaje: result.porcentaje });
      } else {
        setDescuento(null);
        setCodigoError("Código inválido o expirado.");
      }
    } catch {
      setCodigoError("Error al validar el código.");
    }
    setValidatingCode(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre || !form.apellidos || !form.celular || !form.estado) return;

    setLoading(true);
    try {
      // Generate unique folio (retry once on collision — extremely rare)
      let folio = generateFolio();
      const folioExiste = await getBoletoByFolio(folio);
      if (folioExiste) folio = generateFolio();

      // Get WhatsApp number
      const waRes = await fetch("/api/whatsapp").catch(() => null);
      const { numero } = waRes ? await waRes.json().catch(() => ({})) : {};

      // Save boleto
      await createBoleto({
        folio,
        rifa_id: rifa.id!,
        numeros,
        nombre: form.nombre,
        apellidos: form.apellidos,
        celular: form.celular,
        estado: form.estado,
        codigo_descuento: descuento ? codigo.toUpperCase() : "",
        descuento_aplicado: descuento ? descuento.porcentaje : 0,
        precio_total: total,
        status: "pendiente",
        created_at: Timestamp.now(),
      });

      // Reserve numbers atomically (transaction checks availability)
      await reservarNumeros(rifa.id!, numeros);

      // Increment discount code if used
      if (descuento) {
        await incrementDiscountUse(descuento.id);
      }

      // Build WhatsApp message
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://srtsjans.com";
      const fecha = new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
      const message = `👋 Hola, soy ${form.nombre} ${form.apellidos}\nSeleccioné: ${numeros.length} números\n──────────────\n🎫 Números: ${numeros.join(", ")}\n🎯 Sorteo: ${rifa.nombre}\n🏷️ Folio: ${folio}\n📅 Fecha: ${fecha}\n💰 Total: $${total.toLocaleString("es-MX")}\n──────────────\n💳 Métodos de pago: ${siteUrl}/cuentas\n🏷️ Consulta: ${siteUrl}/consulta?f=${folio}&act=1`;

      // Open WhatsApp (if configured)
      if (numero) {
        window.open(buildWhatsAppUrl(numero, message), "_blank");
      } else {
        alert("Tu boleto fue apartado correctamente.\n\nNota: en este momento no hay un número de WhatsApp configurado. Guarda tu folio: " + folio);
      }

      // Redirect to tarjetas
      router.push(`/tarjetas?folio=${folio}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ocurrió un error. Intenta de nuevo.";
      alert(msg);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Apartar boletos</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button>
          </div>

          {/* Selected numbers summary */}
          <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 mb-4">
            <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
              Números seleccionados ({numeros.length})
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 break-words">
              {numeros.join(", ")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  name="nombre" value={form.nombre} onChange={handle} required
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                  placeholder="Juan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Apellidos</label>
                <input
                  name="apellidos" value={form.apellidos} onChange={handle} required
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                  placeholder="Pérez García"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Celular (10 dígitos)</label>
              <input
                name="celular" value={form.celular} onChange={handle} required
                pattern="[0-9]{10}" maxLength={10}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                placeholder="5512345678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <select
                name="estado" value={form.estado} onChange={handle} required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
              >
                <option value="">Selecciona tu estado</option>
                {ESTADOS_MX.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            {/* Discount code */}
            <div>
              <label className="block text-sm font-medium mb-1">Código de descuento (opcional)</label>
              <div className="flex gap-2">
                <input
                  value={codigo}
                  onChange={(e) => { setCodigo(e.target.value); setDescuento(null); setCodigoError(""); }}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm uppercase"
                  placeholder="CODIGO20"
                />
                <button
                  type="button"
                  onClick={checkCodigo}
                  disabled={validatingCode}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-sm font-medium rounded-lg transition-colors"
                >
                  {validatingCode ? "..." : "Aplicar"}
                </button>
              </div>
              {descuento && (
                <p className="text-green-600 text-xs mt-1 font-medium">
                  Descuento aplicado: {descuento.porcentaje}%
                </p>
              )}
              {codigoError && <p className="text-red-500 text-xs mt-1">{codigoError}</p>}
            </div>

            {/* Price summary */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal ({numeros.length} boletos)</span>
                <span>${subtotal.toLocaleString("es-MX")}</span>
              </div>
              {descuento && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento ({descuento.porcentaje}%)</span>
                  <span>-${descuentoAmt.toLocaleString("es-MX")}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-slate-200 dark:border-slate-600 pt-2 mt-1">
                <span>Total</span>
                <span className="text-red-600 dark:text-red-400">
                  ${total.toLocaleString("es-MX")} MXN
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
            >
              {loading ? "Procesando..." : "Confirmar apartado"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
