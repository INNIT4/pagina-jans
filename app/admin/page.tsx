"use client";

import { useEffect, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import {
  setAppSettings, AppSettings, DEFAULT_SETTINGS,
  getDashboardStats, DashboardStats,
} from "@/lib/firestore";
import {
  Rocket, Settings2, Clock, Eye, EyeOff, Zap,
  Ticket, Users, Tag, MessageSquare, CreditCard,
  ChevronRight, TrendingUp, Box, AlertCircle, Trophy,
} from "lucide-react";

export default function AdminDashboard() {
  const [settings, setSettings] = useState<AppSettings>({
    mostrar_apartados: true,
    cancelacion_activa: false,
    cancelacion_horas: 24,
  });
  const [togglingApartados, setTogglingApartados] = useState(false);
  const [togglingCancelacion, setTogglingCancelacion] = useState(false);
  const [savingCancelacion, setSavingCancelacion] = useState(false);
  const [horasInput, setHorasInput] = useState("24");
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Escucha en tiempo real los settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "config"), (snap) => {
      const s = snap.exists()
        ? { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<AppSettings>) }
        : DEFAULT_SETTINGS;
      setSettings(s);
      setHorasInput(String(s.cancelacion_horas));
    }, (err) => {
      setError("Error al leer configuración: " + err.message);
    });
    return () => unsub();
  }, []);

  // Carga métricas al montar
  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) => setError("Error al cargar métricas: " + err.message))
      .finally(() => setLoadingStats(false));
  }, []);

  async function toggleApartados() {
    setTogglingApartados(true);
    setError(null);
    try {
      await setAppSettings({ mostrar_apartados: !settings.mostrar_apartados });
    } catch (err: unknown) {
      setError("No se pudo guardar. Verifica permisos de Firestore. " + (err instanceof Error ? err.message : ""));
    }
    setTogglingApartados(false);
  }

  async function toggleCancelacion() {
    setTogglingCancelacion(true);
    setError(null);
    try {
      await setAppSettings({ cancelacion_activa: !settings.cancelacion_activa });
    } catch (err: unknown) {
      setError("No se pudo guardar. Verifica permisos de Firestore. " + (err instanceof Error ? err.message : ""));
    }
    setTogglingCancelacion(false);
  }

  async function saveCancelacion() {
    const horas = parseInt(horasInput);
    if (isNaN(horas) || horas < 1) return;
    setSavingCancelacion(true);
    setError(null);
    try {
      await setAppSettings({ cancelacion_activa: settings.cancelacion_activa, cancelacion_horas: horas });
    } catch (err: unknown) {
      setError("No se pudo guardar. Verifica permisos de Firestore. " + (err instanceof Error ? err.message : ""));
    }
    setSavingCancelacion(false);
  }

  const quickLinks = [
    { href: "/admin/rifas",      title: "Gestionar Rifas",        desc: "Crear, editar y desactivar rifas.",      icon: Ticket,       color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20" },
    { href: "/admin/boletos",    title: "Gestionar Boletos",      desc: "Verificar pagos y marcar boletos.",      icon: Box,          color: "text-emerald-600",bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { href: "/admin/clientes",   title: "Base de Clientes",       desc: "Ver y exportar datos de clientes.",      icon: Users,        color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { href: "/admin/codigos",    title: "Códigos de Descuento",   desc: "CRUD de códigos y sus usos.",            icon: Tag,          color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
    { href: "/admin/whatsapp",   title: "Rotación WhatsApp",      desc: "Configurar números y rotación.",         icon: MessageSquare,color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20" },
    { href: "/admin/tarjetas",   title: "Datos Bancarios",        desc: "Editar cuentas bancarias.",              icon: CreditCard,   color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
  ];

  const statCards = [
    {
      label: "Rifas Activas",
      value: loadingStats ? "..." : String(stats?.rifasActivas ?? 0),
      icon: Rocket,
      color: "text-red-600",
    },
    {
      label: "Pendientes de pago",
      value: loadingStats ? "..." : String(stats?.boletos.pendiente ?? 0),
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      label: "Boletos pagados",
      value: loadingStats ? "..." : String(stats?.boletos.pagado ?? 0),
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      label: "Total recaudado",
      value: loadingStats ? "..." : `$${(stats?.recaudado ?? 0).toLocaleString("es-MX")}`,
      icon: Zap,
      color: "text-green-600",
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Panel de control de Jans Rifas.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sistema Activo</span>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Ganador CTA */}
      <Link
        href="/admin/ganador"
        className="group flex items-center gap-5 bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-black rounded-3xl p-6 shadow-md transition-all duration-300"
      >
        <div className="p-3 bg-black/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
          <Trophy size={28} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-extrabold tracking-tight">Anunciar Ganador</h2>
          <p className="text-sm font-medium opacity-70">Busca el boleto ganador y descarga la imagen del sorteo.</p>
        </div>
        <ChevronRight size={22} className="opacity-50 group-hover:translate-x-1 transition-transform" />
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
            <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 w-fit ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className={`text-2xl font-bold text-slate-900 dark:text-white ${loadingStats ? "animate-pulse" : ""}`}>
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings panel */}
        <section className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Settings2 size={120} />
            </div>

            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg text-red-600 dark:text-red-400">
                <Settings2 size={20} />
              </div>
              <h2 className="text-xl font-bold">Configuración General</h2>
            </div>

            <div className="space-y-8">
              {/* Apartados toggle */}
              <div className="flex items-center justify-between group">
                <div className="flex gap-4">
                  <div className={`p-3 rounded-2xl h-fit transition-colors ${settings.mostrar_apartados ? "bg-green-50 dark:bg-green-950/30 text-green-600" : "bg-slate-50 dark:bg-slate-800 text-slate-400"}`}>
                    {settings.mostrar_apartados ? <Eye size={24} /> : <EyeOff size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Grid Pública</h3>
                    <p className="text-sm text-slate-400 max-w-xs">
                      {settings.mostrar_apartados
                        ? "Los compradores pueden ver los números apartados en amarillo."
                        : "Los apartados se muestran como disponibles para los compradores."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleApartados}
                  disabled={togglingApartados}
                  className={`relative inline-flex h-8 w-14 flex-shrink-0 rounded-full border-4 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                    settings.mostrar_apartados ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${settings.mostrar_apartados ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="h-px bg-slate-50 dark:bg-slate-800" />

              {/* Cancelación automática */}
              <div className="space-y-6">
                <div className="flex items-center justify-between group">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-2xl h-fit transition-colors ${settings.cancelacion_activa ? "bg-red-50 dark:bg-red-950/30 text-red-600" : "bg-slate-50 dark:bg-slate-800 text-slate-400"}`}>
                      <Clock size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Cancelación Automática</h3>
                      <p className="text-sm text-slate-400 max-w-xs">
                        Libera los boletos apartados que no han reportado pago tras el tiempo límite.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleCancelacion}
                    disabled={togglingCancelacion}
                    className={`relative inline-flex h-8 w-14 flex-shrink-0 rounded-full border-4 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                      settings.cancelacion_activa ? "bg-red-500" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${settings.cancelacion_activa ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>

                {settings.cancelacion_activa && (
                  <div className="ml-[60px] flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tiempo límite (Horas)</label>
                      <input
                        type="number"
                        min={1}
                        max={720}
                        value={horasInput}
                        onChange={(e) => setHorasInput(e.target.value)}
                        className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-lg font-bold focus:ring-2 focus:ring-red-500 outline-none transition-all"
                      />
                    </div>
                    <button
                      onClick={saveCancelacion}
                      disabled={savingCancelacion}
                      className="ml-auto px-8 py-3 bg-slate-900 dark:bg-red-600 hover:bg-slate-800 dark:hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all"
                    >
                      {savingCancelacion ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Quick links */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Zap size={20} />
            </div>
            <h2 className="text-xl font-bold">Accesos Rápidos</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800 hover:border-red-500 dark:hover:border-red-500 transition-all duration-300 flex items-center gap-4"
              >
                <div className={`p-3 rounded-2xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition-colors">{item.title}</h3>
                  <p className="text-slate-400 text-xs">{item.desc}</p>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
