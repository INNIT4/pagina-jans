import { getRifa } from "@/lib/firestore";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ImageCarousel from "@/components/ImageCarousel";
import Link from "next/link";
import { safeJsonLd } from "@/lib/safe-json-ld";

export const revalidate = 300;

const SITE_URL = "https://www.sorteosjans.com.mx";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const rifa = await getRifa(resolvedParams.id).catch(() => null);
  if (!rifa) return {};
  const slug = rifa.slug ?? resolvedParams.id;
  return {
    title: `${rifa.nombre} (Finalizada)`,
    description: rifa.descripcion,
    alternates: { canonical: `${SITE_URL}/rifas-previas/${slug}` },
    openGraph: {
      title: `${rifa.nombre} (Finalizada)`,
      description: rifa.descripcion,
      url: `${SITE_URL}/rifas-previas/${slug}`,
      images: rifa.imagen_url ? [rifa.imagen_url] : undefined,
      type: "website",
    },
  };
}

export default async function RifaPreviaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const rifa = await getRifa(resolvedParams.id).catch(() => null);

  if (!rifa) notFound();

  const slug = rifa.slug ?? resolvedParams.id;
  const rifaUrl = `${SITE_URL}/rifas-previas/${slug}`;
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: rifa.nombre,
    description: rifa.descripcion,
    url: rifaUrl,
    eventStatus: "https://schema.org/EventCompleted",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    startDate: rifa.fecha_sorteo,
    endDate: rifa.fecha_sorteo,
    organizer: {
      "@type": "Organization",
      name: "Sorteos Jans",
      url: SITE_URL,
    },
    ...(rifa.imagen_url ? { image: rifa.imagen_url } : {}),
    ...(rifa.ganador
      ? {
          winner: {
            "@type": "Person",
            name: `${rifa.ganador.nombre} ${rifa.ganador.apellidos}`,
          },
        }
      : {}),
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(eventSchema) }}
      />
      {/* Back link */}
      <Link
        href="/rifas-previas"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-red mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Rifas Previas
      </Link>

      {/* Carousel */}
      <ImageCarousel
        images={
          rifa.imagenes_url?.length
            ? rifa.imagenes_url
            : rifa.imagen_url
            ? [rifa.imagen_url]
            : []
        }
        alt={rifa.nombre}
      />

      {/* Header */}
      <div className="mt-6 mb-8">
        <div className="flex items-start gap-3 mb-2">
          <h1 className="text-3xl font-bold uppercase tracking-widest flex-1">{rifa.nombre}</h1>
          <span className="flex-shrink-0 mt-1 bg-gray-800 text-gray-400 text-xs font-bold px-3 py-1.5 rounded-sm">
            Finalizada
          </span>
        </div>
        <span className="accent-bar" />
        <p className="text-gray-400 mb-4 mt-4">{rifa.descripcion}</p>

        {/* Ganador banner */}
        {rifa.ganador && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-sm p-5 mb-6">
            <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-1">Boleto Ganador</p>
            <span className="text-4xl font-bold text-yellow-400">#{rifa.ganador.numero}</span>
          </div>
        )}

        {rifa.texto_inferior && (
          <div className="bg-brand-dark border border-gray-800 rounded-sm p-5 mb-4 whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
            {rifa.texto_inferior}
          </div>
        )}

        {/* Info chips */}
        <div className="flex flex-wrap gap-3">
          <div className="bg-brand-dark border border-gray-800 rounded-sm px-4 py-2">
            <p className="text-xs text-gray-500">Precio boleto</p>
            <p className="font-bold text-lg text-white">${rifa.precio_boleto.toLocaleString("es-MX")} MXN</p>
          </div>
          <div className="bg-brand-dark border border-gray-800 rounded-sm px-4 py-2">
            <p className="text-xs text-gray-500">Fecha sorteo</p>
            <p className="font-bold text-white">{new Date(rifa.fecha_sorteo).toLocaleDateString("es-MX")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
