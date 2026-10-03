import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/** Returns in these states count against what can still be returned/refunded. */
const ACTIVE_RETURN_STATUSES = ['PENDING', 'APPROVED', 'COMPLETED'] as const;

/** Reasons where the goods can't go back on the shelf. */
export const NON_RESTOCKABLE_REASONS = new Set(['DEFECTIVE']);

/**
 * Quantities and money already claimed by returns on an order (pending or done;
 * rejected returns are ignored).
 */
export async function getReturnedTotals(db: Db, orderId: string) {
    const items = await db.returnItem.findMany({
        where: { return: { orderId, status: { in: [...ACTIVE_RETURN_STATUSES] } } },
        select: { orderItemId: true, quantity: true, refundAmount: true },
    });

    const returnedQty = new Map<string, number>();
    let refunded = 0;
    for (const item of items) {
        returnedQty.set(item.orderItemId, (returnedQty.get(item.orderItemId) ?? 0) + item.quantity);
        refunded += Number(item.refundAmount);
    }
    return { returnedQty, refunded };
}

/** What the customer actually paid per unit for an order line, after its item discount. */
export function netUnitPrice(item: { price: Prisma.Decimal | number; quantity: number; itemDiscount: Prisma.Decimal | number }) {
    const gross = Number(item.price) * item.quantity;
    return Math.max(0, (gross - Number(item.itemDiscount)) / item.quantity);
}
