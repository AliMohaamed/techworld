# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is an npm workspace monorepo managed by Turborepo with three packages:

- **`apps/storefront`** – Public-facing Next.js storefront (port 3000, `@techworld/storefront`)
- **`apps/admin`** – Internal Next.js admin dashboard (port 3001, `@techworld/admin`)
- **`packages/backend`** – Convex backend (all business logic, schema, mutations, queries)
- **`packages/ui`** – Shared component library built on shadcn/Radix UI (`@techworld/ui`)

## Development Commands

Run from the repo root:

```bash
npm run dev               # All apps in parallel (Turborepo)
npm run dev:storefront    # Storefront only (port 3000)
npm run dev:admin         # Admin only (port 3001)
npm run dev:backend       # Convex dev server (required when changing backend)
npm run build             # Build all apps
npm run lint              # Lint all apps
```

The Convex backend (`npm run dev:backend`) must be running separately when making schema or function changes — it watches `packages/backend/convex/` and pushes to the configured deployment.

## Environment Variables

Each workspace has its own `.env.local`. The critical variables:

- `NEXT_PUBLIC_CONVEX_URL` – Convex deployment URL (required in all apps)
- `CONVEX_DEPLOYMENT` – Deployment identifier (e.g. `dev:clean-heron-293`)
- `NEXT_PUBLIC_CONVEX_SITE_URL` – Used for auth HTTP endpoints
- `NEXT_PUBLIC_SITE_URL` / `SITE_URL` – Admin app URL (used by better-auth as `baseURL`)
- `BETTER_AUTH_SECRET` – Admin auth secret (only in `apps/admin/.env.local`)

## Architecture

### Backend (Convex)

All backend code lives in `packages/backend/convex/`. Convex handles realtime queries, mutations, scheduled jobs, and file storage.

**Authentication** (`auth.ts`, `auth.config.ts`): Admin-only auth via `@convex-dev/better-auth` with email+password. The storefront has no user auth — it uses anonymous `sessionId` (UUID) stored client-side to track cart sessions and orders.

**RBAC** (`lib/permissions.ts`, `lib/rbac.ts`): Permission-flag based (not role based). The `users` table stores an array of `Permission` strings. Every protected mutation/query calls `requirePermission(ctx, "PERMISSION_NAME")`. Available permissions: `VIEW_ORDERS`, `VERIFY_PAYMENTS`, `MANAGE_SHIPPING_STATUS`, `PROCESS_RETURNS`, `MANAGE_PRODUCTS`, `ADJUST_REAL_STOCK`, `MANAGE_DISPLAY_STOCK`, `MANAGE_CATEGORIES`, `VIEW_FINANCIALS`, `MANAGE_SYSTEM_CONFIG`, `RESOLVE_FRAUD`, `VIEW_ANALYTICS`, `VIEW_AUDIT_LOGS`, `MANAGE_USERS`.

**Audit logging** (`lib/audit.ts`): Use `writeAuditLog()` inside mutations or `scheduleAuditLog()` when inside a query context. Every state transition and inventory change must log to `audit_logs`.

**Order FSM** (`schema.ts`): Strict state machine — `PENDING_PAYMENT_INPUT → AWAITING_VERIFICATION → CONFIRMED → READY_FOR_SHIPPING → SHIPPED → DELIVERED`. Out-of-flow states: `RTO`, `STALLED_PAYMENT`, `CANCELLED`, `FLAGGED_FRAUD`. Invalid transitions must be rejected.

**Stock model** (on `skus` table): Two decoupled fields:
- `display_stock` – decremented when an order is placed (virtual reservation)
- `real_stock` – decremented only when an order transitions to `CONFIRMED`
- `real_stock` may drop to `-5` as an overselling buffer; anything below `-5` must throw
- On cancellation/rejection: do NOT increment `display_stock`; instead apply soft-sync: if `display_stock < real_stock`, set `display_stock = real_stock`

**Scheduled crons** (`crons.ts`): Daily at UTC 00:00 — marks `PENDING_PAYMENT_INPUT` orders older than 24h as `STALLED_PAYMENT`. Daily at UTC 01:00 — sweeps orphaned Convex storage files.

**Webhook** (`webhooks.ts`, `http.ts`): WhatsApp payment receipt webhook at `/api/webhook/whatsapp`. Receipts are stored in `webhook_receipts` table and matched to orders by extracted order codes.

### Admin App

**Auth shell** (`components/auth/admin-auth-shell.tsx`): Wraps all pages. Uses Convex's `<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>` components. After authentication checks, it loads `getCurrentStaffProfile` (which resolves user + permissions from the `users` table). Access denied and deactivated account states are shown before any dashboard content renders.

**Sidebar permissions**: `Sidebar.tsx` receives the user's `permissions` array and renders nav items conditionally based on required permissions.

**Backend import path**: Admin imports Convex API as `import { api } from "@backend/convex/_generated/api"` (path alias `@backend` maps to `packages/backend`).

### Storefront App

Uses Convex in anonymous/public mode — no auth provider. The `ConvexClientProvider` wraps the app with a plain `ConvexProvider`. Cart state is managed server-side in Convex under the user's `sessionId`.

### Shared UI Package

`packages/ui` exports: `@techworld/ui` (index with ThemeProvider, ThemeToggle, Sheet, cn, etc.), `@techworld/ui/button`, `@techworld/ui/toaster`, `@techworld/ui/utils`, `@techworld/ui/styles.css`.

## Internationalisation

Both apps support Arabic (`ar`) and English (`en`) via `next-intl`. Routes use `[locale]` segments. Arabic sets `dir="rtl"` on `<html>` and switches to Cairo font; English uses Inter (admin) or Space Grotesk (storefront). Translation files live under `apps/*/src/messages/{locale}/`.

Use `ltr:` and `rtl:` Tailwind variants (e.g. `ltr:mr-2 rtl:ml-2`) for directional spacing.

## Key Convex Patterns

- Use `requirePermission(ctx, permission)` at the top of every admin mutation/query
- Always call `writeAuditLog` or `scheduleAuditLog` after any state-changing operation
- `storageRef` in schema is `v.union(v.string(), v.id("_storage"))` — handle both cases when calling `ctx.storage.getUrl()`
- Generated types live in `packages/backend/convex/_generated/` — never edit these manually; they are regenerated by `npx convex dev`
- The `users` table `identifier` field links to the better-auth userId. When looking up users, try `by_identifier` first then fall back to `by_email` (legacy repair path)
