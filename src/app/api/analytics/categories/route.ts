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
                items: {
                    include: {
                        variant: {
                            include: {
                                product: {
                                    include: {
                                        category: true,
                                    }
                                },
                            }
                        },
                    },
                },
            },
        });

        const categoryStats = new Map<string, {
            name: string;
            value: number; // Revenue
        }>();

        for (const order of orders) {
            for (const item of order.items) {
                const categoryName = item.variant.product.category?.name || 'Uncategorized';
                const revenue = Number(item.price) * item.quantity;

                const existing = categoryStats.get(categoryName) || {
                    name: categoryName,
                    value: 0,
                };

                existing.value += revenue;
                categoryStats.set(categoryName, existing);
            }
        }

        const categories = Array.from(categoryStats.values())
            .sort((a, b) => b.value - a.value);

        return NextResponse.json(categories);

    } catch (error) {
        console.error("Error fetching analytics categories:", error);
        return NextResponse.json({ error: "Failed to fetch analytics categories" }, { status: 500 });
    }
}
