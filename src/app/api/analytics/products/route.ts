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
        const limitParam = searchParams.get("limit");

        const startDate = startDateParam ? startOfDay(parseISO(startDateParam)) : startOfDay(new Date());
        const endDate = endDateParam ? endOfDay(parseISO(endDateParam)) : endOfDay(new Date());
        const limit = limitParam ? parseInt(limitParam) : 10;

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
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true,
                            }
                        },
                    },
                },
            },
        });

        const productStats = new Map<string, {
            id: string;
            name: string;
            revenue: number;
            profit: number;
            sales: number;
        }>();

        for (const order of orders) {
            for (const item of order.items) {
                const productId = item.variant.productId;
                const productName = item.variant.product.name;
                const revenue = Number(item.price) * item.quantity;
                const cost = Number(item.cost || 0) * item.quantity;
                const profit = revenue - cost;

                const existing = productStats.get(productId) || {
                    id: productId,
                    name: productName,
                    revenue: 0,
                    profit: 0,
                    sales: 0
                };

                existing.revenue += revenue;
                existing.profit += profit;
                existing.sales += item.quantity;

                productStats.set(productId, existing);
            }
        }

        const topProducts = Array.from(productStats.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, limit);

        return NextResponse.json(topProducts);

    } catch (error) {
        console.error("Error fetching analytics products:", error);
        return NextResponse.json({ error: "Failed to fetch analytics products" }, { status: 500 });
    }
}
