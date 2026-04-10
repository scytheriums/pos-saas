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

        const variantIds = product.variants.map(v => v.id);

        // Get PO receipt cost update events for this product's variants
        const poItems = await prisma.purchaseOrderItem.findMany({
            where: {
                variantId: { in: variantIds },
                updateVariantCost: true,
                receivedQuantity: { gt: 0 },
                purchaseOrder: { tenantId },
            },
            select: {
                id: true,
                unitCost: true,
                receivedQuantity: true,
                variant: { select: { sku: true } },
                purchaseOrder: { select: { id: true, createdAt: true } },
            },
            orderBy: { purchaseOrder: { createdAt: 'desc' } },
        });

        const poUpdates = poItems.map(item => ({
            date: item.purchaseOrder.createdAt,
            poId: item.purchaseOrder.id,
            variantSku: item.variant?.sku ?? null,
            unitCost: Number(item.unitCost),
            receivedQuantity: item.receivedQuantity,
        }));

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

        // Group by (variantSku, cost) to find per-variant cost periods
        const costPeriods = new Map<string, {
            cost: number;
            variantSku: string;
            firstSeenDate: Date;
            lastSeenDate: Date;
            orderCount: number;
            totalQuantity: number;
            totalRevenue: number;
        }>();

        for (const item of orderItems) {
            const mapKey = `${item.variant.sku}::${Number(item.cost).toFixed(2)}`;
            const existing = costPeriods.get(mapKey);

            if (existing) {
                existing.lastSeenDate = item.order.createdAt;
                existing.orderCount += 1;
                existing.totalQuantity += item.quantity;
                existing.totalRevenue += Number(item.price) * item.quantity;
            } else {
                costPeriods.set(mapKey, {
                    cost: Number(item.cost),
                    variantSku: item.variant.sku,
                    firstSeenDate: item.order.createdAt,
                    lastSeenDate: item.order.createdAt,
                    orderCount: 1,
                    totalQuantity: item.quantity,
                    totalRevenue: Number(item.price) * item.quantity,
                });
            }
        }

        const history = Array.from(costPeriods.values()).map(period => {
            const averagePrice = period.totalQuantity > 0 ? period.totalRevenue / period.totalQuantity : 0;
            const totalCost = period.cost * period.totalQuantity;
            const totalProfit = period.totalRevenue - totalCost;
            const margin = period.totalRevenue > 0 ? (totalProfit / period.totalRevenue) * 100 : 0;

            return {
                cost: period.cost,
                variantSku: period.variantSku,
                firstSeenDate: period.firstSeenDate,
                lastSeenDate: period.lastSeenDate,
                orderCount: period.orderCount,
                totalQuantity: period.totalQuantity,
                averagePrice,
                margin,
            };
        }).sort((a, b) => {
            if (a.variantSku !== b.variantSku) return a.variantSku.localeCompare(b.variantSku);
            return b.firstSeenDate.getTime() - a.firstSeenDate.getTime();
        });

        return NextResponse.json({
            productId: product.id,
            productName: product.name,
            variantsCount: product.variants.length,
            variants: product.variants.map(v => ({
                id: v.id,
                sku: v.sku,
                cost: Number(v.cost),
                price: Number(v.price),
                margin: Number(v.price) > 0 ? ((Number(v.price) - Number(v.cost)) / Number(v.price)) * 100 : 0,
            })),
            history,
            poUpdates,
        });

    } catch (error) {
        console.error("Error fetching cost history:", error);
        return NextResponse.json({ error: "Failed to fetch cost history" }, { status: 500 });
    }
}
