"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/rifas-previas", label: "Rifas Previas" },
  { href: "/consulta", label: "Consultar Boleto" },
  { href: "/tarjetas", label: "Metodos de pago" },
  { href: "/faq", label: "FAQ" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="sticky top-0 z-50 bg-brand-black/95 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/">
          <Logo size="sm" showText={true} lightText={true} />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium uppercase tracking-wider transition-colors hover:text-brand-red ${
                pathname === l.href
                  ? "text-brand-red"
                  : "text-gray-400"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/rifas"
            className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white text-sm font-bold uppercase tracking-wider transition-colors skew-x-[-3deg]"
          >
            <span className="inline-block skew-x-[3deg]">Comprar Boletos</span>
          </Link>
        </div>

        {/* Hamburger */}
        <button
          className="md:hidden p-2 rounded-sm hover:bg-gray-800 text-gray-400"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
        >
          <MenuIcon />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-800 bg-brand-black">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-3 text-sm font-medium uppercase tracking-wider transition-colors hover:text-brand-red hover:bg-brand-dark ${
                pathname === l.href ? "text-brand-red" : "text-gray-400"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/rifas"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm font-bold text-brand-red uppercase tracking-wider"
          >
            Comprar Boletos
          </Link>
        </div>
      )}
    </nav>
  );
}

function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
