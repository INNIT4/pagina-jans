import { MetadataRoute } from "next";
import { adminDb } from "@/lib/firebase-admin";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sorteosjans.com.mx";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, priority: 1.0, changeFrequency: "daily" },
    { url: `${BASE_URL}/rifas`, priority: 0.9, changeFrequency: "daily" },
    { url: `${BASE_URL}/rifas-previas`, priority: 0.6, changeFrequency: "weekly" },
    { url: `${BASE_URL}/consulta`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE_URL}/tarjetas`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${BASE_URL}/faq`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${BASE_URL}/sobre-nosotros`, priority: 0.4, changeFrequency: "monthly" },
    { url: `${BASE_URL}/aviso-privacidad`, priority: 0.3, changeFrequency: "yearly" },
  ];

  try {
    const db = adminDb();

    // Rifas activas
    const activas = await db
      .collection("rifas")
      .where("activa", "==", true)
      .get();

    const rifasActivas: MetadataRoute.Sitemap = activas.docs.map((doc) => ({
      url: `${BASE_URL}/rifas/${doc.id}`,
      priority: 0.8,
      changeFrequency: "hourly" as const,
    }));

    // Rifas finalizadas (con ganador)
    const finalizadas = await db
      .collection("rifas")
      .where("activa", "==", false)
      .get();

    const rifasFinalizadas: MetadataRoute.Sitemap = finalizadas.docs
      .filter((doc) => doc.data().ganador)
      .map((doc) => ({
        url: `${BASE_URL}/rifas-previas/${doc.id}`,
        priority: 0.5,
        changeFrequency: "yearly" as const,
      }));

    return [...staticPages, ...rifasActivas, ...rifasFinalizadas];
  } catch {
    return staticPages;
  }
}
