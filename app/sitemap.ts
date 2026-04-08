import { MetadataRoute } from "next";
import { adminDb } from "@/lib/firebase-admin";

const BASE_URL = "https://www.sorteosjans.com.mx";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  try {
    const db = adminDb();
    
    // Get CMS updated date
    const siteContent = await db.collection("site_content").doc("texts").get();
    const cmsDate = siteContent.data()?.updatedAt?.toDate?.() ?? now;

    const staticPages: MetadataRoute.Sitemap = [
      { url: `${BASE_URL}/`, lastModified: cmsDate },
      { url: `${BASE_URL}/rifas`, lastModified: cmsDate },
      { url: `${BASE_URL}/rifas-previas`, lastModified: cmsDate },
      { url: `${BASE_URL}/consulta`, lastModified: cmsDate },
      { url: `${BASE_URL}/tarjetas`, lastModified: cmsDate },
      { url: `${BASE_URL}/faq`, lastModified: cmsDate },
      { url: `${BASE_URL}/sobre-nosotros`, lastModified: cmsDate },
      { url: `${BASE_URL}/aviso-privacidad`, lastModified: new Date("2026-03-01") },
    ];

    // Rifas activas
    const activas = await db
      .collection("rifas")
      .where("activa", "==", true)
      .get();

    const rifasActivas: MetadataRoute.Sitemap = activas.docs.map((doc) => ({
      url: `${BASE_URL}/rifas/${doc.data().slug ?? doc.id}`,
      lastModified: doc.data().updatedAt?.toDate?.() ?? now,
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
        lastModified: doc.data().updatedAt?.toDate?.() ?? now,
      }));

    return [...staticPages, ...rifasActivas, ...rifasFinalizadas];
  } catch {
    const staticPages: MetadataRoute.Sitemap = [
      { url: `${BASE_URL}/`, lastModified: now },
      { url: `${BASE_URL}/rifas`, lastModified: now },
      { url: `${BASE_URL}/rifas-previas`, lastModified: now },
      { url: `${BASE_URL}/consulta`, lastModified: now },
      { url: `${BASE_URL}/tarjetas`, lastModified: now },
      { url: `${BASE_URL}/faq`, lastModified: now },
      { url: `${BASE_URL}/sobre-nosotros`, lastModified: now },
      { url: `${BASE_URL}/aviso-privacidad`, lastModified: new Date("2026-03-01") },
    ];
    return staticPages;
  }
}
