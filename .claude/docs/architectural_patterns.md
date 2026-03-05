# Architectural Patterns

## 1. Rendering Strategy — Server vs Client split

Public pages that only read data use **Server Components** with `revalidate`:
- `app/page.tsx:1`, `app/rifas/page.tsx:1`, `app/rifas-previas/page.tsx:1`

Pages that need interactivity or Firebase Auth (client SDK only) use `"use client"`:
- All admin pages, `app/rifas/[id]/page.tsx`, `app/consulta/page.tsx`

**Rule**: if the page writes to Firestore or needs user events → `"use client"`. If it only reads public data → Server Component with `try/catch` around Firebase calls (gracefully handles missing credentials at build time).

## 2. Firestore Data Layer — Thin function-per-operation

`lib/firestore.ts` exports one async function per Firestore operation. No class, no abstraction layer. All types (`Rifa`, `Boleto`, `DiscountCode`, `WhatsAppConfig`, `BankAccount`) are defined and exported from this single file.

Pattern for reads: `lib/firestore.ts:76-84`
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

Examples: `app/admin/rifas/page.tsx`, `app/admin/codigos/page.tsx`, `app/admin/tarjetas/page.tsx`

## 4. Number State Machine

Raffle numbers have 4 states managed across two arrays in the `rifas` document and local component state:

| State | Source | Color |
|---|---|---|
| `disponible` | not in any array | green |
| `seleccionado` | local `useState` in `app/rifas/[id]/page.tsx:16` | blue |
| `apartado` | `rifa.numeros_apartados[]` | yellow |
| `vendido` | `rifa.numeros_vendidos[]` | red |

Transition on purchase: user selects → `createBoleto()` → appended to `numeros_apartados`.
Transition on payment confirmed: admin clicks "Marcar pagado" → removed from `numeros_apartados`, added to `numeros_vendidos`. See `app/admin/boletos/page.tsx:22-38`.

## 5. Auth Guard — Two-layer

**Layer 1 — Middleware** (`middleware.ts:4-14`): cookie-based, runs on the Edge. Redirects to `/admin/login` if `admin_token` cookie is absent. Fast but not cryptographically verified.

**Layer 2 — Client layout** (`app/admin/layout.tsx:18-28`): `onAuthStateChanged` verifies Firebase session. If no user → `router.push("/admin/login")`. Renders a spinner while checking.

Cookie is set in `app/admin/login/page.tsx:20` after `getIdToken()` succeeds.

## 6. WhatsApp Rotation — Dual implementation

Rotation logic exists in two places intentionally:
- `app/api/whatsapp/route.ts` — server route, called by `FloatingWhatsApp` and `ApartadoForm` via `fetch("/api/whatsapp")`
- `lib/whatsapp.ts` — client helper (unused at runtime, available for direct import if needed)

The route reads `whatsapp_config` singleton doc, compares `now - ultima_rotacion` against `intervalo_horas`, increments `indice_actual` if due, writes back, and returns the current number. Interval of `0` means rotate on every call.

## 7. PDF Generation — Dynamic import

`lib/pdf.ts` uses dynamic `import("jspdf")` to avoid SSR errors since jspdf is browser-only:
```ts
const { jsPDF } = await import("jspdf");  // lib/pdf.ts:7
```
File is marked `"use client"` and only called from the `consulta` page on button click.
