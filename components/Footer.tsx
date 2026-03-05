import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 mb-8">
          <div>
            <p className="text-white font-black text-lg mb-2">Sorteos Jans</p>
            <p className="text-sm leading-relaxed">
              Plataforma de rifas en línea. Participa de forma segura, sencilla y transparente.
            </p>
          </div>
          <div>
            <p className="text-white font-semibold mb-3 text-sm">Navegación</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/rifas" className="hover:text-white transition-colors">Rifas activas</Link></li>
              <li><Link href="/rifas-previas" className="hover:text-white transition-colors">Rifas previas</Link></li>
              <li><Link href="/consulta" className="hover:text-white transition-colors">Consultar boleto</Link></li>
              <li><Link href="/tarjetas" className="hover:text-white transition-colors">Métodos de pago</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold mb-3 text-sm">Información</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/faq" className="hover:text-white transition-colors">Preguntas frecuentes</Link></li>
              <li><Link href="/sobre-nosotros" className="hover:text-white transition-colors">Sobre nosotros</Link></li>
              <li><Link href="/aviso-privacidad" className="hover:text-white transition-colors">Aviso de privacidad</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} Sorteos Jans. Todos los derechos reservados.</p>
          <Link href="/aviso-privacidad" className="hover:text-white transition-colors">
            Aviso de privacidad
          </Link>
        </div>
      </div>
    </footer>
  );
}
