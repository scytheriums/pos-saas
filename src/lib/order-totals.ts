/**
 * Order total calculation shared by the POS screen and POST /api/orders,
 * so what the cashier shows and what the server records can't drift apart.
 * Pure functions only — safe to import from client components.
 */

export interface TotalsLine {
    price: number;
    quantity: number;
    itemDiscount?: number;
}

export interface TotalsDiscount {
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    value: number;
    maxDiscount?: number | null;
    minPurchase?: number | null;
}

export interface TotalsInput {
    lines: TotalsLine[];
    /** Tenant tax rate in percent, e.g. 11 */
    taxRatePercent: number;
    discount?: TotalsDiscount | null;
    pointsRedeemed?: number;
    /** Rupiah per point */
    pointRedemptionRate?: number;
}

export interface OrderTotals {
    subtotal: number;
    tax: number;
    discountAmount: number;
    /** Points actually used — fewer than requested when they'd cover more than the total */
    pointsUsed: number;
    pointsDiscount: number;
    total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Item discount clamped to the line's value. */
export function lineDiscount(line: TotalsLine): number {
    return Math.min(Math.max(line.itemDiscount ?? 0, 0), line.price * line.quantity);
}

/** Promo discount for a given subtotal (after item discounts, before tax). 0 if the minimum isn't met. */
export function promoDiscountAmount(discount: TotalsDiscount, subtotal: number): number {
    if (discount.minPurchase && subtotal < discount.minPurchase) return 0;
    let amount = discount.type === 'PERCENTAGE'
        ? (subtotal * discount.value) / 100
        : discount.value;
    if (discount.type === 'PERCENTAGE' && discount.maxDiscount && amount > discount.maxDiscount) {
        amount = discount.maxDiscount;
    }
    return Math.min(Math.max(amount, 0), subtotal);
}

export function calculateOrderTotals(input: TotalsInput): OrderTotals {
    const subtotal = input.lines.reduce((sum, l) => sum + l.price * l.quantity - lineDiscount(l), 0);
    const tax = subtotal * (input.taxRatePercent / 100);
    const discountAmount = input.discount ? promoDiscountAmount(input.discount, subtotal) : 0;

    // Points can't take the total below zero, and only the points needed are used
    const beforePoints = Math.max(0, subtotal + tax - discountAmount);
    const rate = input.pointRedemptionRate ?? 0;
    const pointsUsed = rate > 0
        ? Math.min(Math.max(0, Math.floor(input.pointsRedeemed ?? 0)), Math.ceil(beforePoints / rate))
        : 0;
    const pointsDiscount = Math.min(Math.floor(pointsUsed * rate), beforePoints);

    return {
        subtotal: round2(subtotal),
        tax: round2(tax),
        discountAmount: round2(discountAmount),
        pointsUsed,
        pointsDiscount: round2(pointsDiscount),
        total: round2(beforePoints - pointsDiscount),
    };
}
