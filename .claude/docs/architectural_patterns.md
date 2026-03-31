# Architectural Patterns

## 1. Rendering Strategy — Server vs Client split

Public pages that only read data use **Server Components** with `revalidate`:
- `app/page.tsx`, `app/rifas/page.tsx`, `app/rifas-previas/page.tsx`

Pages that need interactivity or Firebase Auth (client SDK only) use `"use client"`:
- All admin pages, `app/rifas/[id]/page.tsx`, `app/consulta/page.tsx`

**Rule**: if the page writes to Firestore or needs user events → `"use client"`. If it only reads public data → Server Component with `try/catch` around Firebase calls (gracefully handles missing credentials at build time).

## 2. Firestore Data Layer — Thin function-per-operation

`lib/firestore.ts` exports one async function per Firestore operation. No class, no abstraction layer. All types (`Rifa`, `Boleto`, `DiscountCode`, `WhatsAppConfig`, `BankAccount`, `Comprobante`, `SiteContent`, `Settings`) are defined and exported from this single file.

Pattern for reads:
```
getDocs/getDoc → map docs to { id: d.id, ...d.data() } as Type
```

Pages import directly from `@/lib/firestore` — no intermediate service layer.

## 3. Admin CRUD Pattern

Every admin page follows the same structure:
1. `load()` async function → calls `lib/firestore.ts` getter → sets state
2. `useEffect(() => { load(); }, [])` on mount
3. Local modal state (`showForm`, `editId`) controls a form overlay
4. Save handler calls create or update depending on `editId !== null`, then calls `load()` again
5. Optimistic UI avoided — always re-fetches after mutations

## 4. Number State Machine

Raffle numbers are stored as a subcollection `rifas/{id}/numeros/{numero}` with status tracking. Component state in `NumberGrid` manages local selection.

| State | Source | Color |
|---|---|---|
| `disponible` | not reserved | green |
| `seleccionado` | local `useState` | blue |
| `apartado` | boleto status "pendiente" | yellow |
| `vendido` | boleto status "pagado" | red |

Reservation uses atomic Firestore transactions to prevent double-booking.

Supports "oportunidades" mode: multiple entries per number for larger number ranges. Numbers stored in boleto as `numeros` (primary) and `numeros_completos` (all variants).

## 5. Auth Guard — Three-layer

**Layer 1 — Middleware** (`middleware.ts`): HMAC-signed session cookie verification + RBAC. Generates CSP nonce. Redirects to `/admin/login` if session invalid. Restricts staff role to specific routes (boletos, comprobantes, servicios).

**Layer 2 — Client layout** (`app/admin/layout.tsx`): `onAuthStateChanged` verifies Firebase session. If no user → redirect to login. Renders spinner while checking.

**Layer 3 — API session** (`lib/session.ts`): HMAC-SHA256 signed cookies created on login via `/api/admin/session`. Contains user role for RBAC decisions.

## 6. WhatsApp Rotation — Server-side atomic

Primary implementation in API routes:
- `/api/whatsapp/rotate` — atomic read + increment of `indice_actual` in `whatsapp_config` singleton doc
- `/api/whatsapp/active` — checks if WhatsApp config is active (returns boolean flags)
- `/api/whatsapp/support` — returns global help number

`lib/whatsapp.ts` is a client helper that calls these API routes.

## 7. PDF Generation — Dynamic import

`lib/pdf.ts` uses dynamic `import("jspdf")` to avoid SSR errors since jspdf is browser-only:
```ts
const { jsPDF } = await import("jspdf");
```
File is marked `"use client"` and only called from the `consulta` page on button click. Uses `jspdf-autotable` for table formatting.

## 8. Rate Limiting Pattern

`lib/ratelimit.ts` wraps Upstash Redis sliding window. Gracefully degrades if `UPSTASH_REDIS_REST_URL` is not configured (allows all requests).

Applied in API routes via:
```ts
const { success } = await ratelimit.limit(identifier);
if (!success) return NextResponse.json({ error: "..." }, { status: 429 });
```

## 9. File Upload Pattern

Uses Vercel Blob for storage (`@vercel/blob`). Validation pipeline:
1. Check file size limit
2. Verify MIME type against allowlist
3. Validate magic bytes (file signature) — not just MIME
4. Upload to Vercel Blob → get public URL
5. Store URL in Firestore document

Used in: admin image uploads (`/api/upload`), payment proof submissions (`/api/comprobantes/upload`).

## 10. Security Headers — Middleware

`middleware.ts` generates a CSP nonce per request and injects security headers:
- Content-Security-Policy (with nonce for inline scripts)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy (restrictive)

`next.config.mjs` also adds security headers as a fallback for routes not matched by middleware.
