import { getRifa, getNumerosOcupados } from "@/lib/firestore";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import RifaInteractive from "./RifaInteractive";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const rifa = await getRifa(params.id).catch(() => null);
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

export default async function RifaDetailPage({ params }: { params: { id: string } }) {
  const rifa = await getRifa(params.id).catch(() => null);
  if (!rifa || !rifa.activa) notFound();
  const { vendidos, apartados } = await getNumerosOcupados(params.id);
  return <RifaInteractive rifa={rifa} vendidos={vendidos} apartados={apartados} />;
}
