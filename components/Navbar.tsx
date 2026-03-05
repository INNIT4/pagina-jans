"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Logo from "@/components/Logo";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/faq", label: "Preguntas Frecuentes" },
  { href: "/sobre-nosotros", label: "Contacto" },
  { href: "/tarjetas", label: "Métodos de Pago" },
  { href: "/rifas", label: "Comprar Boletos" },
  { href: "/rifas-previas", label: "Rifas Previas" },
  { href: "/consulta", label: "Consultar Boleto" },
];

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/">
          <Logo size="sm" showText={true} />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors hover:text-red-600 dark:hover:text-red-400 ${
                pathname === l.href
                  ? "text-red-600 dark:text-red-400"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Theme toggle + hamburger */}
        <div className="flex items-center gap-2">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <SunIcon />
              ) : (
                <MoonIcon />
              )}
            </button>
          )}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={() => setOpen(!open)}
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

function SunIcon() {
  return (
    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 3v1m0 16v1m8.66-9H21m-18 0H3m15.07-5.07l-.71.71M6.64 17.36l-.71.71M17.66 17.07l-.71-.71M6.64 6.64l-.71-.71M12 7a5 5 0 100 10A5 5 0 0012 7z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
