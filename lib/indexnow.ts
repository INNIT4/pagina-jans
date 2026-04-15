const INDEXNOW_KEY = "05a66042befee4c4405acc4ee210ebb3";
const SITE_HOST = "www.sorteosjans.com.mx";

/**
 * Notifica a IndexNow (Bing, Yandex) cuando una URL cambia.
 * Silencia errores — si falla, no debe interrumpir la operación principal.
 */
export async function notifyIndexNow(urls: string[]): Promise<void> {
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: SITE_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
  } catch (err) {
    console.error("[indexnow] Error al notificar:", err);
  }
}
