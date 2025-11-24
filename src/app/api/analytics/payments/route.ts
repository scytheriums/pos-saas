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
        });

        const paymentStats = new Map<string, {
            name: string;
            value: number; // Revenue
            count: number;
        }>();

        for (const order of orders) {
            const method = order.paymentMethod || 'UNKNOWN';
            const revenue = Number(order.total);

            const existing = paymentStats.get(method) || {
                name: method,
                value: 0,
                count: 0
            };

            existing.value += revenue;
            existing.count += 1;
            paymentStats.set(method, existing);
        }

        const payments = Array.from(paymentStats.values())
            .sort((a, b) => b.value - a.value);

        return NextResponse.json(payments);

    } catch (error) {
        console.error("Error fetching analytics payments:", error);
        return NextResponse.json({ error: "Failed to fetch analytics payments" }, { status: 500 });
    }
}
