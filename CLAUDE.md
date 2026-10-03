# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Awan POS** — a multi-tenant SaaS point-of-sale system targeting Indonesian retailers (defaults: IDR currency, `Asia/Jakarta` timezone, `en`/`id` UI languages). Next.js 16 App Router + React 19, Prisma 5 on PostgreSQL (Neon), Better Auth, Tailwind v4 + shadcn/ui (new-york). Ships as a web app, an installable PWA with offline order capture, and an (early-stage) Electron wrapper.

`ROADMAP.md` and `UI_UX_ROADMAP.md` track feature phases as checklists — check them before starting a feature, and tick items off when you complete them.

## Commands

```bash
npm run dev              # Next dev server (Turbopack) on :3000
npm run build            # prisma generate && next build
npm run lint             # eslint (flat config, next core-web-vitals + typescript)
npx tsc --noEmit         # type check (no dedicated script)

npx prisma migrate dev --name <name>   # create + apply a migration
npx prisma generate                    # regenerate client after schema edits
npm run db:seed                        # tsx prisma/seed.ts

npm run electron:dev     # dev server + Electron window
```

There is **no test framework**. `scripts/*.ts` are ad-hoc tsx scripts (e.g. `scripts/seed-100k.ts` for load data, `scripts/verify-product-logic.ts`); run with `npx tsx scripts/<file>.ts`. Env lives in `.env.local` (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`). Prisma CLI does not read `.env.local` automatically.

## Architecture

### Request auth & tenancy

- **`src/proxy.ts`** is the Next 16 middleware (replaces `middleware.ts`; `src/middleware.ts.bak` is the old one). It only checks for the Better Auth session cookie — API routes get `401` JSON, pages redirect to `/sign-in?redirect_url=…`. It also does in-memory per-IP rate limiting for sign-in, sign-up, and `POST /api/orders`. Public paths are listed in `PUBLIC_PATHS`.
- **`src/lib/better-auth.ts`** configures Better Auth (email/password, Prisma adapter). `tenantId` and `role` are `additionalFields` on the user, not user-settable. Catch-all handler: `src/app/api/auth/[...all]/route.ts`. Client: `src/lib/auth-client.ts`.
- **`src/lib/auth.ts` → `getAuthUser()`** is the real auth gate for every API route. It returns either `{ user, tenantId }` or `{ error, status }` (403 if the user has no tenant yet → onboarding). Every route starts with:

  ```ts
  const authResult = await getAuthUser();
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const { tenantId } = authResult.user;
  ```

- **Tenant isolation is manual.** There is no Prisma middleware/extension enforcing it — every query must include `tenantId` in its `where` (use `findFirst({ where: { id, tenantId } })`, not `findUnique({ where: { id } })`, for single-record lookups). Child models (`ProductVariant`, `OrderItem`, `PaymentEntry`, `PurchaseOrderItem`, …) have no `tenantId` and are scoped through their parent.
- **Tenant creation** happens in `POST /api/onboarding` (transaction: create `Tenant`, default roles, assign user). `createDefaultRoles()` in `src/lib/permissions.ts` seeds Owner/Manager/Cashier.
- **Permissions:** DB-backed RBAC (`UserRole` → `Permission` with `PermissionAction` × `PermissionResource`; `MANAGE` implies all actions). `hasPermission()` in `src/lib/permissions.ts` lets `role === 'owner'` do everything and falls back to `ROLE_TEMPLATES` for users without a custom role. **Every API handler checks a permission** right after auth:

  ```ts
  const denied = await requirePermission(authResult.user, 'EDIT', 'PRODUCTS');
  if (denied) return denied;
  ```

  Exceptions: GETs every screen needs (categories, tenant settings, `tenant/me`, SKU settings) are open to any signed-in user. Cashiers keep POS work: `CREATE:ORDERS` covers shifts and petty cash; they can create returns but not approve them (`EDIT:RETURNS`). The UI mirrors this: `src/lib/page-access.ts` maps dashboard paths to permissions, `usePermissions()` (from `GET /api/me/permissions`) filters `Sidebar`/`MobileBottomNav`, and `PageGuard` blocks pages. A new page needs an entry in `page-access.ts`; a new resource needs an enum value, a migration granting it to existing roles, and a `ROLE_TEMPLATES` update.

### API conventions (`src/app/api/**/route.ts`)

- Plain route handlers; no server actions, no tRPC. Dynamic params are async: `{ params }: { params: Promise<{ id: string }> }` → `const { id } = await params`.
- List endpoints use **cursor pagination**: fetch `take: limit + 1`, return `{ data | <plural>, nextCursor, hasMore }`; `limit` capped at 100. Search uses `contains` + `mode: 'insensitive'`.
- Errors: `NextResponse.json({ error: "..." }, { status })`, wrapped in try/catch with `console.error`.
- Mutations call `logCrudAudit(...)` / `logAudit(...)` from `src/lib/audit.ts` (never throws). Adding a new audited entity means extending the `AuditResource` union there.
- Multi-step stock/money changes (orders, returns approval, PO receiving, stock adjustments, petty cash) run inside `prisma.$transaction`.
- `/api/debug/*` routes must keep their `NODE_ENV !== 'development'` guard.
- Never return **409** from `POST /api/orders` for a refused sale: `src/lib/sync.ts` treats 409 as "already synced" and drops the offline order. Checkout validation errors use 422 (`CheckoutError`).

### Domain model (`prisma/schema.prisma`)

`Tenant` is the root and also holds all settings (receipt, POS, localization, SKU auto-generation, loyalty, `enableStockManagement`). Key flows:

- **Catalog:** `Product` → `ProductOption`/`ProductOptionValue` → `ProductVariant` (holds `sku`, `price`, `cost`, `stock`). Hierarchical `Category` (self-referencing `parentId`). SKUs generated by `src/lib/sku-generator.ts` using the tenant's `skuFormat`/`skuCounter`.
- **Stock modes:** `Product.stockMode` is `PER_VARIANT` (default, stock on each variant) or `SHARED_POOL`. A pooled product keeps one count in `sharedStock`, in its `baseUnit`, and its variants are pack sizes (`unitId` + whole-number `conversionFactor`, no options). For pooled products, `variant.stock` stays 0 and `variant.cost` = `poolCost × conversionFactor`. **All stock movement goes through `src/lib/stock.ts`:**
  - `loadStockTargets` → `groupDemand` (adds up pooled lines per pool) → `checkAvailability` → `takeStock` (atomic) for sales
  - `putStock` for returns, PO receipts and adjustments
  - `syncPoolVariantCosts` after changing `poolCost`
  - `withAvailableStock` on API responses, so pooled variants show the units the pool can supply

  Never write `productVariant.stock` directly. Units of measure are per tenant (`Unit`, defaults in `src/lib/units.ts`, managed at `/dashboard/settings/units`). Browser code imports stock maths from `src/lib/stock-math.ts`, not `stock.ts`. Scenario check: `scripts/verify-shared-stock.ts` (test database only).
- **Sales:** `Order` → `OrderItem` (snapshots `price`/`cost`/discount) + `PaymentEntry[]` (split payments), linked to an open `Shift`, optional `Customer` (loyalty points) and `Discount`. The server never trusts the client's total: `src/lib/order-totals.ts` (`calculateOrderTotals`) is shared by the POS screen and `POST /api/orders`, which rejects a mismatch. Orders record `subtotal`, `taxAmount`, `pointsRedeemed`/`pointsDiscount`/`pointsEarned`. Payment entries store the amount **kept** (cash net of change, via `netPaymentEntries`). Stock is decremented atomically (`updateMany` with `stock >= qty`). When `enableStockManagement` is false, order creation skips all stock checks/decrements. Offline-synced orders (`offlineClientId`) are recorded as charged even if prices or stock changed since.
- **Cash:** `Shift` is per user (the POS loads `/api/shifts?status=OPEN&mine=1`). Expected cash = float + cash taken − `PettyCashPayout`s − cash refunds; always compute it with `getShiftCash()` in `src/lib/shift-cash.ts`. `Expense` feeds net profit in analytics and has a polymorphic reference (purchase order, petty cash).
- **Returns:** `Return` → `ReturnItem`. Limits come from the original order (`src/lib/returns.ts`: quantity left to return, refund capped at what was paid). Approval restocks (not for `DEFECTIVE` or when stock tracking is off), links cash refunds to the approver's open shift, marks fully returned orders `REFUNDED`, and reverses loyalty points pro rata. Analytics revenue subtracts refunds by `processedAt` (`src/lib/refunds.ts`); reports count `COMPLETED` + `REFUNDED` orders as sales.
- **Purchasing:** `Supplier` → `PurchaseOrder` → `PurchaseOrderItem` (product variant or raw material). `POST /api/purchase-orders/[id]/receive` increments stock and can create an expense.
- **Audit:** `AuditLog` with before/after JSON, exportable as CSV.

Money fields are `Decimal` — convert with `Number(...)` before arithmetic/JSON on the client.

Migration folders from April 2026 onward include hand-written timestamps (`20260410150000_…`); keep migration names descriptive and in order.

### Frontend

- `src/app/pos/page.tsx` — the cashier screen (large single client component: cart, variant selector, barcode scanner via `useBarcodeScanner`, held orders, split payments, shifts, petty cash, receipt printing).
- `src/app/dashboard/**` — back-office pages, all client components that call `/api/*` with plain `fetch` + `useState`/`useEffect` (`@tanstack/react-query` is installed but unused). Layout: desktop `Sidebar`, mobile `MobileDashboardHeader` + `MobileBottomNav`, content wrapped in `ErrorBoundary`. New dashboard sections need entries in both `Sidebar.tsx` and `MobileBottomNav.tsx`.
- Global providers (`src/app/providers.tsx`): `LanguageProvider` → `SettingsProvider` → `PrinterProvider`.
  - **i18n:** all user-facing strings go in `src/lib/translations.ts` under both `en` and `id`; read via `useLanguage().t`.
  - **Settings:** `useSettings()` / `useTenantSettings()` load tenant settings; format money/dates with the `*WithSettings` helpers in `src/lib/format.ts` (prefer these over `formatCurrency` in `src/lib/utils.ts`).
  - **Printing:** `PrinterContext` drives ESC/POS thermal printers over Web Bluetooth (`esc-pos-encoder`); `ReceiptTemplate` is the browser-print fallback.
- Forms: `react-hook-form` + `zod` (v4). Toasts: `sonner`. Icons: `lucide-react`. UI primitives in `src/components/ui` (add new ones via shadcn CLI per `components.json`). Path alias `@/*` → `src/*`. React Compiler is enabled (`reactCompiler: true`), so avoid manual memoization patterns that fight it.
- Mobile/tablet responsiveness matters: breakpoint `lg` separates desktop sidebar layout from mobile bottom-nav layout.

### Offline / PWA

- `public/sw.js` is a hand-written service worker (registered inline in `src/app/layout.tsx`); bump `CACHE_NAME` when changing cached assets. Offline fallback page: `src/app/offline`.
- `public/sw.js` keeps the last good copy of `/pos` and of the POS start-up reads (`OFFLINE_API_READS`) so the POS reopens offline; other API calls are network-only.
- `src/lib/db.ts` — Dexie IndexedDB (`NexusPOS_DB`) with `products`, `orders`, `syncQueue`. Index changes require a new `this.version(n)` block, never editing old ones; non-indexed fields can be added freely.
- `src/lib/catalog.ts` — caches the sellable catalog in `db.products` (synced every 10 min and on reconnect) for offline search and barcode/SKU scanning.
- `src/lib/sync.ts` — replays offline orders to `POST /api/orders`. Each offline order carries an `offlineClientId` (unique on `Order`) so the server deduplicates. Network/5xx errors stay `pending` and retry with backoff; 4xx refusals become `failed` straight away and appear in the POS indicator's Review list.

### Uploads

`POST /api/upload/image` writes to `public/uploads/{logos,products}` on local disk (`src/lib/upload.ts`, `sharp` via `src/lib/image-optimizer.ts`) — not suitable for serverless/multi-instance deploys as-is.

### Electron

`electron/main.js` loads `localhost:3000` in dev and `out/index.html` in production, but `next.config.ts` has no static export configured, so `electron:build` is not functional yet.
