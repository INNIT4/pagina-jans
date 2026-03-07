"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Logo from "@/components/Logo";

const NAV_GROUPS: { label: string | null; items: { href: string; label: string; exact?: boolean }[] }[] = [
  {
    label: null,
    items: [{ href: "/admin", label: "Dashboard", exact: true }],
  },
  {
    label: "Ventas",
    items: [
      { href: "/admin/rifas", label: "Rifas" },
      { href: "/admin/boletos", label: "Boletos" },
      { href: "/admin/comprobantes", label: "Comprobantes" },
      { href: "/admin/servicios", label: "Servicios" },
    ],
  },
  {
    label: "Clientes",
    items: [
      { href: "/admin/clientes", label: "Clientes" },
      { href: "/admin/codigos", label: "Descuentos" },
      { href: "/admin/regalos", label: "Regalos" },
    ],
  },
  {
    label: "Configuración",
    items: [
      { href: "/admin/whatsapp", label: "WhatsApp" },
      { href: "/admin/tarjetas", label: "Tarjetas" },
      { href: "/admin/contenido", label: "Contenido" },
    ],
  },
  {
    label: "Análisis",
    items: [
      { href: "/admin/reportes", label: "Reportes" },
      { href: "/admin/metricas", label: "Métricas" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState("admin");

  useEffect(() => {
    if (pathname === "/admin/login") {
      setReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/admin/login");
      } else {
        // Parse role from cookie
        const match = document.cookie.match(new RegExp('(^| )__role=([^;]+)'));
        if (match) setRole(match[2]);
        setReady(true);
      }
    });
    return unsub;
  }, [pathname, router]);

  if (pathname === "/admin/login") return <>{children}</>;
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  async function logout() {
    await signOut(auth);
    await fetch("/api/admin/session", { method: "DELETE" });
    router.push("/admin/login");
  }

  const STAFF_PATHS = ["/admin/boletos", "/admin/comprobantes", "/admin/servicios"];
  const visibleNavGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => role === "admin" || STAFF_PATHS.includes(item.href))
  })).filter(group => group.items.length > 0);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <Logo size="sm" showText={true} />
        </div>
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {visibleNavGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={logout}
            className="w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors text-left"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
