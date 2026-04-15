/**
 * Serializa un objeto a JSON seguro para insertar en <script type="application/ld+json">.
 * Escapa secuencias que podrían cerrar el tag script o inyectar HTML.
 * Los parsers JSON aceptan los unicode escapes como equivalentes al carácter original,
 * por lo que el schema sigue siendo válido para buscadores.
 */
export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
