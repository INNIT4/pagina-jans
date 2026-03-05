"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRifas, getBoletos, getAppSettings, setAppSettings, Rifa } from "@/lib/firestore";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    rifasActivas: 0,
    totalBoletos: 0,
    boletosPendientes: 0,
    boletosPagados: 0,
    ingresos: 0,
  });
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [mostrarApartados, setMostrarApartados] = useState(true);
  const [togglingApartados, setTogglingApartados] = useState(false);

  useEffect(() => {
    Promise.all([getRifas(), getBoletos(), getAppSettings().catch(() => ({ mostrar_apartados: true }))]).then(([rs, boletos, settings]) => {
      const pagados = boletos.filter((b) => b.status === "pagado");
      setStats({
        rifasActivas: rs.filter((r) => r.activa).length,
        totalBoletos: boletos.length,
        boletosPendientes: boletos.filter((b) => b.status === "pendiente").length,
        boletosPagados: pagados.length,
        ingresos: pagados.reduce((sum, b) => sum + b.precio_total, 0),
      });
      setRifas(rs);
      setMostrarApartados(settings.mostrar_apartados);
    });
  }, []);

  async function toggleApartados() {
    setTogglingApartados(true);
    const next = !mostrarApartados;
    await setAppSettings({ mostrar_apartados: next });
    setMostrarApartados(next);
    setTogglingApartados(false);
  }

  const cards = [
    { label: "Rifas activas", value: stats.rifasActivas, href: "/admin/rifas", color: "bg-red-500" },
    { label: "Total boletos", value: stats.totalBoletos, href: "/admin/boletos", color: "bg-blue-500" },
    { label: "Pendientes", value: stats.boletosPendientes, href: "/admin/boletos", color: "bg-yellow-500" },
    { label: "Pagados", value: stats.boletosPagados, href: "/admin/boletos", color: "bg-green-500" },
    { label: "Ingresos MXN", value: `$${stats.ingresos.toLocaleString("es-MX")}`, href: "/admin/boletos", color: "bg-red-900" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
          >
            <div className={`w-10 h-1.5 rounded-full ${c.color} mb-3`} />
            <p className="text-2xl font-black mb-1">{c.value}</p>
            <p className="text-xs text-slate-500">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* Apartados visibility toggle */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-5 mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="font-bold text-sm">Mostrar apartados en la grid pública</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {mostrarApartados
              ? "Los compradores ven los números apartados (amarillo) en la rifa."
              : "Los apartados se muestran como disponibles para los compradores."}
          </p>
        </div>
        <button
          onClick={toggleApartados}
          disabled={togglingApartados}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
            mostrarApartados ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              mostrarApartados ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Numbers breakdown per rifa */}
      {rifas.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-bold mb-4">Números por rifa</h2>
          <div className="space-y-4">
            {rifas.map((r) => {
              const total = r.num_fin - r.num_inicio + 1;
              const pagados = r.num_vendidos ?? 0;
              const apartados = r.num_apartados ?? 0;
              const disponibles = total - pagados - apartados;
              const pctPagados = total > 0 ? (pagados / total) * 100 : 0;
              const pctApartados = total > 0 ? (apartados / total) * 100 : 0;
              const pctDisponibles = total > 0 ? (disponibles / total) * 100 : 0;

              return (
                <div
                  key={r.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-5"
                >
                  {/* Rifa header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-bold text-base">{r.nombre}</p>
                      <p className="text-xs text-slate-400">
                        Rango {r.num_inicio}–{r.num_fin} &middot; {total} números totales
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      r.activa
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700"
                    }`}>
                      {r.activa ? "Activa" : "Inactiva"}
                    </span>
                  </div>

                  {/* Stacked progress bar */}
                  <div className="h-4 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-700 mb-3">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: `${pctPagados}%` }}
                      title={`Pagados: ${pagados}`}
                    />
                    <div
                      className="h-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${pctApartados}%` }}
                      title={`Apartados: ${apartados}`}
                    />
                    <div
                      className="h-full bg-slate-200 dark:bg-slate-600 transition-all duration-500"
                      style={{ width: `${pctDisponibles}%` }}
                      title={`Disponibles: ${disponibles}`}
                    />
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl py-2.5 px-3">
                      <p className="text-xl font-black text-green-700 dark:text-green-400">{pagados}</p>
                      <p className="text-xs text-green-600 dark:text-green-500 font-medium">Pagados</p>
                      <p className="text-xs text-slate-400">{pctPagados.toFixed(1)}%</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl py-2.5 px-3">
                      <p className="text-xl font-black text-amber-700 dark:text-amber-400">{apartados}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">Apartados</p>
                      <p className="text-xs text-slate-400">{pctApartados.toFixed(1)}%</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl py-2.5 px-3">
                      <p className="text-xl font-black text-slate-700 dark:text-slate-300">{disponibles}</p>
                      <p className="text-xs text-slate-500 font-medium">Disponibles</p>
                      <p className="text-xs text-slate-400">{pctDisponibles.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
