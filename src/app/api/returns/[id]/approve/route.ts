import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

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

        // Process return approval in transaction
        const updatedReturn = await prisma.$transaction(async (tx) => {
            // 1. Update return status to APPROVED
            const approved = await tx.return.update({
                where: { id },
                data: {
                    status: "APPROVED",
                    processedAt: new Date(),
                    processedBy: userId,
                    processedByName: userName
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
                    }
                }
            });

            // 2. Restock items
            for (const item of approved.items) {
                if (!item.restocked) {
                    // Increment stock
                    await tx.productVariant.update({
                        where: { id: item.variantId },
                        data: {
                            stock: { increment: item.quantity }
                        }
                    });

                    // Mark as restocked
                    await tx.returnItem.update({
                        where: { id: item.id },
                        data: { restocked: true }
                    });

                    // Log stock adjustment
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

            // 3. Update status to COMPLETED
            await tx.return.update({
                where: { id },
                data: { status: "COMPLETED" }
            });

            // Update approved object status for return
            approved.status = "COMPLETED";
            return approved;
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
                itemsRestocked: updatedReturn.items.length
            },
            request: req
        });

        return NextResponse.json(updatedReturn);
    } catch (error) {
        console.error("Error approving return:", error);
        return NextResponse.json({ error: "Failed to approve return" }, { status: 500 });
    }
}
