import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SALE_STATUSES, getRefundsInPeriod } from "@/lib/refunds";
import { getAuthUser, requirePermission } from "@/lib/auth";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export async function GET(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const denied = await requirePermission(authResult.user, 'VIEW', 'ANALYTICS');
        if (denied) return denied;
        const { tenantId } = authResult.user;

        const { searchParams } = new URL(req.url);
        const startDateParam = searchParams.get("startDate");
        const endDateParam = searchParams.get("endDate");

        const startDate = startDateParam ? startOfDay(parseISO(startDateParam)) : startOfDay(new Date());
        const endDate = endDateParam ? endOfDay(parseISO(endDateParam)) : endOfDay(new Date());

        const orders = await prisma.order.findMany({
            where: {
                tenantId,
                status: { in: [...SALE_STATUSES] },
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                items: true,
            },
        });

        let totalRevenue = 0;
        let totalCost = 0;
        let totalOrders = orders.length;

        for (const order of orders) {
            totalRevenue += Number(order.total);

            for (const item of order.items) {
                const cost = Number(item.cost || 0);
                totalCost += cost * item.quantity;
            }
        }

        // Aggregate expenses for the same period
        const expenseAgg = await prisma.expense.aggregate({
            where: {
                tenantId,
                date: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
        });
        const totalExpenses = Number((expenseAgg._sum as any)?.amount ?? 0);

        // Refunds paid out in the period reduce revenue; goods put back on the shelf are no longer a cost
        const refunds = await getRefundsInPeriod(prisma, tenantId, startDate, endDate);
        const grossRevenue = totalRevenue;
        totalRevenue = grossRevenue - refunds.total;
        totalCost -= refunds.restockedCost;

        const totalProfit = totalRevenue - totalCost - totalExpenses;
        const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        return NextResponse.json({
            totalRevenue,
            totalProfit,
            totalOrders,
            averageOrderValue,
            margin,
            totalExpenses,
            grossRevenue,
            totalRefunds: refunds.total,
        });

    } catch (error) {
        console.error("Error fetching analytics summary:", error);
        return NextResponse.json({ error: "Failed to fetch analytics summary" }, { status: 500 });
    }
}
