import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/** Orders that count as sales in reports. Fully refunded orders stay in; their refunds are subtracted. */
export const SALE_STATUSES = ['COMPLETED', 'REFUNDED'] as const;

/**
 * Refunds paid out (completed returns) in a period, counted on the day they were processed.
 * `restockedCost` is the cost of goods that went back on the shelf, which is no longer a cost of sale.
 */
export async function getRefundsInPeriod(db: Db, tenantId: string, start: Date, end: Date) {
    const returns = await db.return.findMany({
        where: { tenantId, status: 'COMPLETED', processedAt: { gte: start, lte: end } },
        select: {
            processedAt: true,
            refundAmount: true,
            items: { select: { orderItemId: true, quantity: true, restocked: true } },
        },
    });

    const restockedItems = returns.flatMap(r => r.items.filter(i => i.restocked));
    const costs = restockedItems.length > 0
        ? await db.orderItem.findMany({
            where: { id: { in: restockedItems.map(i => i.orderItemId) } },
            select: { id: true, cost: true },
        })
        : [];
    const costById = new Map(costs.map(c => [c.id, Number(c.cost)]));

    let total = 0;
    const byDate = new Map<string, number>();
    for (const r of returns) {
        const amount = Number(r.refundAmount);
        total += amount;
        const key = (r.processedAt ?? new Date()).toISOString().split('T')[0];
        byDate.set(key, (byDate.get(key) ?? 0) + amount);
    }

    const restockedCost = restockedItems.reduce((sum, i) => sum + (costById.get(i.orderItemId) ?? 0) * i.quantity, 0);

    return { total, restockedCost, byDate, count: returns.length };
}
