import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { NON_RESTOCKABLE_REASONS } from "@/lib/returns";

class ReturnAlreadyProcessedError extends Error {}

// PATCH /api/returns/[id]/approve - Approve return and process refund
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const denied = await requirePermission(authResult.user, 'EDIT', 'RETURNS');
        if (denied) return denied;
        const { tenantId, id: userId, name: userName } = authResult.user;

        // Verify return exists and is pending
        const returnRecord = await prisma.return.findFirst({
            where: { id, tenantId },
            include: {
                items: true
            }
        });

        if (!returnRecord) {
            return NextResponse.json({ error: "Return not found" }, { status: 404 });
        }

        if (returnRecord.status !== "PENDING") {
            return NextResponse.json({
                error: `Return is already ${returnRecord.status.toLowerCase()}`
            }, { status: 400 });
        }

        // Count items for logging
        const itemsCount = returnRecord.items.length;

        // Process return approval in transaction
        const updatedReturn = await prisma.$transaction(async (tx) => {
            // 1. Claim the return: only one request can move it out of PENDING
            const claimed = await tx.return.updateMany({
                where: { id, tenantId, status: "PENDING" },
                data: {
                    status: "APPROVED",
                    processedAt: new Date(),
                    processedBy: userId,
                    processedByName: userName
                }
            });
            if (claimed.count === 0) {
                throw new ReturnAlreadyProcessedError();
            }

            const approved = await tx.return.findUniqueOrThrow({
                where: { id },
                include: {
                    items: {
                        include: {
                            variant: {
                                include: {
                                    product: true
                                }
                            }
                        }
                    }
                }
            });

            // 2. Restock items — not when stock isn't tracked, and not for defective goods
            const tenant = await tx.tenant.findUnique({
                where: { id: tenantId },
                select: { enableStockManagement: true }
            });
            const restock = tenant?.enableStockManagement !== false && !NON_RESTOCKABLE_REASONS.has(approved.reason);

            for (const item of approved.items) {
                if (restock && !item.restocked) {
                    await tx.productVariant.update({
                        where: { id: item.variantId },
                        data: {
                            stock: { increment: item.quantity }
                        }
                    });

                    await tx.returnItem.update({
                        where: { id: item.id },
                        data: { restocked: true }
                    });

                    await logAudit({
                        tenantId,
                        userId,
                        userName,
                        action: "STOCK_ADJUSTMENT",
                        resource: "PRODUCT",
                        resourceId: item.variantId,
                        details: {
                            reason: "RETURN",
                            returnId: id,
                            quantity: item.quantity,
                            type: "INCREMENT",
                            productName: item.variant.product.name
                        },
                        request: req
                    });
                }
            }

            // 3. A cash refund comes out of the approver's drawer: link it to their open shift
            const cashShift = approved.refundMethod === "CASH"
                ? await tx.shift.findFirst({ where: { tenantId, userId, status: "OPEN" }, select: { id: true } })
                : null;

            // 4. Update status to COMPLETED
            await tx.return.update({
                where: { id },
                data: { status: "COMPLETED", shiftId: cashShift?.id ?? null }
            });

            // 5. Fully returned orders become REFUNDED (partial returns keep the order COMPLETED)
            const order = await tx.order.findUniqueOrThrow({
                where: { id: approved.orderId },
                select: { id: true, total: true, customerId: true, pointsEarned: true, pointsRedeemed: true, items: { select: { id: true, quantity: true } } },
            });
            const completedReturnItems = await tx.returnItem.findMany({
                where: { return: { orderId: order.id, status: "COMPLETED" } },
                select: { orderItemId: true, quantity: true },
            });
            const returnedByItem = new Map<string, number>();
            for (const ri of completedReturnItems) {
                returnedByItem.set(ri.orderItemId, (returnedByItem.get(ri.orderItemId) ?? 0) + ri.quantity);
            }
            if (order.items.every(i => (returnedByItem.get(i.id) ?? 0) >= i.quantity)) {
                await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
            }

            // 6. Loyalty: take back points earned on the refunded share, give back points spent on it
            let pointsChange = 0;
            if (order.customerId && Number(order.total) > 0) {
                const share = Math.min(1, Number(approved.refundAmount) / Number(order.total));
                const reverseEarned = Math.floor(order.pointsEarned * share);
                const restoreRedeemed = Math.floor(order.pointsRedeemed * share);
                pointsChange = restoreRedeemed - reverseEarned;
                if (pointsChange !== 0) {
                    const customer = await tx.customer.findUniqueOrThrow({ where: { id: order.customerId }, select: { points: true } });
                    // Never below zero (points may already have been spent)
                    await tx.customer.update({
                        where: { id: order.customerId },
                        data: { points: Math.max(0, customer.points + pointsChange) },
                    });
                }
            }

            approved.status = "COMPLETED";
            return { ...approved, restocked: restock, pointsChange };
        });

        // Log audit trail
        await logAudit({
            tenantId,
            userId,
            userName,
            action: "UPDATE",
            resource: "RETURN",
            resourceId: id,
            details: {
                action: "APPROVED",
                refundAmount: Number(updatedReturn.refundAmount),
                refundMethod: updatedReturn.refundMethod,
                itemsRestocked: updatedReturn.restocked ? itemsCount : 0,
                loyaltyPointsChange: updatedReturn.pointsChange
            },
            request: req
        });

        return NextResponse.json(updatedReturn);
    } catch (error) {
        if (error instanceof ReturnAlreadyProcessedError) {
            return NextResponse.json({ error: "This return has already been processed" }, { status: 409 });
        }
        console.error("Error approving return:", error);
        return NextResponse.json({ error: "Failed to approve return" }, { status: 500 });
    }
}
