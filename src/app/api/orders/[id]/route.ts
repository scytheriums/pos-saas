import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requirePermission } from "@/lib/auth";
import { getReturnedTotals, netUnitPrice } from "@/lib/returns";

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        // Get authenticated user and tenant
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const denied = await requirePermission(authResult.user, 'VIEW', 'ORDERS');
        if (denied) return denied;
        const { tenantId } = authResult.user;
        const { id } = params;
        const order = await prisma.order.findFirst({
            where: {
                id: id,
                tenantId, // Ensure user can only access their tenant's orders
            },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: {
                                    select: {
                                        name: true
                                    }
                                },
                                optionValues: {
                                    select: {
                                        value: true
                                    }
                                },
                                unit: { select: { name: true } }
                            }
                        }
                    },
                    orderBy: { id: 'asc' },
                },
                discount: true,
                customer: true,
                paymentEntries: {
                    orderBy: { id: 'asc' },
                },
            }
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Return limits per line, so the returns form can show what's left
        const { returnedQty, refunded } = await getReturnedTotals(prisma, order.id);
        const linesNet = order.items.reduce((sum, i) => sum + netUnitPrice(i) * i.quantity, 0);
        const paidRatio = linesNet > 0 ? Number(order.total) / linesNet : 0;

        return NextResponse.json({
            ...order,
            items: order.items.map(item => ({
                ...item,
                returnedQuantity: returnedQty.get(item.id) ?? 0,
                returnableQuantity: Math.max(0, item.quantity - (returnedQty.get(item.id) ?? 0)),
                // What the customer actually paid per unit, after discounts, points and tax
                refundableUnitPrice: Math.round(netUnitPrice(item) * paidRatio * 100) / 100,
            })),
            refundedAmount: refunded,
            refundableAmount: Math.max(0, Number(order.total) - refunded),
        });
    } catch (error) {
        console.error("Error fetching order:", error);
        return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
    }
}
