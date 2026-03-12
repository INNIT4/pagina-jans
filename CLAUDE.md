# Jans Rifas — CLAUDE.md

## Purpose
Web app for managing and selling raffle tickets online. Users browse active raffles, select numbers from an interactive grid, reserve tickets (status: "pendiente"), and pay via bank transfer. Admin verifies payment and marks tickets as paid. WhatsApp is the primary confirmation channel. Includes a CMS for site content, payment proof uploads, and role-based admin access.

## Tech Stack
- **Framework**: Next.js 14 (App Router) — TypeScript
- **Styling**: Tailwind CSS with `darkMode: "class"`, custom colors (brand-red, brand-black, brand-dark)
- **Database**: Firebase Firestore (client SDK + Admin SDK)
- **Auth**: Firebase Auth (email/password, admin-only) + HMAC-SHA256 signed session cookies
- **Storage**: Vercel Blob (image/file uploads with magic byte verification)
- **Rate Limiting**: Upstash Redis (optional, sliding window)
- **Theme**: `next-themes` (persisted dark mode toggle)
- **PDF**: `jspdf` + `jspdf-autotable` (client-side comprobante generation)
- **Icons**: `lucide-react`

## Key Directories

| Path | Purpose |
|---|---|
| `lib/firebase.ts` | Firebase client app init — exports `db`, `auth` |
| `lib/firebase-admin.ts` | Firebase Admin SDK init (server-only) — exports `adminAuth`, `adminDb()` |
| `lib/firestore.ts` | All Firestore types + CRUD helpers (~719 lines), one function per operation |
| `lib/session.ts` | HMAC-SHA256 signed session cookies (Edge Runtime compatible) |
| `lib/ratelimit.ts` | Upstash Redis rate limiting helper (graceful fallback if unconfigured) |
| `lib/whatsapp.ts` | WhatsApp rotation logic (client-side helper, calls API routes) |
| `lib/pdf.ts` | `downloadComprobante()` — generates PDF with jspdf |
| `lib/folio.ts` | `generateFolio()` — produces `JNS-XXXXXX` format |
| `middleware.ts` | CSP headers + admin auth guard with RBAC (admin vs staff roles) |
| `components/` | Shared UI: Navbar, Footer, NumberGrid, NumberSearch, ApartadoForm, BankCards, FloatingWhatsApp, CountdownTimer, ImageCarousel, RandomPicker |
| `components/admin/` | Admin-specific: RifaFormModal, RifaToggleGrid, ImageUploader |
| `app/rifas/[id]/` | Main purchase flow — grid + search + modal form |
| `app/admin/` | Full admin panel (13 sections) with RBAC |
| `app/api/` | 9 API routes (boletos, whatsapp, upload, discount, comprobantes, admin session) |
| `app/consulta/` | Ticket lookup by folio, phone, or number + PDF download |

## Public Routes

| Route | Purpose |
|---|---|
| `/` | Home page |
| `/rifas` | Browse active raffles (SSR, revalidate 60s) |
| `/rifas/[id]` | Interactive raffle page with number grid |
| `/rifas-previas` | Past/historical raffles |
| `/rifas-previas/[id]` | Past raffle details |
| `/consulta` | Ticket lookup by folio/celular/numero + PDF download |
| `/cuentas` | Bank account information |
| `/faq` | FAQ section |
| `/sobre-nosotros` | About page |
| `/aviso-privacidad` | Privacy policy |

## API Routes

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/admin/session` | POST/DELETE | Login (Firebase token → HMAC session), Logout | Firebase idToken |
| `/api/boletos/crear` | POST | Create reservation, server-side price calculation | Rate limited |
| `/api/boletos/consulta` | GET | Look up ticket by folio/celular/numero | Rate limited |
| `/api/discount/validate` | POST | Validate discount code | Rate limited |
| `/api/upload` | POST | Upload images to Vercel Blob | Session or Token |
| `/api/whatsapp/active` | GET | Check WhatsApp config status | None |
| `/api/whatsapp/rotate` | POST | Get current WhatsApp number + atomic rotation | Rate limited |
| `/api/whatsapp/support` | GET | Get help WhatsApp number | None |
| `/api/comprobantes/upload` | POST | Upload payment proof (image/PDF) | Rate limited (5/hr) |

## Admin Panel (13 sections)
All protected by middleware. **staff** role restricted to: boletos, comprobantes, servicios. **admin** has full access.

`rifas` · `boletos` · `clientes` · `codigos` · `whatsapp` · `tarjetas` · `comprobantes` · `contenido` (CMS) · `metricas` · `reportes` · `regalos` · `servicios` · `dashboard`

## Firestore Collections

| Collection | Purpose |
|---|---|
| `rifas` | Raffle definitions. Subcollection: `rifas/{id}/numeros/{numero}` for number status |
| `boletos` | Tickets/reservations (status: pendiente, pagado, cancelado) |
| `discount_codes` | Discount coupons with usage tracking and rifa restrictions |
| `whatsapp_config` | Singleton doc `config` — phone rotation array + support number |
| `bank_accounts` | Bank transfer info with color theming |
| `settings` | Singleton doc `config` — apartados visibility, auto-cancellation settings |
| `site_content` | Singleton doc `texts` — CMS content (hero, FAQ, about, values, etc.) |
| `comprobantes` | Payment proof submissions (image/PDF with review status) |
| `usuarios_admin` | Admin user roles (admin/staff) |

## Security Features
- **Session**: HMAC-SHA256 signed cookies via `lib/session.ts` (not JWT)
- **RBAC**: admin vs staff roles enforced in middleware
- **CSP**: Content Security Policy headers with nonce generation
- **Security headers**: X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Rate limiting**: Upstash Redis on sensitive endpoints (login, ticket creation, discount validation, comprobantes)
- **Server-side price**: Price calculated on server, never trusted from client
- **File validation**: Magic byte verification on uploads (not just MIME type)
- **Upload storage**: Vercel Blob (not public filesystem)

## Essential Commands
```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build + lint check
npx tsc --noEmit # type-check only
```

## Environment Variables
**Public**: `NEXT_PUBLIC_FIREBASE_*` (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, MEASUREMENT_ID), `NEXT_PUBLIC_SITE_URL`

**Secret**: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, `COOKIE_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `BLOB_READ_WRITE_TOKEN`

## Git Workflow
- **Siempre crear una rama** antes de cualquier bug fix o nuevo feature
- Nomenclatura: `fix/descripcion-corta` para bugs, `feat/descripcion-corta` para features
- Hacer push de la rama y merge a `main` solo cuando esté listo
- Nunca commitear directo a `main`

## Additional Documentation
- `.claude/docs/architectural_patterns.md` — rendering strategy, data flow, auth guard pattern, admin CRUD pattern, number state machine
