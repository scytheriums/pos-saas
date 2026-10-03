import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requirePermission } from "@/lib/auth";
import { logCrudAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";
import { getReturnedTotals, netUnitPrice } from "@/lib/returns";

class ReturnValidationError extends Error {
    constructor(message: string, public status: number = 400) {
        super(message);
    }
}

// GET /api/returns - List all returns with pagination and filters
export async function GET(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const denied = await requirePermission(authResult.user, 'VIEW', 'RETURNS');
        if (denied) return denied;
        const { tenantId } = authResult.user;

        const { searchParams } = new URL(req.url);
        const cursor = searchParams.get('cursor');
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
        const status = searchParams.get('status');
        const orderId = searchParams.get('orderId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const where: Prisma.ReturnWhereInput = {
            tenantId,
            ...(status && { status: status as any }),
            ...(orderId && { orderId }),
            ...(startDate || endDate ? {
                createdAt: {
                    ...(startDate && { gte: new Date(startDate) }),
                    ...(endDate && { lte: new Date(endDate) }),
                }
            } : {})
        };

        const returns = await prisma.return.findMany({
                where,
                take: limit + 1,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                orderBy: { createdAt: 'desc' },
                include: {
                    order: {
                        select: {
                            id: true,
                            total: true,
                            customerName: true,
                            createdAt: true
                        }
                    },
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true
                        }
                    },
                    items: {
                        include: {
                            variant: {
                                include: {
                                    product: {
                                        select: {
                                            name: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

        const hasMore = returns.length > limit;
        const data = hasMore ? returns.slice(0, limit) : returns;
        const nextCursor = hasMore ? data[data.length - 1].id : null;

        return NextResponse.json({
            returns: data,
            nextCursor,
            hasMore,
        });
    } catch (error) {
        console.error("Error fetching returns:", error);
        return NextResponse.json({ error: "Failed to fetch returns" }, { status: 500 });
    }
}

// POST /api/returns - Create a new return
export async function POST(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const denied = await requirePermission(authResult.user, 'CREATE', 'RETURNS');
        if (denied) return denied;
        const { tenantId, id: userId, name: userName } = authResult.user;

        const body = await req.json();
        const { orderId, items, reason, reasonNote, refundMethod } = body;

        if (!orderId || !items || items.length === 0 || !reason || !refundMethod) {
            return NextResponse.json({
                error: "Order ID, items, reason, and refund method are required"
            }, { status: 400 });
        }

        const VALID_REASONS = ["DEFECTIVE", "WRONG_ITEM", "NOT_AS_DESCRIBED", "CHANGED_MIND", "DUPLICATE_ORDER", "OTHER"];
        const VALID_REFUND_METHODS = ["CASH", "STORE_CREDIT", "ORIGINAL_PAYMENT"];
        if (!VALID_REASONS.includes(reason) || !VALID_REFUND_METHODS.includes(refundMethod)) {
            return NextResponse.json({ error: "Invalid return reason or refund method" }, { status: 400 });
        }

        const returnRecord = await prisma.$transaction(async (tx) => {
            // Lock the order so concurrent returns can't both claim the same items
            await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;

            // Verify order exists and belongs to tenant
            const order = await tx.order.findFirst({
                where: { id: orderId, tenantId },
                include: { items: true }
            });

            if (!order) {
                throw new ReturnValidationError("Order not found", 404);
            }
            if (order.status !== "COMPLETED") {
                throw new ReturnValidationError(`Items can't be returned from a ${order.status.toLowerCase()} order`);
            }

            // Everything below is derived from the order, not the request, except what's being returned
            const { returnedQty, refunded } = await getReturnedTotals(tx, order.id);
            // Spread what the customer actually paid (after order discount, points and tax) across lines
            const linesNet = order.items.reduce((sum, i) => sum + netUnitPrice(i) * i.quantity, 0);
            const paidRatio = linesNet > 0 ? Number(order.total) / linesNet : 0;
            const seen = new Set<string>();
            const lines: { orderItemId: string; variantId: string; quantity: number; price: Prisma.Decimal; refundAmount: number }[] = [];

            for (const incoming of items as { orderItemId: string; quantity: number; refundAmount: number }[]) {
                const orderItem = order.items.find(i => i.id === incoming.orderItemId);
                if (!orderItem) {
                    throw new ReturnValidationError("One of the items is not part of this order");
                }
                if (seen.has(orderItem.id)) {
                    throw new ReturnValidationError("Each order item can only appear once in a return");
                }
                seen.add(orderItem.id);

                const quantity = Number(incoming.quantity);
                const remaining = orderItem.quantity - (returnedQty.get(orderItem.id) ?? 0);
                if (!Number.isInteger(quantity) || quantity < 1) {
                    throw new ReturnValidationError("Return quantity must be a whole number of at least 1");
                }
                if (quantity > remaining) {
                    throw new ReturnValidationError(
                        remaining > 0
                            ? `Only ${remaining} of this item can still be returned`
                            : "This item has already been fully returned"
                    );
                }

                const maxRefund = Math.round(netUnitPrice(orderItem) * quantity * paidRatio * 100) / 100;
                const refundAmount = Number(incoming.refundAmount);
                if (!Number.isFinite(refundAmount) || refundAmount < 0) {
                    throw new ReturnValidationError("Refund amount must be zero or more");
                }
                if (refundAmount > maxRefund) {
                    throw new ReturnValidationError(`Refund for an item can't exceed what was paid for it (${maxRefund})`);
                }

                lines.push({ orderItemId: orderItem.id, variantId: orderItem.variantId, quantity, price: orderItem.price, refundAmount });
            }

            // Order-level discounts mean line totals can exceed what was actually paid overall
            const totalRefundAmount = lines.reduce((sum, l) => sum + l.refundAmount, 0);
            const refundable = Math.max(0, Number(order.total) - refunded);
            if (totalRefundAmount > refundable + 0.005) {
                throw new ReturnValidationError(`Total refund can't exceed the ${refundable} still refundable on this order`);
            }

            return tx.return.create({
                data: {
                    tenantId,
                    orderId,
                    customerId: order.customerId,
                    reason,
                    reasonNote,
                    refundMethod,
                    refundAmount: new Prisma.Decimal(totalRefundAmount),
                    status: "PENDING",
                    processedBy: userId,
                    processedByName: userName,
                    items: {
                        create: lines.map(l => ({
                            orderItemId: l.orderItemId,
                            variantId: l.variantId,
                            quantity: l.quantity,
                            price: l.price,
                            refundAmount: new Prisma.Decimal(l.refundAmount)
                        }))
                    }
                },
                include: {
                    items: {
                        include: {
                            variant: {
                                include: {
                                    product: true
                                }
                            }
                        }
                    },
                    order: true,
                    customer: true
                }
            });
        });

        // Log audit trail
        await logCrudAudit({
            tenantId,
            userId,
            userName,
            action: "CREATE",
            resource: "RETURN",
            resourceId: returnRecord.id,
            after: {
                orderId: returnRecord.orderId,
                reason: returnRecord.reason,
                refundAmount: Number(returnRecord.refundAmount),
                itemsCount: returnRecord.items.length
            },
            request: req
        });

        return NextResponse.json(returnRecord, { status: 201 });
    } catch (error) {
        if (error instanceof ReturnValidationError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Error creating return:", error);
        return NextResponse.json({ error: "Failed to create return" }, { status: 500 });
    }
}
