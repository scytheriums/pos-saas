import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const productId = params.id;

        // Verify product belongs to tenant
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                tenantId
            },
            select: {
                id: true,
                name: true,
                variants: {
                    select: {
                        id: true,
                        sku: true,
                        price: true,
                        cost: true
                    }
                }
            }
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Get all order items for this product's variants
        const orderItems = await prisma.orderItem.findMany({
            where: {
                variant: {
                    productId: productId
                },
                order: {
                    tenantId,
                    status: "COMPLETED"
                }
            },
            select: {
                cost: true,
                price: true,
                quantity: true,
                order: {
                    select: {
                        createdAt: true
                    }
                },
                variant: {
                    select: {
                        sku: true
                    }
                }
            },
            orderBy: {
                order: {
                    createdAt: 'asc'
                }
            }
        });

        // Group by cost to find cost periods
        const costPeriods = new Map<string, {
            cost: number;
            firstSeenDate: Date;
            lastSeenDate: Date;
            orderCount: number;
            totalQuantity: number;
            totalRevenue: number;
            variantsSeen: Set<string>;
        }>();

        for (const item of orderItems) {
            const costKey = Number(item.cost).toFixed(2);
            const existing = costPeriods.get(costKey);

            if (existing) {
                existing.lastSeenDate = item.order.createdAt;
                existing.orderCount += 1;
                existing.totalQuantity += item.quantity;
                existing.totalRevenue += Number(item.price) * item.quantity;
                existing.variantsSeen.add(item.variant.sku);
            } else {
                costPeriods.set(costKey, {
                    cost: Number(item.cost),
                    firstSeenDate: item.order.createdAt,
                    lastSeenDate: item.order.createdAt,
                    orderCount: 1,
                    totalQuantity: item.quantity,
                    totalRevenue: Number(item.price) * item.quantity,
                    variantsSeen: new Set([item.variant.sku])
                });
            }
        }

        // Convert to array and calculate metrics
        const history = Array.from(costPeriods.values()).map(period => {
            const averagePrice = period.totalQuantity > 0 ? period.totalRevenue / period.totalQuantity : 0;
            const totalCost = period.cost * period.totalQuantity;
            const totalProfit = period.totalRevenue - totalCost;
            const margin = period.totalRevenue > 0 ? (totalProfit / period.totalRevenue) * 100 : 0;

            return {
                cost: period.cost,
                firstSeenDate: period.firstSeenDate,
                lastSeenDate: period.lastSeenDate,
                orderCount: period.orderCount,
                totalQuantity: period.totalQuantity,
                averagePrice,
                margin,
                variantsCount: period.variantsSeen.size
            };
        }).sort((a, b) => b.firstSeenDate.getTime() - a.firstSeenDate.getTime());

        // Get current variant data
        const currentCost = product.variants.length > 0 ? Number(product.variants[0].cost) : 0;
        const currentPrice = product.variants.length > 0 ? Number(product.variants[0].price) : 0;
        const currentMargin = currentPrice > 0 ? ((currentPrice - currentCost) / currentPrice) * 100 : 0;

        return NextResponse.json({
            productId: product.id,
            productName: product.name,
            currentCost,
            currentPrice,
            currentMargin,
            variantsCount: product.variants.length,
            history
        });

    } catch (error) {
        console.error("Error fetching cost history:", error);
        return NextResponse.json({ error: "Failed to fetch cost history" }, { status: 500 });
    }
}
