import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export async function GET(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const { searchParams } = new URL(req.url);
        const startDateParam = searchParams.get("startDate");
        const endDateParam = searchParams.get("endDate");

        const startDate = startDateParam ? startOfDay(parseISO(startDateParam)) : startOfDay(new Date());
        const endDate = endDateParam ? endOfDay(parseISO(endDateParam)) : endOfDay(new Date());

        const orders = await prisma.order.findMany({
            where: {
                tenantId,
                status: "COMPLETED",
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
        });

    } catch (error) {
        console.error("Error fetching analytics summary:", error);
        return NextResponse.json({ error: "Failed to fetch analytics summary" }, { status: 500 });
    }
}
