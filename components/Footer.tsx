import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-gray-400 mt-auto border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 mb-8">
          <div>
            <Image src="/images/4.jpeg" alt="Sorteos Jans" width={180} height={56} className="h-14 w-auto mb-3 rounded-sm object-contain" />
            <p className="text-sm leading-relaxed">
              Plataforma de rifas en linea. Participa de forma segura, sencilla y transparente.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="https://www.facebook.com/sorteosjansn" target="_blank" rel="noopener noreferrer" aria-label="Facebook de Sorteos Jans" className="text-gray-400 hover:text-brand-red transition-colors">
                <Facebook size={20} />
              </a>
              <a href="https://www.instagram.com/sorteosjansn/" target="_blank" rel="noopener noreferrer" aria-label="Instagram de Sorteos Jans" className="text-gray-400 hover:text-brand-red transition-colors">
                <Instagram size={20} />
              </a>
            </div>
          </div>
          <div>
            <p className="text-red-500 font-bold mb-3 text-sm uppercase tracking-wider">Navegacion</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/rifas" className="hover:text-brand-red transition-colors">Rifas activas</Link></li>
              <li><Link href="/rifas-previas" className="hover:text-brand-red transition-colors">Rifas previas</Link></li>
              <li><Link href="/consulta" className="hover:text-brand-red transition-colors">Consultar boleto</Link></li>
              <li><Link href="/tarjetas" className="hover:text-brand-red transition-colors">Metodos de pago</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-red-500 font-bold mb-3 text-sm uppercase tracking-wider">Informacion</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/faq" className="hover:text-brand-red transition-colors">Preguntas frecuentes</Link></li>
              <li><Link href="/sobre-nosotros" className="hover:text-brand-red transition-colors">Sobre nosotros</Link></li>
              <li><Link href="/aviso-privacidad" className="hover:text-brand-red transition-colors">Aviso de privacidad</Link></li>
              <li>
                <a href="mailto:contacto@sorteosjans.com.mx" className="hover:text-brand-red transition-colors">
                  contacto@sorteosjans.com.mx
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <p>&copy; {new Date().getFullYear()} Sorteos Jans. Todos los derechos reservados.</p>
            <p className="text-gray-400">
              Desarrollada por{" "}
              <a 
                href="https://ibanidigital.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-white hover:text-brand-red font-bold transition-colors underline decoration-brand-red/50 decoration-2 underline-offset-4 hover:decoration-brand-red"
              >
                IBANI Digital
              </a>
            </p>
          </div>
          <Link href="/aviso-privacidad" className="hover:text-brand-red transition-colors text-gray-400 hover:text-gray-300">
            Aviso de privacidad
          </Link>
        </div>
      </div>
    </footer>
  );
}
