import { getRifa, getNumerosOcupados, getAppSettings } from "@/lib/firestore";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import RifaInteractive from "./RifaInteractive";
import ImageCarousel from "@/components/ImageCarousel";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const rifa = await getRifa(resolvedParams.id).catch(() => null);
  if (!rifa) return {};
  return {
    title: rifa.nombre,
    description: rifa.descripcion,
    openGraph: {
      title: rifa.nombre,
      description: rifa.descripcion,
      images: rifa.imagen_url ? [rifa.imagen_url] : undefined,
    },
  };
}

export default async function RifaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const rifa = await getRifa(resolvedParams.id).catch(() => null);
  if (!rifa) notFound();

  // Rifa inactiva sin ganador → 404
  if (!rifa.activa && !rifa.ganador) notFound();

  // Rifa con ganador → pagina de resultado
  if (rifa.ganador) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/rifas"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-red mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Rifas
        </Link>

        <ImageCarousel
          images={rifa.imagenes_url?.length ? rifa.imagenes_url : rifa.imagen_url ? [rifa.imagen_url] : []}
          alt={rifa.nombre}
        />

        <div className="mt-6">
          <div className="flex items-start gap-3 mb-2">
            <h1 className="text-3xl font-bold uppercase tracking-widest flex-1">{rifa.nombre}</h1>
            <span className={`flex-shrink-0 mt-1 text-xs font-bold px-3 py-1.5 rounded-sm ${rifa.activa ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-800 text-gray-400'}`}>
              {rifa.activa ? "Ganador Anunciado" : "Finalizada"}
            </span>
          </div>
          <p className="text-gray-400 mb-6">{rifa.descripcion}</p>

          {/* Ganador banner */}
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-sm p-6 mb-6">
            <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-2">Ganador</p>
            <div className="flex items-baseline gap-4">
              <span className="text-5xl font-bold text-yellow-400">#{rifa.ganador.numero}</span>
              <div>
                <p className="font-bold text-xl leading-tight text-white">{rifa.ganador.nombre} {rifa.ganador.apellidos}</p>
                <p className="text-sm text-gray-400 mt-0.5">Folio: {rifa.ganador.folio}</p>
              </div>
            </div>
          </div>

          <Link
            href="/rifas-previas"
            className="inline-flex items-center gap-2 text-sm text-brand-red hover:underline"
          >
            Ver todas las rifas anteriores
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  const [{ vendidos, apartados }, settings] = await Promise.all([
    getNumerosOcupados(resolvedParams.id).catch(() => ({ vendidos: [], apartados: [] })),
    getAppSettings().catch(() => ({ mostrar_apartados: true })),
  ]);
  return <RifaInteractive rifa={rifa} vendidos={vendidos} apartados={apartados} mostrarApartados={settings.mostrar_apartados} />;
}
