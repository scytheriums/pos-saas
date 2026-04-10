import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ExpenseCategory } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { logCrudAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;
        const { id } = await params;

        const order = await prisma.purchaseOrder.findFirst({
            where: { id, tenantId },
            include: { items: true, supplier: { select: { name: true } } },
        });

        if (!order) {
            return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
        }
        if (order.status === "RECEIVED" || order.status === "CANCELLED") {
            return NextResponse.json(
                { error: "Cannot receive stock for a completed or cancelled purchase order" },
                { status: 409 }
            );
        }

        const body = await req.json();
        const { items } = body as { items: { purchaseOrderItemId: string; receivedQuantity: number }[] };

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Items are required" }, { status: 400 });
        }

        // Validate all item IDs belong to this PO
        const orderItemIds = new Set(order.items.map((i) => i.id));
        for (const item of items) {
            if (!orderItemIds.has(item.purchaseOrderItemId)) {
                return NextResponse.json(
                    { error: `Item ${item.purchaseOrderItemId} does not belong to this order` },
                    { status: 400 }
                );
            }
            if (item.receivedQuantity < 0) {
                return NextResponse.json(
                    { error: "Received quantity cannot be negative" },
                    { status: 400 }
                );
            }
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            // Update each item, increment stock (if linked variant), and optionally update cost
            for (const incoming of items) {
                const poItem = order.items.find((i) => i.id === incoming.purchaseOrderItemId)!;
                const newReceived = poItem.receivedQuantity + incoming.receivedQuantity;
                const cappedReceived = Math.min(newReceived, poItem.quantity);

                await tx.purchaseOrderItem.update({
                    where: { id: poItem.id },
                    data: { receivedQuantity: cappedReceived },
                });

                // Only increment stock for linked product variants
                if (poItem.variantId && incoming.receivedQuantity > 0) {
                    await tx.productVariant.update({
                        where: { id: poItem.variantId },
                        data: {
                            stock: { increment: incoming.receivedQuantity },
                            // Update the variant cost to latest PO unit cost if requested
                            ...(poItem.updateVariantCost ? { cost: poItem.unitCost } : {}),
                        },
                    });
                }
            }

            // Re-fetch all items to determine new PO status
            const allItems = await tx.purchaseOrderItem.findMany({
                where: { purchaseOrderId: id },
            });

            const allReceived = allItems.every((i) => i.receivedQuantity >= i.quantity);
            const anyReceived = allItems.some((i) => i.receivedQuantity > 0);
            const newStatus = allReceived
                ? "RECEIVED"
                : anyReceived
                ? "PARTIALLY_RECEIVED"
                : order.status;

            // Calculate cost of goods received in this batch
            let batchCost = 0;
            for (const incoming of items) {
                if (incoming.receivedQuantity > 0) {
                    const poItem = order.items.find((i) => i.id === incoming.purchaseOrderItemId)!;
                    const capped = Math.min(poItem.receivedQuantity + incoming.receivedQuantity, poItem.quantity) - poItem.receivedQuantity;
                    batchCost += Math.max(0, capped) * Number(poItem.unitCost);
                }
            }

            // Auto-create an expense for the received goods value
            if (batchCost > 0) {
                await tx.expense.create({
                    data: {
                        tenantId,
                        amount: batchCost,
                        category: ExpenseCategory.PURCHASE_ORDER,
                        date: new Date(),
                        notes: `Stock received from ${order.supplier.name} (PO #${id.slice(-8).toUpperCase()})`,
                        referenceType: "PURCHASE_ORDER",
                        referenceId: id,
                        createdBy: authResult.user.id,
                    },
                });
            }

            return tx.purchaseOrder.update({
                where: { id },
                data: { status: newStatus },
                include: {
                    supplier: { select: { id: true, name: true } },
                    items: {
                        include: {
                            variant: {
                                select: {
                                    id: true,
                                    sku: true,
                                    stock: true,
                                    product: { select: { name: true } },
                                },
                            },
                        },
                    },
                },
            });
        });

        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE",
            resource: "PURCHASE_ORDER",
            resourceId: id,
            before: { status: order.status },
            after: { status: updatedOrder.status, itemsReceived: items.length },
            request: req,
        });

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error("Error receiving stock:", error);
        return NextResponse.json({ error: "Failed to receive stock" }, { status: 500 });
    }
}
