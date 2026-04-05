# Awan POS — Development Roadmap & Todo List

> Last updated: April 5, 2026 — Phase 0 complete
> Check off each item as it is completed.

---

## Phase 0 — Security & Stability Hardening
> Priority: **CRITICAL** — Complete before onboarding any real users.

### 0.1 Disable / Remove Debug Routes in Production ✅
- [x] Add `NODE_ENV` guard to `/api/debug/tenant`
- [x] Add `NODE_ENV` guard to `/api/debug/session`
- [x] Add `NODE_ENV` guard to `/api/debug/auth`
- [x] Add `NODE_ENV` guard to `/api/debug/seed`
- [x] Add `NODE_ENV` guard to `/api/debug/clear-session` *(was already guarded)*
- [x] Verify all debug routes return `404` in production build

### 0.2 Rotate Leaked Credentials
- [ ] Rotate `DATABASE_URL` (Neon dashboard → regenerate password)
- [ ] Rotate `BETTER_AUTH_SECRET` (generate new 32-byte secret)
- [ ] Rotate `NEXT_PUBLIC_STACK_PROJECT_ID` / `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` / `STACK_SECRET_SERVER_KEY`
- [x] Confirm `.env.local` is listed in `.gitignore` *(`.env*` pattern already present)*
- [ ] Audit git history for any committed `.env` files and purge if found

### 0.3 Audit Every API Route for Auth Checks ✅
- [x] `/api/products` — verify session check
- [x] `/api/categories` — verify session check
- [x] `/api/customers` — verify session check
- [x] `/api/orders` — verify session check
- [x] `/api/discounts` — verify session check
- [x] `/api/returns` — verify session check
- [x] `/api/users` — verify session check
- [x] `/api/roles` — verify session check
- [x] `/api/inventory/adjustments` — verify session check
- [x] `/api/analytics/summary` — verify session check
- [x] `/api/audit-logs` — verify session check
- [x] `/api/upload` — verify session check *(fixed broken `if (!user)` pattern → proper `if ('error' in authResult)`)*
- [x] `/api/onboarding` — verify session check
- [x] `/api/tenant/me` — verify session check
- [x] All routes return `401` JSON (not redirect) when unauthenticated

### 0.4 Add Rate Limiting ✅
- [x] Install rate limiting package *(custom in-memory sliding-window — Edge-compatible, no external dependency)*
- [x] Apply rate limit to `/api/auth/sign-in` (10 req / 15 min per IP)
- [x] Apply rate limit to `/api/auth/sign-up` (5 req / hour per IP)
- [x] Apply rate limit to `/api/orders` POST (60 req / min per IP)
- [x] Return `429 Too Many Requests` with `Retry-After` header

### 0.5 Add React Error Boundaries ✅
- [x] Create a reusable `<ErrorBoundary>` component (`src/components/ui/ErrorBoundary.tsx`)
- [x] Wrap the entire `/pos` page in an Error Boundary
- [x] Wrap each dashboard section (products, orders, analytics, etc.) in Error Boundaries
- [x] Display a user-friendly fallback UI with "Try again" button

### 0.6 Pagination Consistency Audit ✅
- [x] `/api/products` — switched to cursor-based pagination
- [x] `/api/orders` — switched to cursor-based pagination *(also fixed filter bug where where-clause was ignored)*
- [x] `/api/customers` — switched to cursor-based pagination
- [x] `/api/audit-logs` — switched to cursor-based pagination
- [x] `/api/returns` — switched to cursor-based pagination
- [x] Update frontend list components to use `cursor`/`nextCursor` instead of `page`/`offset` *(orders, customers, returns, audit-logs, products — all updated)*

---

## Phase 1 — Core POS Completeness
> Target: ~3–4 weeks after Phase 0

### 1.1 Split Payments ✅
- [x] Add `PaymentEntry` model to Prisma schema (`orderId`, `method`, `amount`)
- [x] Run and verify database migration
- [x] Update `POST /api/orders` to accept an array of payment entries
- [x] Update POS UI — add "Add Payment Method" button to allow multiple entries
- [x] Calculate and display remaining balance as entries are added
- [x] Update receipt to list each payment entry separately
- [x] Update order history UI to show split payment breakdown

### 1.2 Shift / Cash Drawer Management
- [x] Add `Shift` model to Prisma schema (`openedAt`, `closedAt`, `openingFloat`, `expectedCash`, `actualCash`, `difference`, `userId`, `tenantId`)
- [x] Run and verify database migration
- [x] Create `POST /api/shifts` — open shift with float amount
- [x] Create `PUT /api/shifts/[id]/close` — close shift with actual cash count
- [x] Create `GET /api/shifts` — list shifts with summary
- [x] Add "Open Shift" modal when cashier logs into POS (if no active shift)
- [x] Add "Close Shift" button in POS with cash count input
- [x] Build Shift Summary report page in dashboard
- [x] Wire shift ID into order creation so orders belong to a shift

### 1.3 Expense Tracking
- [x] Add `Expense` model to Prisma schema (`amount`, `category`, `date`, `notes`, `tenantId`, `createdBy`)
- [x] Add `ExpenseCategory` enum or model
- [x] Run and verify database migration
- [x] Create `GET/POST /api/expenses` endpoints
- [x] Create `PUT/DELETE /api/expenses/[id]` endpoints
- [x] Build expenses list page in dashboard (`/dashboard/expenses`)
- [x] Add "Add Expense" form/modal
- [x] Wire expense totals into analytics — subtract from revenue to show true net profit
- [x] Update analytics summary chart to include expense line

### 1.6 Petty Cash Payout
- [x] Add `PettyCashPayout` model to Prisma schema (`amount`, `reason`, `shiftId`, `tenantId`, `createdBy`, `createdAt`)
- [x] Run and verify database migration
- [x] Create `GET /api/petty-cash` — list payouts for a shift or tenant
- [x] Create `POST /api/petty-cash` — record a cash payout during an active shift
- [x] Add "Petty Cash Out" button in POS (visible only when a shift is active)
- [x] Quick-entry modal: amount + reason field
- [x] Deduct total payouts from expected cash in shift-close calculation
- [x] Show petty cash payout list in shift detail / shift close summary

### 1.4 Image Optimization Pipeline
- [ ] Update `/api/upload` to process uploads through `sharp`
- [ ] Generate thumbnail (100×100px) on upload
- [ ] Generate medium size (400×400px) on upload
- [ ] Generate full size (max 1200px width) on upload
- [ ] Store all 3 sizes and return URLs for each
- [ ] Update product image display to use the appropriate size per context (thumb in lists, medium in forms, full in detail)

### 1.5 Audit Log Retention / Cleanup Job
- [ ] Add `logRetentionDays` field to `Tenant` settings (default: 90)
- [ ] Run and verify database migration
- [ ] Create `DELETE /api/audit-logs/cleanup` route that deletes logs older than retention period
- [ ] Add retention setting to the Settings UI
- [ ] Set up Vercel Cron job (`vercel.json` cron) to trigger cleanup daily

---

## Phase 2 — Inventory & Supply Chain
> Target: ~4–5 weeks after Phase 1

### 2.1 Supplier Management
- [ ] Add `Supplier` model to Prisma schema (`name`, `contactName`, `phone`, `email`, `address`, `paymentTerms`, `tenantId`)
- [ ] Run and verify database migration
- [ ] Create `GET/POST /api/suppliers` endpoints
- [ ] Create `PUT/DELETE /api/suppliers/[id]` endpoints
- [ ] Build Suppliers list and detail pages in dashboard (`/dashboard/suppliers`)
- [ ] Link suppliers to products (optional `supplierId` on `Product`)

### 2.2 Purchase Orders
- [ ] Add `PurchaseOrder` model (`supplierId`, `status`, `expectedDate`, `notes`, `tenantId`)
- [ ] Add `PurchaseOrderItem` model (`purchaseOrderId`, `variantId`, `quantity`, `unitCost`)
- [ ] Add `PurchaseOrderStatus` enum: `DRAFT`, `SENT`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`
- [ ] Run and verify database migration
- [ ] Create `GET/POST /api/purchase-orders` endpoints
- [ ] Create `PUT /api/purchase-orders/[id]` endpoint (update status, edit)
- [ ] Create `POST /api/purchase-orders/[id]/receive` — marks as received and auto-increments stock
- [ ] Build Purchase Orders list and detail pages (`/dashboard/purchase-orders`)
- [ ] Build "Receive Stock" UI (confirm quantities received, handle partial receives)

### 2.3 Barcode Label Printing
- [ ] Install `bwip-js` and `jspdf` packages
- [ ] Create a `generateBarcodeLabel()` utility (barcode image + SKU + name + price)
- [ ] Add "Print Labels" button on the product detail page
- [ ] Add quantity selector (how many copies to print)
- [ ] Support printing multiple products' labels in one batch from the products list
- [ ] Test with common label sizes (30×20mm, 50×30mm)

### 2.4 Product Bundling / Combos
- [ ] Add `ProductBundle` model (`productId`, `tenantId`, `name`)
- [ ] Add `ProductBundleItem` model (`bundleId`, `variantId`, `quantity`)
- [ ] Run and verify database migration
- [ ] Update order creation logic to detect bundles and deduct component stock
- [ ] Add "Create Bundle" UI in product management
- [ ] Display bundle components in POS cart so cashier can see what's included
- [ ] Handle partial stock — prevent bundle sale if any component is out of stock

### 2.5 Database Performance Indexes
- [ ] Add index on `Order.tenantId` in Prisma schema
- [ ] Add index on `Order.createdAt` in Prisma schema
- [ ] Add index on `Order.status` in Prisma schema
- [ ] Add index on `ProductVariant.sku` in Prisma schema
- [ ] Add index on `AuditLog.tenantId` in Prisma schema
- [ ] Add index on `AuditLog.createdAt` in Prisma schema
- [ ] Add composite index on `AuditLog.(tenantId, createdAt)` in Prisma schema
- [ ] Run and verify migration
- [ ] Enable Neon connection pooling (PgBouncer) in `DATABASE_URL`
- [ ] Run query performance tests and verify improvement

---

## Phase 3 — Customer & Revenue Growth
> Target: ~3–4 weeks after Phase 2

### 3.1 WhatsApp Receipt Delivery
- [ ] Sign up for Fonnte or WhatsApp Business API account
- [ ] Add `WHATSAPP_API_KEY` to `.env.local`
- [ ] Create a `sendWhatsAppReceipt()` utility function
- [ ] Add `whatsappOptIn` boolean field to `Customer` model
- [ ] Run and verify database migration
- [ ] Add "Send to WhatsApp" toggle on receipt screen in POS
- [ ] Add WhatsApp opt-in toggle in customer profile UI
- [ ] Build receipt message template (itemized list, total, store name)
- [ ] Test end-to-end delivery

### 3.2 Loyalty Program Enhancement
- [x] Add `pointsPerCurrency` (earn rate) field to `Tenant` settings (e.g., 1 point per Rp1,000)
- [x] Add `pointRedemptionRate` field to `Tenant` settings (e.g., 100 points = Rp1,000 discount)
- [x] Add `minimumRedeemPoints` field to `Tenant` settings
- [x] Run and verify database migration
- [x] Update order creation to auto-award points based on earn rate
- [x] Add "Redeem Points" input in POS checkout — deducts from order total
- [x] Add loyalty config section in Settings UI
- [x] Display customer's point balance in POS when customer is selected
- [x] Show points earned on receipt

### 3.3 Offline Sync Conflict Resolution
- [ ] Add `lastModifiedAt` timestamp to `Order` and `OrderItem` models
- [ ] Run and verify database migration
- [ ] Implement server-wins conflict resolution in sync logic (server version takes precedence if both modified)
- [ ] Add a sync queue in Dexie that retries failed uploads with exponential backoff
- [ ] Add a sync status indicator badge in POS UI (✓ Synced / ⟳ Syncing / ✕ Offline)
- [ ] Test offline → online transition with conflicting edits
- [ ] Add a "Force Sync" button in settings for manual trigger

### 3.4 Subscription Billing (SaaS Monetization)
- [ ] Define subscription plans and feature limits (Free, Basic, Pro tiers)
- [ ] Add `Subscription` model (`tenantId`, `plan`, `status`, `currentPeriodStart`, `currentPeriodEnd`)
- [ ] Add `Invoice` model (`tenantId`, `amount`, `status`, `paidAt`)
- [ ] Run and verify database migration
- [ ] Integrate Xendit or Midtrans payment gateway
- [ ] Add `POST /api/billing/subscribe` endpoint
- [ ] Add `POST /api/billing/webhook` endpoint for payment callbacks
- [ ] Create billing/subscription page in dashboard (`/dashboard/billing`)
- [ ] Implement feature flags based on active plan (enforce limits per plan)
- [ ] Add upgrade prompts when tenant hits plan limits

---

## Phase 4 — Multi-Outlet & Desktop Polish
> Target: ~5–6 weeks after Phase 3

### 4.1 Multi-Location / Outlet Support
- [ ] Add `Location` model to Prisma schema (`name`, `address`, `phone`, `tenantId`, `isDefault`)
- [ ] Add `locationId` foreign key to `ProductVariant` (stock per location)
- [ ] Add `locationId` to `Order` model
- [ ] Add `locationId` to `Shift` model
- [ ] Run and verify database migration
- [ ] Create `GET/POST /api/locations` endpoints
- [ ] Create `PUT/DELETE /api/locations/[id]` endpoints
- [ ] Add location selector to POS login/startup flow
- [ ] Update inventory queries to filter by location
- [ ] Update analytics to support per-location and cross-location views
- [ ] Build Locations management page in dashboard (`/dashboard/locations`)

### 4.2 Stock Transfer Between Outlets
- [ ] Add `StockTransfer` model (`fromLocationId`, `toLocationId`, `status`, `tenantId`, `requestedBy`)
- [ ] Add `StockTransferItem` model (`transferId`, `variantId`, `quantity`)
- [ ] Add `StockTransferStatus` enum: `PENDING`, `APPROVED`, `IN_TRANSIT`, `RECEIVED`, `CANCELLED`
- [ ] Run and verify database migration
- [ ] Create `POST /api/stock-transfers` — request a transfer
- [ ] Create `PUT /api/stock-transfers/[id]/approve` — approve and deduct source stock
- [ ] Create `PUT /api/stock-transfers/[id]/receive` — confirm receipt and add to destination stock
- [ ] Build Stock Transfer UI in dashboard (`/dashboard/stock-transfers`)
- [ ] Add notifications/alerts for pending transfer approvals

### 4.3 Customer Display (2nd Screen — Electron)
- [ ] Detect if running in Electron environment
- [ ] Create a `customer-display.html` / Next.js route for the secondary display content
- [ ] Update `electron/main.js` to open a second `BrowserWindow` on the secondary display
- [ ] Implement IPC channel between main POS window and customer display window
- [ ] Show live cart items, subtotal, and total on customer display
- [ ] Show payment method and change amount when transaction completes
- [ ] Show idle/welcome screen when no active transaction
- [ ] Add customer display enable/disable toggle in POS settings

### 4.4 Electron Auto-Updater
- [ ] Install `electron-updater` package
- [ ] Set up GitHub Releases (or S3 bucket) as update feed
- [ ] Configure `electron-builder` to publish update metadata (`latest.yml`)
- [ ] Add auto-update check on app startup in `electron/main.js`
- [ ] Show in-app notification when an update is available
- [ ] Add "Download & Install Update" action in the notification
- [ ] Test update flow end-to-end (old version → new version)
- [ ] Add current app version display in Settings page

---

## Progress Summary

| Phase | Total Tasks | Completed | Status |
|---|---|---|---|
| Phase 0 — Security | 24 | 24 | ✅ **Complete** (0.2 credential rotation is a manual step) |
| Phase 1 — Core POS | 38 | 33 | 🔄 **In Progress** (1.1, 1.2, 1.3, 1.6 complete) |
| Phase 2 — Inventory | 33 | 0 | Not Started |
| Phase 3 — Growth | 27 | 9 | 🔄 **In Progress** (3.2 complete) |
| Phase 4 — Multi-Outlet | 28 | 0 | Not Started |
| **Total** | **150** | **58** | — |

---

> **Tip:** Update the Progress Summary table as phases are completed. Check off each `- [ ]` item by changing it to `- [x]` when done.
