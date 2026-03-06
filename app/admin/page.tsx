"use client";

import { useEffect, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { setAppSettings, AppSettings, DEFAULT_SETTINGS } from "@/lib/firestore";

export default function AdminDashboard() {
  const [settings, setSettings] = useState<AppSettings>({
    mostrar_apartados: true,
    cancelacion_activa: false,
    cancelacion_horas: 24,
  });
  const [togglingApartados, setTogglingApartados] = useState(false);
  const [savingCancelacion, setSavingCancelacion] = useState(false);
  const [horasInput, setHorasInput] = useState("24");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "config"), (snap) => {
      const s = snap.exists()
        ? { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<AppSettings>) }
        : DEFAULT_SETTINGS;
      setSettings(s);
      setHorasInput(String(s.cancelacion_horas));
    });
    return () => unsub();
  }, []);

  async function toggleApartados() {
    setTogglingApartados(true);
    const next = !settings.mostrar_apartados;
    await setAppSettings({ mostrar_apartados: next });
    setSettings((s) => ({ ...s, mostrar_apartados: next }));
    setTogglingApartados(false);
  }

  async function saveCancelacion() {
    const horas = parseInt(horasInput);
    if (isNaN(horas) || horas < 1) return;
    setSavingCancelacion(true);
    await setAppSettings({ cancelacion_activa: settings.cancelacion_activa, cancelacion_horas: horas });
    setSettings((s) => ({ ...s, cancelacion_horas: horas }));
    setSavingCancelacion(false);
  }

  async function toggleCancelacion() {
    const next = !settings.cancelacion_activa;
    await setAppSettings({ cancelacion_activa: next });
    setSettings((s) => ({ ...s, cancelacion_activa: next }));
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Dashboard</h1>

      {/* Settings panel */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-5 mb-8 space-y-5">
        <h2 className="text-sm font-black text-slate-500 uppercase tracking-wide">Configuración</h2>

        {/* Apartados toggle */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-sm">Mostrar apartados en la grid pública</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {settings.mostrar_apartados
                ? "Los compradores ven los números apartados (amarillo)."
                : "Los apartados aparecen como disponibles para los compradores."}
            </p>
          </div>
          <button
            onClick={toggleApartados}
            disabled={togglingApartados}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
              settings.mostrar_apartados ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                settings.mostrar_apartados ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700" />

        {/* Cancelación automática */}
        <div>
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="font-bold text-sm">Cancelación automática de boletos pendientes</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {settings.cancelacion_activa
                  ? `Los boletos pendientes se cancelan tras ${settings.cancelacion_horas} h sin pago, al entrar a la sección Boletos.`
                  : "Sin cancelación automática. El admin cancela manualmente."}
              </p>
            </div>
            <button
              onClick={toggleCancelacion}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                settings.cancelacion_activa ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                  settings.cancelacion_activa ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          {settings.cancelacion_activa && (
            <div className="flex items-center gap-3 mt-2">
              <label className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">Tiempo límite:</label>
              <input
                type="number"
                min={1}
                max={720}
                value={horasInput}
                onChange={(e) => setHorasInput(e.target.value)}
                className="w-24 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="text-sm text-slate-500">horas</span>
              <button
                onClick={saveCancelacion}
                disabled={savingCancelacion}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
              >
                {savingCancelacion ? "Guardando..." : "Guardar"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { href: "/admin/rifas", title: "Gestionar Rifas", desc: "Crear, editar y desactivar rifas." },
          { href: "/admin/boletos", title: "Gestionar Boletos", desc: "Verificar pagos y marcar boletos." },
          { href: "/admin/clientes", title: "Base de Clientes", desc: "Ver y exportar datos de clientes." },
          { href: "/admin/codigos", title: "Códigos de Descuento", desc: "CRUD de códigos y sus usos." },
          { href: "/admin/whatsapp", title: "Rotación WhatsApp", desc: "Configurar números y rotación." },
          { href: "/admin/tarjetas", title: "Datos Bancarios", desc: "Editar cuentas bancarias." },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-red-200 dark:hover:border-red-700 transition-all"
          >
            <h2 className="font-bold text-lg mb-1">{item.title}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
