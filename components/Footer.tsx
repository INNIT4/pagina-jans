import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-gray-400 mt-auto border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 mb-8">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/4.jpeg" alt="Sorteos Jans" className="h-14 w-auto mb-3 rounded-sm" />
            <p className="text-sm leading-relaxed">
              Plataforma de rifas en linea. Participa de forma segura, sencilla y transparente.
            </p>
          </div>
          <div>
            <p className="text-brand-red font-bold mb-3 text-sm uppercase tracking-wider">Navegacion</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/rifas" className="hover:text-brand-red transition-colors">Rifas activas</Link></li>
              <li><Link href="/rifas-previas" className="hover:text-brand-red transition-colors">Rifas previas</Link></li>
              <li><Link href="/consulta" className="hover:text-brand-red transition-colors">Consultar boleto</Link></li>
              <li><Link href="/tarjetas" className="hover:text-brand-red transition-colors">Metodos de pago</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-brand-red font-bold mb-3 text-sm uppercase tracking-wider">Informacion</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/faq" className="hover:text-brand-red transition-colors">Preguntas frecuentes</Link></li>
              <li><Link href="/sobre-nosotros" className="hover:text-brand-red transition-colors">Sobre nosotros</Link></li>
              <li><Link href="/aviso-privacidad" className="hover:text-brand-red transition-colors">Aviso de privacidad</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>&copy; {new Date().getFullYear()} Sorteos Jans. Todos los derechos reservados.</p>
          <Link href="/aviso-privacidad" className="hover:text-brand-red transition-colors">
            Aviso de privacidad
          </Link>
        </div>
      </div>
    </footer>
  );
}
