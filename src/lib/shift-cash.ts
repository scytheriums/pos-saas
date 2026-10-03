import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Orders whose money went through the drawer. Refunded orders still count as sales here:
 * the refund is subtracted separately, from the shift that paid it out.
 */
const SOLD_STATUSES = ['COMPLETED', 'REFUNDED'] as const;

export interface ShiftCash {
    /** Amount taken per payment method (cash is net of change given) */
    breakdown: Record<string, number>;
    cashSales: number;
    totalPayouts: number;
    cashRefunds: number;
    expectedCash: number;
    totalRevenue: number;
}

/**
 * The one place shift money is calculated: the shift list, the shift summary and
 * closing a shift all use this, so the numbers on screen match what's saved.
 */
export async function getShiftCash(db: Db, shift: { id: string; openingFloat: Prisma.Decimal | number }): Promise<ShiftCash> {
    const [entries, legacyOrders, revenue, payouts, refunds] = await Promise.all([
        db.paymentEntry.groupBy({
            by: ['method'],
            where: { order: { shiftId: shift.id, status: { in: [...SOLD_STATUSES] } } },
            _sum: { amount: true },
        }),
        // Orders from before split payments have no entries: count their total under their method
        db.order.groupBy({
            by: ['paymentMethod'],
            where: { shiftId: shift.id, status: { in: [...SOLD_STATUSES] }, paymentEntries: { none: {} } },
            _sum: { total: true },
        }),
        db.order.aggregate({
            where: { shiftId: shift.id, status: { in: [...SOLD_STATUSES] } },
            _sum: { total: true },
        }),
        db.pettyCashPayout.aggregate({
            where: { shiftId: shift.id },
            _sum: { amount: true },
        }),
        db.return.aggregate({
            where: { shiftId: shift.id, status: 'COMPLETED', refundMethod: 'CASH' },
            _sum: { refundAmount: true },
        }),
    ]);

    const breakdown: Record<string, number> = {};
    for (const e of entries) {
        breakdown[e.method] = (breakdown[e.method] ?? 0) + Number(e._sum.amount ?? 0);
    }
    for (const o of legacyOrders) {
        if (!o.paymentMethod) continue;
        breakdown[o.paymentMethod] = (breakdown[o.paymentMethod] ?? 0) + Number(o._sum.total ?? 0);
    }

    const cashSales = breakdown['CASH'] ?? 0;
    const totalPayouts = Number(payouts._sum.amount ?? 0);
    const cashRefunds = Number(refunds._sum.refundAmount ?? 0);

    return {
        breakdown,
        cashSales,
        totalPayouts,
        cashRefunds,
        expectedCash: Number(shift.openingFloat) + cashSales - totalPayouts - cashRefunds,
        totalRevenue: Number(revenue._sum.total ?? 0),
    };
}

/**
 * Split payments as stored: the amount kept per method. Cash handed over beyond the total is
 * change, so it's taken off the cash entries. Returns null if non-cash payments exceed the total.
 */
export function netPaymentEntries<T extends { method: string; amount: number }>(entries: T[], total: number): T[] | null {
    const paid = entries.reduce((sum, e) => sum + e.amount, 0);
    let change = Math.round((paid - total) * 100) / 100;
    if (change <= 0) return entries;

    const cashPaid = entries.filter(e => e.method === 'CASH').reduce((sum, e) => sum + e.amount, 0);
    if (cashPaid + 0.005 < change) return null;

    // Take change off the last cash entries first
    const result = entries.map(e => ({ ...e }));
    for (let i = result.length - 1; i >= 0 && change > 0; i--) {
        if (result[i].method !== 'CASH') continue;
        const take = Math.min(result[i].amount, change);
        result[i].amount = Math.round((result[i].amount - take) * 100) / 100;
        change = Math.round((change - take) * 100) / 100;
    }
    return result.filter(e => e.amount > 0);
}
