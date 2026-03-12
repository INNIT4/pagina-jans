"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Logo from "@/components/Logo";
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  CheckSquare, 
  Settings, 
  MessageSquare, 
  CreditCard, 
  FileText, 
  BarChart3,
  Gift,
  Tag,
  Wrench,
  LogOut,
  ChevronRight,
  Trophy
} from "lucide-react";

const NAV_GROUPS: { 
  label: string | null; 
  items: { href: string; label: string; exact?: boolean; icon: React.ElementType }[] 
}[] = [
  {
    label: null,
    items: [{ href: "/admin", label: "Dashboard", exact: true, icon: LayoutDashboard }],
  },
  {
    label: "Ventas",
    items: [
      { href: "/admin/rifas", label: "Rifas", icon: Ticket },
      { href: "/admin/boletos", label: "Boletos", icon: CheckSquare },
      { href: "/admin/comprobantes", label: "Comprobantes", icon: FileText },
      { href: "/admin/ganador", label: "Ganador", icon: Trophy },
      { href: "/admin/servicios", label: "Servicios", icon: Wrench },
    ],
  },
  {
    label: "Clientes",
    items: [
      { href: "/admin/clientes", label: "Clientes", icon: Users },
      { href: "/admin/codigos", label: "Descuentos", icon: Tag },
      { href: "/admin/regalos", label: "Regalos", icon: Gift },
    ],
  },
  {
    label: "Configuración",
    items: [
      { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageSquare },
      { href: "/admin/tarjetas", label: "Tarjetas", icon: CreditCard },
      { href: "/admin/contenido", label: "Contenido", icon: Settings },
    ],
  },
  {
    label: "Análisis",
    items: [
      { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
      { href: "/admin/metricas", label: "Métricas", icon: BarChart3 },
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
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center">
          <Logo size="sm" showText={true} />
        </div>
        
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto scrollbar-hide">
          {visibleNavGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 shadow-sm shadow-red-100 dark:shadow-none"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={`${active ? "text-red-600 dark:text-red-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`} />
                        <span>{item.label}</span>
                      </div>
                      {active && <ChevronRight size={14} className="opacity-50" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={logout}
            className="group w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all duration-200"
          >
            <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
