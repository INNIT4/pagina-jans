# Jans Rifas — CLAUDE.md

## Purpose
Web app for managing and selling raffle tickets online. Users browse active raffles, select numbers from an interactive grid, reserve tickets (status: "pendiente"), and pay via bank transfer. Admin verifies payment and marks tickets as paid. WhatsApp is the primary confirmation channel.

## Tech Stack
- **Framework**: Next.js 14 (App Router) — TypeScript
- **Styling**: Tailwind CSS with `darkMode: "class"`
- **Database**: Firebase Firestore
- **Auth**: Firebase Auth (email/password, admin-only)
- **Theme**: `next-themes` (persisted dark mode toggle)
- **PDF**: `jspdf` (client-side comprobante generation)

## Key Directories

| Path | Purpose |
|---|---|
| `lib/firebase.ts` | Firebase app init — exports `db`, `auth` |
| `lib/firestore.ts` | All Firestore types + CRUD helpers, one function per operation |
| `lib/whatsapp.ts` | WhatsApp rotation logic (client-side helper) |
| `lib/pdf.ts` | `downloadComprobante()` — generates PDF with jspdf |
| `lib/folio.ts` | `generateFolio()` — produces `JNS-XXXXXX` format |
| `middleware.ts` | Protects `/admin/*` via `admin_token` cookie check |
| `components/` | Shared UI: Navbar, NumberGrid, NumberSearch, ApartadoForm, BankCards, FloatingWhatsApp |
| `app/rifas/[id]/` | Main purchase flow — grid + search + modal form |
| `app/admin/` | Full admin panel (7 sections: rifas, boletos, clientes, codigos, whatsapp, tarjetas) |
| `app/api/whatsapp/` | Server-side WhatsApp rotation — reads/writes Firestore |
| `app/consulta/` | Ticket lookup by folio or phone + PDF download |

## Firestore Collections
`rifas` · `boletos` · `discount_codes` · `whatsapp_config` (singleton doc `config`) · `bank_accounts`

## Essential Commands
```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build + lint check
npx tsc --noEmit # type-check only
```

## Environment
All Firebase credentials in `.env.local` — prefix `NEXT_PUBLIC_FIREBASE_*`.
See `.env.local` for required keys.

## Additional Documentation
- `.claude/docs/architectural_patterns.md` — rendering strategy, data flow, auth guard pattern, admin CRUD pattern, number state machine
