# Reporte de Auditoría — Jans Rifas (pagina-jans)

**Fecha:** 2026-04-15  
**Agentes ejecutados:** security-auditor, architect-reviewer, performance-engineer, code-reviewer, seo-technical  
**Puntuación SEO inicial:** 71/100  
**Puntuación seguridad estimada:** ~72%

---

## Estado de resolución

| ID | Severidad | Categoría | Descripción | Estado |
|----|-----------|-----------|-------------|--------|
| 1.1 | CRÍTICO | Seguridad | Firestore rules permiten escritura a cualquier usuario Firebase autenticado | ⬜ Pendiente |
| 1.2 | CRÍTICO | Seguridad | Bypass de restricción `rifa_ids` en descuentos (`/api/boletos/crear`) | ⬜ Pendiente |
| 1.3 | CRÍTICO | Seguridad | Números duplicados no validados en reserva | ⬜ Pendiente |
| 1.4 | CRÍTICO | Seguridad | Sin límite máximo de números por reserva (DoS económico) | ⬜ Pendiente |
| 1.5 | ALTO | Seguridad | Error messages internos de Firebase Admin expuestos al cliente | ⬜ Pendiente |
| 2.1 | ALTO | Seguridad | Rate limiting fail-open — sin fallback cuando Redis falla | ⬜ Pendiente |
| 2.2 | ALTO | Seguridad/Arq | 3 API routes sin `try/catch` global (`discount/validate`, `whatsapp/rotate`, `boletos/consulta`) | ⬜ Pendiente |
| 2.3 | MEDIO | Seguridad | XSS potencial en JSON-LD via `dangerouslySetInnerHTML` con datos del CMS | ⬜ Pendiente |
| 2.4 | ALTO | Performance | `RifaInteractive` doble-fetch: listener en rifa + `getDocs` completo de subcollección | ⬜ Pendiente |
| 2.5 | ALTO | Performance | `admin/metricas` — `onSnapshot` sin límite sobre colección `boletos` completa | ⬜ Pendiente |
| 3.1 | CRÍTICO | SEO | Canonical usa `resolvedParams.id` en lugar de `rifa.slug` (URLs duplicadas) | ⬜ Pendiente |
| 3.2 | ALTO | SEO/Perf | `ImageCarousel` usa `<img>` nativo — candidato LCP sin optimización WebP/AVIF | ⬜ Pendiente |
| 3.3 | ALTO | SEO | Redirect 307 en `/cuentas` en lugar de 308 permanente (pierde link equity) | ⬜ Pendiente |
| 3.4 | ALTO | SEO | Panel admin sin `noindex` declarativo en metadata | ⬜ Pendiente |
| 3.5 | ALTO | SEO | IndexNow no implementado (indexación lenta en Bing al activar rifas) | ⬜ Pendiente |
| 3.6 | MEDIO | SEO | Twitter card no se sobreescribe en páginas de rifa individual | ⬜ Pendiente |
| 4.1 | MEDIO | Performance | `NumberButton` sin `React.memo` — re-renders innecesarios en toda la grilla | ⬜ Pendiente |
| 4.2 | MEDIO | Performance | `numerosDisponibles` y Sets sin `useMemo` en `RifaInteractive` | ⬜ Pendiente |
| 4.3 | ALTO | Performance | `admin/clientes` descarga TODOS los boletos en loop (descarga masiva) | ⬜ Pendiente |
| 4.4 | BAJO | Performance | `jspdf-autotable` instalado pero nunca importado (dependencia muerta) | ⬜ Pendiente |
| 4.5 | BAJO | Performance | `revalidate = 30` en `/rifas/[id]` innecesario — onSnapshot sobreescribe en cliente | ⬜ Pendiente |
| 4.6 | BAJO | Performance | `/tarjetas` sin `revalidate` ISR — fetch Firestore en cada request | ⬜ Pendiente |
| 5.1 | MEDIO | SEO | `/rifas-previas/[id]` sin schema JSON-LD (Event con `eventStatus: EventCompleted`) | ⬜ Pendiente |
| 5.2 | MEDIO | SEO/Perf | `CountdownTimer` riesgo de hydration mismatch (CLS) | ⬜ Pendiente |
| 5.3 | MEDIO | SEO/Perf | Thumbnails del carrusel sin `width`/`height` HTML — CLS en franja de thumbnails | ⬜ Pendiente |
| 5.4 | MEDIO | SEO | `openGraph` faltante en `/rifas-previas` y canonical faltante en `/aviso-privacidad` | ⬜ Pendiente |
| 5.5 | MEDIO | SEO | Schema `Organization` en `<Script afterInteractive>` — no disponible en HTML inicial | ⬜ Pendiente |
| 5.6 | MEDIO | Arquitectura | Operaciones destructivas admin sin `try/catch` (cancel, revert, delete rifa) | ⬜ Pendiente |
| 5.7 | BAJO | Arquitectura | `ESTADOS_MX` duplicado en 2 archivos, `calcularSubtotal` duplicado en 2 archivos | ⬜ Pendiente |
| 5.8 | BAJO | SEO | Sin schema `BreadcrumbList` JSON-LD en páginas de rifa | ⬜ Pendiente |

---

## Sprint 1 — Seguridad crítica

### 1.1 Firestore rules
**Archivo:** `firestore.rules`  
**Problema:** Todas las reglas usan `request.auth != null`. Cualquier cuenta Firebase (creada con la API key pública) puede escribir en `rifas`, `boletos`, `discount_codes`, `whatsapp_config`, etc.  
**Fix:** Funciones `isAdmin()` e `isStaff()` verificando contra colección `usuarios_admin`.

### 1.2 Bypass rifa_ids en descuentos
**Archivo:** `app/api/boletos/crear/route.ts:124`  
**Problema:** `/api/discount/validate` valida `rifa_ids` pero `/api/boletos/crear` NO lo hace al aplicar el descuento.  
**Fix:** Agregar verificación `rifaIds.includes(rifa_id.trim())` antes de aplicar `descuentoPct`.

### 1.3 Números duplicados
**Archivo:** `app/api/boletos/crear/route.ts:45`  
**Problema:** `numeros: [5,5,5,5]` cobra 4 boletos pero reserva 1 número.  
**Fix:** `if (new Set(numeros).size !== numeros.length) return 400`.

### 1.4 Límite máximo de números
**Archivo:** `app/api/boletos/crear/route.ts:45`  
**Problema:** Sin límite superior — posible DoS económico en Firebase.  
**Fix:** `if (numeros.length > 100) return 400`.

### 1.5 Error messages verbosos
**Archivo:** `app/api/boletos/crear/route.ts:68`  
**Problema:** `err.message` de Firebase Admin devuelto al cliente.  
**Fix:** Mensaje genérico al cliente, `console.error` server-side.

---

## Sprint 2 — Seguridad alta + Performance crítica

### 2.1 Rate limiting fallback
**Archivo:** `lib/ratelimit.ts`  
**Problema:** Si Redis falla, `getRatelimit()` retorna `null` y los endpoints quedan sin protección.  
**Fix:** Fallback in-memory con `Map` + `ephemeralCache` de `@upstash/ratelimit`.

### 2.2 try/catch global en API routes
**Archivos:** `app/api/discount/validate/route.ts`, `app/api/whatsapp/rotate/route.ts`, `app/api/boletos/consulta/route.ts`  
**Problema:** Excepciones no capturadas devuelven 500 con posible stack trace.  
**Fix:** Envolver handler completo en `try/catch` con respuesta genérica.

### 2.3 XSS en JSON-LD
**Archivos:** `app/layout.tsx:119`, `app/rifas/[id]/page.tsx:104,170`, `app/faq/page.tsx:41`  
**Problema:** `dangerouslySetInnerHTML` con datos de Firestore sin escapar `</script>`.  
**Fix:** Helper `safeJsonLd()` que escapa `<`, `>`, `&` con unicode escapes.

### 2.4 RifaInteractive doble-fetch
**Archivo:** `app/rifas/[id]/RifaInteractive.tsx:39`  
**Problema:** `onSnapshot` en doc rifa → trigger → `getDocs` completo de subcollección `numeros`.  
**Fix:** `onSnapshot` directo en `collection(db, "rifas", id, "numeros")`.

### 2.5 admin/metricas sin límite
**Archivo:** `app/admin/metricas/page.tsx:100`  
**Problema:** `onSnapshot(collection(db, "boletos"))` descarga toda la colección.  
**Fix:** Query filtrada por `cutoff = now - 90 días` con `where("created_at", ">=", cutoff)`.

---

## Sprint 3 — SEO crítico + alto

### 3.1 Canonical con slug
**Archivo:** `app/rifas/[id]/page.tsx:19`, `app/rifas-previas/[id]/page.tsx:18`  
**Problema:** Canonical usa `resolvedParams.id` que puede ser el ID de Firestore, no el slug SEO.  
**Fix:** `rifa.slug ?? resolvedParams.id` después de obtener la rifa.

### 3.2 ImageCarousel → next/image
**Archivo:** `components/ImageCarousel.tsx:40`  
**Problema:** `<img>` nativo sin optimización — es el candidato LCP principal del sitio.  
**Fix:** `next/image` con `fill`, `priority` en imagen activa, `sizes` responsivo.

### 3.3 Redirect 308 en /cuentas
**Archivo:** `app/cuentas/page.tsx:4`  
**Problema:** `redirect("/tarjetas")` emite 307 — no transfiere PageRank.  
**Fix:** `redirect("/tarjetas", "permanent")`.

### 3.4 admin/layout.tsx noindex
**Archivo:** `app/admin/layout.tsx`  
**Problema:** Admin sin `noindex` explícito — segunda línea de defensa si robots.txt falla.  
**Fix:** `export const metadata = { robots: { index: false, follow: false, noarchive: true } }`.

### 3.5 IndexNow
**Problema:** Sin notificación a Bing al activar rifas — indexación lenta.  
**Fix:** UUID key en `public/`, POST a `api.indexnow.org` al activar/desactivar rifa.

### 3.6 Twitter card en rifas
**Archivo:** `app/rifas/[id]/page.tsx`  
**Problema:** Twitter card hereda del layout raíz en lugar de los datos de la rifa.  
**Fix:** Agregar `twitter: { card, title, description, images }` en `generateMetadata`.

---

## Sprint 4 — Performance media + quick wins

### 4.1 React.memo en NumberButton
**Archivo:** `components/NumberGrid.tsx`  
**Fix:** `const NumberButton = React.memo(function NumberButton(...) { ... })`.

### 4.2 useMemo en RifaInteractive
**Archivo:** `app/rifas/[id]/RifaInteractive.tsx:65`  
**Fix:** `useMemo` para `vendidosSet`, `apartadosSet`, `numerosDisponibles`.

### 4.3 admin/clientes descarga masiva
**Archivo:** `app/admin/clientes/page.tsx:24`  
**Problema:** Loop `while(true)` cargando todos los boletos en memoria para derivar clientes.  
**Fix:** Query con `limit` + paginación, o vista paginada sin construir lista de clientes en memoria.

### 4.4 Eliminar jspdf-autotable
`npm uninstall jspdf-autotable` — instalado pero nunca importado.

### 4.5 revalidate en /rifas/[id]
**Archivo:** `app/rifas/[id]/page.tsx:8`  
**Fix:** `export const revalidate = 300` (era 30).

### 4.6 revalidate en /tarjetas
**Archivo:** `app/tarjetas/page.tsx`  
**Fix:** `export const revalidate = 3600`.

---

## Sprint 5 — SEO medio + deuda técnica

### 5.1 Schema en rifas-previas/[id]
**Archivo:** `app/rifas-previas/[id]/page.tsx`  
**Fix:** Schema `Event` con `eventStatus: "https://schema.org/EventCompleted"` y datos del ganador.

### 5.2 CountdownTimer hydration
**Archivo:** `components/CountdownTimer.tsx`  
**Fix:** Retornar `null` hasta que el componente esté montado (`useEffect` + `mounted` state).

### 5.3 Thumbnails CLS
**Archivo:** `components/ImageCarousel.tsx:99`  
**Fix:** Agregar `width={80} height={56}` a `<img>` de thumbnails.

### 5.4 Metadata faltante
- `/rifas-previas/page.tsx` — agregar bloque `openGraph`
- `/aviso-privacidad/page.tsx` — agregar `alternates.canonical`

### 5.5 Schema Organization en head
**Archivo:** `app/layout.tsx:116`  
**Problema:** `<Script strategy="afterInteractive">` — schema no disponible en HTML inicial.  
**Fix:** Reemplazar por `<script type="application/ld+json">` JSX estático.

### 5.6 try/catch en operaciones admin destructivas
**Archivos:** `app/admin/boletos/page.tsx:150,161`, `app/admin/rifas/page.tsx:97`  
**Fix:** Envolver `handleCancel`, `handleRevertir`, `handleDelete` en `try/catch`.

### 5.7 Constantes duplicadas
- `ESTADOS_MX` → extraer a `lib/constants.ts`
- `calcularSubtotal` → extraer a `lib/utils/pricing.ts`

### 5.8 BreadcrumbList JSON-LD
**Archivo:** `app/rifas/[id]/page.tsx`  
**Fix:** Schema `BreadcrumbList` con 3 niveles: Inicio → Rifas → [nombre rifa].

---

## Hallazgos positivos (no requieren acción)

1. Precio calculado server-side en `crear/route.ts` — nunca se confía del cliente
2. Magic byte verification en ambos endpoints de upload
3. HMAC-SHA256 sessions en lugar de JWT
4. Reserva atómica con transacción Firestore
5. Celular parcialmente enmascarado en consulta pública
6. Security headers completos (HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
7. SameSite=Strict en cookies de sesión
8. Vercel Blob para storage — sin uploads al filesystem público
9. Rate limiting diferenciado por endpoint
10. Sitemap dinámico con Firestore + fallback estático
11. `robots.ts` con `Disallow: /admin/` y `/api/`
12. `public/llms.txt` para optimización GEO
