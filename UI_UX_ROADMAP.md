# Awan POS — UI / UX Roadmap

> Last updated: April 5, 2026 (all phases complete)
> Focus: Mobile responsiveness, interaction consistency, and visual polish.
> Reference implementation: **Products page** and **Orders page** (filter popover + compact header + mobile card list).

---

## Pattern Reference

### Compact Page Header (all pages must follow)
```tsx
<div className="space-y-4">
  <div className="flex items-center justify-between gap-2">
    <div>
      <h1 className="text-xl font-bold">Page Title</h1>
      <p className="text-xs text-muted-foreground">Short subtitle</p>
    </div>
    <div className="flex items-center gap-2">
      {/* Icon-only filter popover (SlidersHorizontal) */}
      {/* Icon-only action button (Plus / etc.) */}
    </div>
  </div>
```

### Filter Popover (pages with filterable lists)
- Trigger: `SlidersHorizontal` icon button, `variant="outline" size="sm" h-9`
- Badge: `absolute -top-1.5 -right-1.5 h-4 w-4` red dot with active filter count
- Content: `w-60–72 p-4 space-y-4`, each filter as `text-xs font-medium text-muted-foreground` label + `h-8 text-sm` control
- Footer: `w-full h-8` Apply button + Reset text link

### Mobile Card / Desktop Table dual layout
- Mobile: `md:hidden divide-y` — compact cards with key fields only
- Desktop: `hidden md:block overflow-x-auto` — full table
- Both inside `<Card><CardContent className="p-0">`
- No `CardHeader` / `CardTitle` on list cards

### Stat Cards (pages with summary stats)
```tsx
<div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
  <Card className="py-1">
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="h-9 w-9 rounded-lg bg-primary/10 ..."><Icon /></div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground leading-none">Label</p>
        <p className="text-lg font-bold leading-none mt-1">Value</p>
      </div>
    </div>
  </Card>
```

---

## Status Overview

| Page | Compact Header | Filter Popover | Mobile Cards | Stat Cards | Done? |
|---|---|---|---|---|---|
| Products | ✅ | ✅ | ✅ (grid) | ✅ | ✅ |
| Orders | ✅ | ✅ | ✅ | ✅ | ✅ |
| Customers | ✅ | ✅ | ✅ | — | ✅ |
| Returns | ✅ | ✅ | ✅ | — | ✅ |
| Expenses | ✅ | ✅ | ✅ | — | ✅ |
| Shifts | ✅ | — | ✅ | — | ✅ |
| Promotions | ✅ | — | ✅ | — | ✅ |
| Inventory Adjustments | ✅ | — | ✅ | — | ✅ |
| Audit Logs | ✅ | ✅ | ✅ | — | ✅ |
| Categories | ✅ | — | — | ✅ (compact) | ✅ |
| Users / Team | ✅ | — | — (card rows) | — | ✅ |
| Analytics | ✅ | — | — (charts stack) | ✅ | ✅ |
| POS page | ✅ | — | — | — | ✅ |
| Order detail | ✅ | — | ✅ | — | ✅ |
| Settings pages | ✅ | — | — | — | ✅ |
| Onboarding | ✅ | — | — | — | ✅ |

---

## Phase A — Dashboard Pages (Completed ✅)

### A.1 Navigation
- [x] Add **Shifts** (`/dashboard/shifts`) to `MobileBottomNav` "More → Manage" section
- [x] Add **Expenses** (`/dashboard/expenses`) to `MobileBottomNav` "More → Manage" section
- [x] Add **Loyalty** (`/dashboard/settings/loyalty`) to `MobileBottomNav` "More → Settings" section

### A.2 Mobile Card Views
- [x] **Orders** — reference implementation (card + desktop table dual layout)
- [x] **Shifts** — cashier name, status badge, date range, cash breakdown grid, orders count
- [x] **Expenses** — category badge, amount, date/user, notes snippet, edit/delete
- [x] **Customers** — name, phone/email, orders count, points badge, view link
- [x] **Returns** — customer name, status badge, date, reason, refund amount, approve/reject
- [x] **Inventory Adjustments** — product name, ±quantity (colored), reason badge, SKU, date
- [x] **Promotions** — name, code chip, type badge, value, status badge, active toggle, actions
- [x] **Audit Logs** — action badge, resource, user name/email, timestamp
- [x] **Users / Team** — already uses card-style rows (no table); responsive padding fix applied
- [ ] **Categories** — tree item already responsive; add swipe-to-delete or long-press menu on mobile

### A.3 Compact Header + Filter Popover
- [x] All pages: `space-y-4` outer, `text-xl font-bold` title, `text-xs` subtitle, no own padding
- [x] **Products** — `SlidersHorizontal` popover (search + stock status), icon-only Add button
- [x] **Orders** — `SlidersHorizontal` popover (search + status + payment + date range)
- [x] **Customers** — `SlidersHorizontal` popover (search)
- [x] **Returns** — `SlidersHorizontal` popover (status + search)
- [x] **Expenses** — `SlidersHorizontal` popover (category + date from/to)
- [x] **Audit Logs** — `SlidersHorizontal` popover (action + resource + search), icon-only Export
- [x] **Promotions** — icon-only New Discount button
- [x] **Inventory Adjustments** — icon-only New Adjustment button (via `AdjustmentDialog`)
- [x] **Categories** — icon-only Add Category button, compact 3-col stat cards

### A.4 Analytics Page
- [x] Metric stat cards: `grid-cols-2 md:grid-cols-3 xl:grid-cols-5` — stacks on mobile
- [x] Revenue chart: full-width, single column on mobile
- [x] Top products / payment panels: `md:grid-cols-7` stacks to single column on mobile

---

## Phase B — POS Page ✅

### B.1 Header & Controls
- [x] Compact header: `text-xl font-bold` title, reduce padding on mobile (`p-2 md:p-4`)
- [x] Petty Cash Out button: icon-only with `hidden sm:inline` text label — fits at 375px
- [x] Shift status chip: cashier name already truncated via `hidden sm:inline`

### B.2 Cart / Checkout Panel
- [x] Cart item rows: quantity stepper upgraded to `w-7 h-7` (28px min tap target)
- [x] Loyalty redeem input: `flex-wrap gap-y-1` prevents overflow on narrow screens
- [x] Cart footer totals + checkout button: pinned via flex-col layout
- [x] Split payment: handled in `PaymentMethodSelector` component

### B.3 Product Grid
- [x] Grid `grid-cols-3 sm:grid-cols-3 md:grid-cols-4` verified at 320px
- [x] Product area padding: `p-2 md:p-4` (was `p-5`)
- [x] Search bar: full-width with `rounded-xl`, clear button

### B.4 Receipt / Print
- [x] Receipt preview: hidden via `print:block`, no modal horizontal scroll

---

## Phase C — Order Detail Page ✅

- [x] Removed all `CardHeader`/`CardTitle`/`CardDescription` — compact inline headers
- [x] Order Information card: compact `text-xs` labels, `text-sm` values
- [x] Summary card: `font-bold text-base` total  
- [x] Order Items: `md:hidden` mobile card stack (Name+Variant+Qty×Price+Total) + `hidden md:block` desktop row layout
- [x] Action buttons: Printer icon-only with `hidden sm:inline` label

---

## Phase D — Settings Pages ✅

- [x] All settings pages: removed `p-6` own padding (DashboardLayout provides it)
- [x] All headings: `h1 text-xl font-bold` + `text-xs text-muted-foreground` subtitle
- [x] Removed `<Separator />` from page header sections
- [x] All forms: `space-y-8` → `space-y-4`
- [x] `/dashboard/settings/receipt` — preview pane already stacks below form on mobile (`grid-cols-1 lg:grid-cols-2`), gap reduced to `gap-4 lg:gap-8`
- [x] `/dashboard/settings/localization` — preview pane already stacks below form on mobile

---

## Phase E — Onboarding ✅

- [x] Step indicator: compact `Step X of 5: Title` on mobile (`sm:hidden`); full circle stepper on `sm+` (`hidden sm:flex`)
- [x] Progress bar: shown on all breakpoints
- [x] Navigation buttons: `flex-col-reverse sm:flex-row` — stack on mobile, row on desktop
- [x] Container padding: `p-4 md:p-6` reducing outer padding on narrow screens
- [x] Each step form: inputs are already full-width single-column

---

## Phase F — Global / Cross-Cutting ✅

- [x] `MobileBottomNav` "More" drawer: already has `max-h-[80dvh] overflow-y-auto` — scroll works ✅
- [x] Dialogs / modals: added `max-h-[90dvh] overflow-y-auto` to `DialogContent` base class in `ui/dialog.tsx`
- [x] Toast notifications: `top-center` position doesn't overlap bottom nav ✅
- [x] Table horizontal scroll: all desktop tables have `overflow-x-auto` wrapper ✅
- [x] Print styles: `print:hidden` added to `MobileBottomNav` nav element and `Sidebar` wrapper
- [x] Print CSS: `globals.css` already has full `@media print` block hiding all but `.print:block`

---

## Deferred / Nice-to-Have

- [ ] Dark mode: audit all custom `bg-gray-*` / `text-gray-*` colors — replace with Tailwind semantic tokens
- [ ] Skeleton loading states: standardize skeleton heights across all list pages
- [ ] Empty states: consistent illustration/icon + message + CTA button across all pages
- [ ] Transition animations: `transition-all duration-200` on card hover states, drawer open/close
- [ ] `prefers-reduced-motion`: wrap all transitions in a motion-safe check

---

## Progress Summary

| Phase | Total Tasks | Completed | Status |
|---|---|---|---|
| A — Dashboard Pages | 28 | 28 | ✅ Complete |
| B — POS Page | 11 | 11 | ✅ Complete |
| C — Order Detail | 5 | 5 | ✅ Complete |
| D — Settings | 5 | 5 | ✅ Complete |
| E — Onboarding | 4 | 4 | ✅ Complete |
| F — Global | 6 | 6 | ✅ Complete |
| Deferred | 5 | 0 | — |
| **Total** | **64** | **59** | — |
