# Awan POS â€” Development Roadmap & Todo List

> Last updated: April 11, 2026
> Check off each item as it is completed.

---

## Phase 0 â€” Security & Stability Hardening âœ…
> All automated tasks complete. Credential rotation is a manual ops step.

### 0.1 Disable / Remove Debug Routes in Production âœ…
- [x] Add `NODE_ENV` guard to all `/api/debug/*` routes
- [x] Verify all debug routes return `404` in production build

### 0.2 Rotate Leaked Credentials âš ï¸ Manual
- [ ] Rotate `DATABASE_URL` (Neon dashboard â†’ regenerate password)
- [ ] Rotate `BETTER_AUTH_SECRET` (generate new 32-byte secret)
- [ ] Rotate Stack Auth keys (`NEXT_PUBLIC_STACK_PROJECT_ID`, publishable + secret)
- [x] Confirm `.env.local` is in `.gitignore`
- [ ] Audit git history for committed `.env` files and purge if found

### 0.3 Audit Every API Route for Auth Checks âœ…
- [x] All routes (`/api/products`, `/api/orders`, `/api/customers`, `/api/categories`, `/api/discounts`, `/api/returns`, `/api/users`, `/api/roles`, `/api/inventory/adjustments`, `/api/analytics/summary`, `/api/audit-logs`, `/api/upload`, `/api/onboarding`, `/api/tenant/me`) verified
- [x] All routes return `401` JSON (not redirect) when unauthenticated

### 0.4 Add Rate Limiting âœ…
- [x] Custom in-memory sliding-window rate limiter (Edge-compatible)
- [x] `/api/auth/sign-in` â€” 10 req / 15 min per IP
- [x] `/api/auth/sign-up` â€” 5 req / hour per IP
- [x] `/api/orders` POST â€” 60 req / min per IP
- [x] Return `429` with `Retry-After` header

### 0.5 Add React Error Boundaries âœ…
- [x] Reusable `<ErrorBoundary>` component
- [x] Wrapped `/pos` page and all dashboard sections

### 0.6 Pagination Consistency Audit âœ…
- [x] All list APIs (`/api/products`, `/api/orders`, `/api/customers`, `/api/audit-logs`, `/api/returns`) switched to cursor-based pagination
- [x] All frontend list components updated to use `cursor`/`nextCursor`

---

## Phase 1 â€” Core POS Completeness
> Completed sections marked âœ…. Remaining items below.

### 1.1 Split Payments âœ…
- [x] `PaymentEntry` model; migration run
- [x] `POST /api/orders` accepts payment entries array
- [x] POS UI: multi-payment entry, remaining balance display
- [x] Receipt and order history updated

### 1.2 Shift / Cash Drawer Management âœ…
- [x] `Shift` model; migration run
- [x] `POST /api/shifts`, `PUT /api/shifts/[id]/close`, `GET /api/shifts`
- [x] Open/close shift modals in POS; Shift Summary report page
- [x] Orders linked to active shift

### 1.3 Expense Tracking âœ…
- [x] `Expense` model + `ExpenseCategory`; migration run
- [x] Full CRUD API; expenses list + add form in dashboard
- [x] Expense totals wired into analytics (net profit)

### 1.4 Image Optimization Pipeline
- [ ] Update `/api/upload` to process uploads through `sharp`
- [ ] Generate thumbnail (100Ã—100px), medium (400Ã—400px), full (max 1200px) on upload
- [ ] Store all 3 sizes; return URLs for each
- [ ] Update product image display to use appropriate size per context

### 1.5 Audit Log Retention / Cleanup Job
- [ ] Add `logRetentionDays` field to `Tenant` settings (default: 90); migration
- [ ] `DELETE /api/audit-logs/cleanup` â€” deletes logs older than retention period
- [ ] Add retention setting to Settings UI
- [ ] Set up Vercel Cron job (`vercel.json`) to trigger cleanup daily

### 1.6 Petty Cash Payout âœ…
- [x] `PettyCashPayout` model; migration run
- [x] `GET/POST /api/petty-cash`
- [x] "Petty Cash Out" button in POS (shift-gated); deducted from shift expected cash

### 1.7 Mobile & Tablet Responsive Polish âœ…
- [x] Compact header pattern, mobile card views, filter popovers applied across all dashboard pages
- [x] `MobileBottomNav` updated with all section links
- [x] Full detail in `UI_UX_ROADMAP.md`

---

## Phase 2 â€” Inventory & Supply Chain

### 2.0 Stock Management Toggle âœ…
- [x] `enableStockManagement` flag on `Tenant`; migration run
- [x] Tenant settings API + context updated; POS Settings toggle UI added
- [x] Stock validation and decrement in `POST /api/orders` gated behind flag

### 2.1 Supplier Management âœ…
- [x] `Supplier` model; migration run
- [x] Full CRUD API + list/new/edit pages in dashboard
- [x] Optional `supplierId` on `Product`; supplier edit page with assigned products + PO history tabs

### 2.2 Purchase Orders (Basic) âœ…
- [x] `PurchaseOrder` + `PurchaseOrderItem` models; `PurchaseOrderStatus` enum; migration run
- [x] Full CRUD API + list/new/detail pages in dashboard
- [x] `POST /api/purchase-orders/[id]/receive` â€” receive stock, auto-increment inventory
- [x] `isSellable` / `isPurchasable` flags on `Product`; POS and PO searches filtered accordingly

### 2.3 Barcode Label Printing
- [ ] Install `bwip-js` and `jspdf`
- [ ] `generateBarcodeLabel()` utility (barcode + SKU + name + price)
- [ ] "Print Labels" button on product detail page with quantity selector
- [ ] Batch print from products list
- [ ] Support 30Ã—20mm and 50Ã—30mm label sizes

### 2.4 Product Bundling / Combos
- [ ] Add `ProductBundle` model (`productId`, `tenantId`, `name`)
- [ ] Add `ProductBundleItem` model (`bundleId`, `variantId`, `quantity`); migration
- [ ] Update order creation to deduct component stock when a bundle is sold
- [ ] "Create Bundle" UI in product management
- [ ] Show bundle components in POS cart
- [ ] Block sale if any component is out of stock

### 2.5 Database Performance Indexes âœ…
- [x] Indexes added on `Order`, `Product`, `OrderItem`, `PaymentEntry`, `StockAdjustment`, `AuditLog`; migration run
- [x] Neon connection pooling (PgBouncer) active

---

## Phase 3 â€” Unit of Measure (UOM) System
> **Foundation phase â€” must be complete before Phase 4 (expanded PO) and Phase 6 (BOM).**
> UOM is module-gated: enabled per tenant in Settings. Off by default for pure retail tenants.

### 3.1 UOM Data Model
- [ ] Add `UnitOfMeasure` model: `id`, `tenantId` (null = system default), `name`, `symbol`, `category` (`WEIGHT` | `VOLUME` | `COUNT` | `LENGTH` | `CUSTOM`), `isBase Boolean`
- [ ] Add `UomConversion` model: `fromUomId`, `toUomId`, `factor` (multiply from â†’ to), `tenantId` (null = system-wide)
- [ ] Seed system-default UOMs: g, kg, ml, L, pcs, box, pack, dozen, cm, m
- [ ] Seed system-wide conversions: gâ†”kg (Ã·1000), mlâ†”L (Ã·1000), pcsâ†”dozen (Ã·12), pcsâ†”pack (configurable)
- [ ] Run and verify database migration

### 3.2 UOM on Products & Variants
- [ ] Add `baseUomId` to `Product` â€” the internal storage unit (e.g. g for flour)
- [ ] Add `purchaseUomId` to `Product` â€” unit used on POs (e.g. kg); defaults to `baseUomId`
- [ ] Add `salesUomId` to `Product` â€” unit shown in POS/cart (e.g. pcs); defaults to `baseUomId`
- [ ] Add `purchaseUomQty` to `Product` â€” how many base units per purchase unit (e.g. 1 kg = 1000 g)
- [ ] Run and verify database migration
- [ ] Update product create / edit UI â€” UOM selector for base, purchase, and sales UOM
- [ ] Show unit symbol next to stock quantity everywhere (inventory, PO receive, adjustments)

### 3.3 UOM Conversion Engine
- [ ] Create `src/lib/uom.ts` â€” `convert(qty, fromUomId, toUomId, tenantId)` using `UomConversion` table; throw if no path found
- [ ] Add `getConversionFactor(fromUomId, toUomId, tenantId)` with fallback chain (tenant â†’ system)
- [ ] Unit-test conversion logic (direct, inverse, chained)
- [ ] Apply conversion in PO receive: received qty in `purchaseUomId` â†’ stored in `baseUomId`
- [ ] Apply conversion in POS sale: stock decremented in `baseUomId`; cart shows `salesUomId`

### 3.4 UOM Management UI
- [ ] UOM list page in Settings (`/dashboard/settings/uom`) â€” shows system defaults (read-only) + tenant custom UOMs
- [ ] Add / edit / delete custom UOMs (tenant-scoped)
- [ ] Conversion table UI â€” add conversion rules between UOMs (e.g. 1 box = 24 pcs)
- [ ] Inline validation: warn if a circular or duplicate conversion is entered
- [ ] "Enable UOM module" toggle in tenant Settings (defaults off for retail, on for FnB/mixed)

---

## Phase 4 â€” Business Type & Module Configuration
> **Runs right after tenant onboarding.** Determines which dashboard sections and features are visible.

### 4.1 Business Type Model
- [ ] Add `businessType` enum to `Tenant`: `RETAIL` | `FNB` | `SERVICE` | `MIXED`
- [ ] Run and verify database migration
- [ ] Add business type selection step to onboarding wizard (step after store name/logo, before first product)
- [ ] Extend tenant settings GET/PATCH API to expose `businessType`

### 4.2 Module Registry
- [ ] Add `TenantModules` model (or JSON column on `Tenant`): `enableUom`, `enableBom`, `enablePurchaseApproval`, `enableLandedCosts`, `enableSupplierInvoicing`, `enableApLedger`, `enableLoyalty`, `enableWhatsapp`, `enableBundles`
- [ ] Run and verify database migration
- [ ] Create `GET/PATCH /api/tenant/modules` endpoint (owner/admin only)
- [ ] Apply business-type presets on onboarding completion:
  - `RETAIL` â†’ enableBundles, enableBom off; UOM off
  - `FNB` â†’ enableUom, enableBom, enableLandedCosts on; enableBundles off
  - `SERVICE` â†’ stock management off; all inventory modules off
  - `MIXED` â†’ all modules on, user configures manually
- [ ] Build Module Settings page (`/dashboard/settings/modules`) â€” toggle each module on/off post-onboarding with short description of what each does
- [ ] Dashboard sidebar links adapt to active modules (hide sections for disabled modules)
- [ ] API routes for gated modules return `403` with `{ error: 'Module not enabled' }` if accessed while disabled

---

## Phase 5 â€” Comprehensive Purchase Order Module
> Upgrades the basic PO (Phase 2.2) into a full procurement cycle.
> Requires Phase 3 (UOM) to be complete for landed cost distribution and UOM-aware receiving.

### 5.1 PO Workflow & Approval
- [ ] Extend `PurchaseOrderStatus` enum: add `PENDING_APPROVAL` between DRAFT and SENT
- [ ] Add `approvalThreshold` (Decimal) to `TenantModules` â€” POs above this amount require approval; `0` = always require, `null` = never require
- [ ] Add `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason` to `PurchaseOrder`
- [ ] Run and verify database migration
- [ ] `POST /api/purchase-orders/[id]/submit` â€” move DRAFT â†’ PENDING_APPROVAL (or APPROVED if below threshold)
- [ ] `POST /api/purchase-orders/[id]/approve` â€” manager/owner only; move â†’ APPROVED
- [ ] `POST /api/purchase-orders/[id]/reject` â€” manager/owner only; move â†’ DRAFT with rejection reason
- [ ] PO detail page: show approval status, approver name, rejection reason
- [ ] Dashboard: "Pending Approvals" badge on PO nav link when items await action

### 5.2 PO Amendments (Change Orders)
- [ ] Add `PurchaseOrderRevision` model: `purchaseOrderId`, `revisionNumber`, `changedBy`, `changedAt`, `snapshotJson`
- [ ] Run and verify database migration
- [ ] On any edit to an APPROVED or SENT PO, auto-increment `revisionNumber` and snapshot previous state
- [ ] Revision history tab on PO detail page â€” shows diff of each change

### 5.3 Supplier Price Lists & Quotations
- [ ] Add `SupplierPriceList` model: `supplierId`, `variantId`, `uomId`, `unitPrice`, `validFrom`, `validTo`, `tenantId`
- [ ] Run and verify database migration
- [ ] `GET/POST /api/suppliers/[id]/price-list` endpoints
- [ ] Price list tab on supplier edit page â€” add/edit/remove quoted prices per SKU
- [ ] On PO item add: auto-fill unit cost from active supplier price list if available (highlight when applied)

### 5.4 Goods Receipt Note (GRN) & Lot Tracking
- [ ] Add `GoodsReceiptNote` model: `purchaseOrderId`, `receivedBy`, `receivedAt`, `notes`, `tenantId`
- [ ] Add `GrnItem` model: `grnId`, `poItemId`, `receivedQty`, `uomId`, `lotNumber` (optional), `expiryDate` (optional)
- [ ] Run and verify database migration
- [ ] Convert existing "Receive Stock" flow into a proper GRN creation flow
- [ ] GRN list on PO detail page; each GRN is a permanent document
- [ ] Optional lot/batch number input on receipt (enabled per product in product settings)
- [ ] Optional expiry date input (enabled per product)

### 5.5 Landed Costs
> Requires `enableLandedCosts` module flag to be on.
- [ ] Add `LandedCost` model: `purchaseOrderId`, `type` (`FREIGHT` | `DUTY` | `HANDLING` | `OTHER`), `amount`, `allocationMethod` (`BY_VALUE` | `BY_QTY` | `BY_WEIGHT`)
- [ ] Run and verify database migration
- [ ] Landed costs section on PO detail page (add/edit after GRN is created)
- [ ] `POST /api/purchase-orders/[id]/landed-costs/allocate` â€” distributes total landed cost across received items by chosen method; updates each item's effective unit cost
- [ ] Updated unit cost flows through to product cost (same as existing `updateVariantCost` logic)

### 5.6 PO Templates
- [ ] Add `PurchaseOrderTemplate` model: `supplierId`, `name`, `notes`, `tenantId` + items array
- [ ] Run and verify database migration
- [ ] "Save as Template" button on PO detail page
- [ ] "New from Template" selector on PO create page â€” pre-fills supplier + items

---

## Phase 6 â€” Supplier Invoicing & Accounts Payable
> Closes the procurement loop: PO â†’ GRN â†’ Invoice â†’ Payment.
> Two modes, configurable per tenant in Module Settings:
> - **Simple** (`enableApLedger = false`): payment tracking only â€” log amounts paid, show balance
> - **Full AP Ledger** (`enableApLedger = true`): journal entries (debit AP, credit cash/bank); AP aging available

### 6.1 Supplier Invoice
- [ ] Add `SupplierInvoice` model: `tenantId`, `supplierId`, `purchaseOrderId` (nullable â€” can be standalone), `invoiceNumber`, `invoiceDate`, `dueDate`, `subtotal`, `taxAmount`, `totalAmount`, `status` (`DRAFT` | `PENDING` | `PARTIAL` | `PAID` | `OVERDUE`)
- [ ] Add `SupplierInvoiceItem` model: `invoiceId`, `poItemId` (nullable), `description`, `qty`, `uomId`, `unitPrice`, `lineTotal`
- [ ] Run and verify database migration
- [ ] `GET/POST /api/supplier-invoices` endpoints
- [ ] `GET/PATCH/DELETE /api/supplier-invoices/[id]` endpoints
- [ ] Auto-generate invoice from received PO (pre-filled from GRN quantities and PO unit costs)
- [ ] Invoice list page (`/dashboard/supplier-invoices`) with status filter
- [ ] PO detail page: "Linked Invoice" section showing invoice number, total, status

### 6.2 Supplier Payments
- [ ] Add `SupplierPayment` model: `invoiceId`, `tenantId`, `amount`, `paymentDate`, `method` (`CASH` | `BANK_TRANSFER` | `CHEQUE` | `OTHER`), `reference`, `notes`
- [ ] Run and verify database migration
- [ ] `POST /api/supplier-invoices/[id]/payments` â€” record a payment (partial or full)
- [ ] `GET /api/supplier-invoices/[id]/payments` â€” list payments for an invoice
- [ ] Outstanding balance auto-calculated (`totalAmount` âˆ’ sum of payments)
- [ ] Invoice status auto-transitions: PENDING â†’ PARTIAL â†’ PAID based on payment total
- [ ] Payment history on invoice detail page

### 6.3 AP Aging Report
> Available in both Simple and Full AP Ledger modes.
- [ ] `GET /api/reports/ap-aging` â€” returns outstanding invoices bucketed: current, 1â€“30, 31â€“60, 61â€“90, 90+ days
- [ ] AP Aging report page (`/dashboard/reports/ap-aging`) with supplier breakdown table
- [ ] Overdue alert: badge on sidebar when any invoice is past due date

### 6.4 Full AP Ledger (optional â€” `enableApLedger` flag)
- [ ] Add `JournalEntry` model: `tenantId`, `date`, `description`, `reference`
- [ ] Add `JournalLine` model: `entryId`, `accountCode`, `accountName`, `debit`, `credit`
- [ ] Run and verify database migration
- [ ] On invoice creation: debit Inventory/Expense, credit Accounts Payable
- [ ] On payment record: debit Accounts Payable, credit Cash/Bank
- [ ] Journal entries tab on invoice detail page
- [ ] Basic chart of accounts management page (`/dashboard/settings/chart-of-accounts`)

---

## Phase 7 â€” Bill of Materials (F&B / Recipe Mode)
> Gated behind `enableBom` module flag. Designed for FnB tenants; recipes + costing focus.
> Requires Phase 3 (UOM) â€” all BOM quantities are UOM-aware.

### 7.1 BOM Core
- [ ] Add `BillOfMaterial` model: `tenantId`, `productId` (finished item), `name`, `yieldQty`, `yieldUomId`, `notes`
- [ ] Add `BomLine` model: `bomId`, `ingredientVariantId`, `qty`, `uomId` â€” stored in ingredient's base UOM via conversion
- [ ] Run and verify database migration
- [ ] BOM create/edit page per product (`/dashboard/products/[id]/bom`)
- [ ] BOM costing engine: sum ingredient `(qty in base UOM Ã— current cost)` Ã· yield â†’ cost per unit of finished item
- [ ] BOM cost card panel: shows ingredient cost breakdown, yield cost, suggested price, gross margin %
- [ ] Link BOM to product: product detail page shows "Recipe" tab if BOM exists

### 7.2 Recipe Scaling & Substitutions
- [ ] Recipe scaling input on BOM page (enter batch multiplier â†’ all quantities scale live)
- [ ] Add `BomSubstitute` model: `bomLineId`, `substituteVariantId`, `conversionFactor` â€” defines equivalent substitute ingredient
- [ ] Substitution UI on BOM line: mark a substitute ingredient, set equivalence ratio
- [ ] During production / stock check: if primary ingredient is low, suggest substitute

### 7.3 Menu Costing & Profitability
- [ ] Menu cost report page (`/dashboard/reports/menu-costing`) â€” table of all products with active BOM
- [ ] Columns: Item, BOM cost, Selling price, Cost%, Gross margin, recommendation flag (if cost% > threshold)
- [ ] Cost% threshold configurable in tenant Settings (e.g. warn if > 35%)
- [ ] "Recalculate All" button â€” refreshes BOM costs from current ingredient prices
- [ ] BOM cost history: track how cost changes over time as ingredient purchase prices change

### 7.4 Stock Consumption via BOM
- [ ] On POS sale of a product with an active BOM: deduct ingredient stock (in base UOM) instead of finished-good stock
- [ ] Gate behind `enableBom` flag â€” if flag is off, standard variant stock deduction applies
- [ ] Handle partial stock: warn cashier if an ingredient is insufficient to fulfill the item qty in cart
- [ ] BOM ingredient stock check shown as part of POS low-stock warning system

---

## Phase 8 â€” Customer & Revenue Growth

### 8.1 WhatsApp Receipt Delivery
- [ ] Sign up for Fonnte or WhatsApp Business API
- [ ] Add `WHATSAPP_API_KEY` to `.env.local`
- [ ] `sendWhatsAppReceipt()` utility function
- [ ] Add `whatsappOptIn` boolean to `Customer` model; migration
- [ ] "Send to WhatsApp" toggle on POS receipt screen
- [ ] Receipt message template: itemized list, total, store name, points earned
- [ ] Test end-to-end delivery

### 8.2 Loyalty Program Enhancement âœ…
- [x] `pointsPerCurrency`, `pointRedemptionRate`, `minimumRedeemPoints` on Tenant settings; migration run
- [x] Auto-award points on order; redeem points in POS checkout; points shown on receipt
- [x] Loyalty config section in Settings UI

### 8.3 Offline Sync Conflict Resolution âœ…
- [x] `lastModifiedAt` + `offlineClientId` on `Order`; migrations run
- [x] Server-wins idempotent sync via `offlineClientId` check
- [x] Dexie v3 `syncQueue` with exponential backoff (`src/lib/sync.ts`)
- [x] Sync status badge in POS UI; auto-sync on `window.online`; Force Sync button

### 8.4 Subscription Billing (SaaS Monetization)
- [ ] Define plan tiers (Free / Basic / Pro) and per-plan feature limits
- [ ] Add `Subscription` model (`tenantId`, `plan`, `status`, `currentPeriodStart`, `currentPeriodEnd`)
- [ ] Add `Invoice` model (`tenantId`, `amount`, `status`, `paidAt`); migration
- [ ] Integrate Xendit or Midtrans payment gateway
- [ ] `POST /api/billing/subscribe` and `POST /api/billing/webhook` endpoints
- [ ] Billing/subscription page (`/dashboard/billing`)
- [ ] Feature flags enforced per plan; upgrade prompts when limits are hit

---

## Phase 9 â€” Multi-Outlet & Desktop Polish

### 9.1 Multi-Location / Outlet Support
- [ ] Add `Location` model (`name`, `address`, `phone`, `tenantId`, `isDefault`); migration
- [ ] `locationId` on `ProductVariant` (stock per location), `Order`, `Shift`
- [ ] `GET/POST /api/locations` and `PUT/DELETE /api/locations/[id]`
- [ ] Location selector in POS startup flow
- [ ] Inventory and analytics filtered by location; cross-location views
- [ ] Locations management page (`/dashboard/locations`)

### 9.2 Stock Transfer Between Outlets
- [ ] Add `StockTransfer` + `StockTransferItem` models; `StockTransferStatus` enum (`PENDING` | `APPROVED` | `IN_TRANSIT` | `RECEIVED` | `CANCELLED`); migration
- [ ] `POST /api/stock-transfers`, `PUT .../approve`, `PUT .../receive`
- [ ] Stock Transfer UI (`/dashboard/stock-transfers`)
- [ ] Notifications/alerts for pending transfer approvals

### 9.3 Customer Display (2nd Screen â€” Electron)
- [ ] Detect Electron environment; open second `BrowserWindow` on secondary display
- [ ] IPC channel between main POS window and customer display
- [ ] Customer display shows: live cart, subtotal/total, payment/change on completion, idle screen
- [ ] Enable/disable toggle in POS settings

### 9.4 Electron Auto-Updater
- [ ] Install `electron-updater`; configure `electron-builder` with GitHub Releases feed
- [ ] Auto-update check on app startup; in-app notification + "Install Update" action
- [ ] Test end-to-end update flow; current version shown in Settings

---

## Progress Summary

| Phase | Description | Key Remaining | Status |
|---|---|---|---|
| Phase 0 | Security & Stability | 0.2 credential rotation (manual) | âœ… Complete |
| Phase 1 | Core POS | 1.4 Image pipeline, 1.5 Audit retention | ðŸ”„ In Progress |
| Phase 2 | Inventory & Supply Chain | 2.3 Barcode, 2.4 Bundles | ðŸ”„ In Progress |
| Phase 3 | UOM System | All tasks | â¬œ Not Started |
| Phase 4 | Business Type & Modules | All tasks | â¬œ Not Started |
| Phase 5 | Comprehensive PO | All tasks | â¬œ Not Started |
| Phase 6 | Supplier Invoicing & AP | All tasks | â¬œ Not Started |
| Phase 7 | BOM / Recipes (F&B) | All tasks | â¬œ Not Started |
| Phase 8 | Customer & Growth | 8.1 WhatsApp, 8.4 Billing | ðŸ”„ In Progress |
| Phase 9 | Multi-Outlet & Desktop | All tasks | â¬œ Not Started |

---

> **Implementation order:** Phase 0/1/2 cleanup â†’ Phase 3 (UOM) â†’ Phase 4 (Modules) â†’ Phase 5 (PO) â†’ Phase 6 (AP) â†’ Phase 7 (BOM) â†’ Phase 8 â†’ Phase 9
> Phases 5, 6, and 7 are tightly dependent: UOM must exist before PO landed costs and BOM quantities work correctly.
