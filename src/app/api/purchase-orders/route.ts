import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { logCrudAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const { searchParams } = new URL(req.url);
        const cursor = searchParams.get("cursor");
        const limitParam = parseInt(searchParams.get("limit") ?? "20");
        const limit = Math.min(limitParam, 100);
        const status = searchParams.get("status");
        const supplierId = searchParams.get("supplierId");

        const where: Record<string, unknown> = { tenantId };
        if (status) where.status = status;
        if (supplierId) where.supplierId = supplierId;

        const orders = await prisma.purchaseOrder.findMany({
            where,
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            orderBy: { createdAt: "desc" },
            include: {
                supplier: { select: { id: true, name: true } },
                _count: { select: { items: true } },
            },
        });

        const hasMore = orders.length > limit;
        const data = hasMore ? orders.slice(0, limit) : orders;
        const nextCursor = hasMore ? data[data.length - 1].id : null;

        return NextResponse.json({ data, hasMore, nextCursor });
    } catch (error) {
        console.error("Error fetching purchase orders:", error);
        return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const body = await req.json();
        const { supplierId, expectedDate, notes, items } = body;

        if (!supplierId) {
            return NextResponse.json({ error: "Supplier is required" }, { status: 400 });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
        }

        // Each item must have either variantId (linked product) or itemName (free-text raw material)
        for (const item of items) {
            if (!item.variantId && !item.itemName?.trim()) {
                return NextResponse.json({ error: "Each item must have a linked product or an item name" }, { status: 400 });
            }
        }

        // Validate supplier belongs to tenant
        const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, tenantId } });
        if (!supplier) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
        }

        // Validate any variant IDs belong to tenant
        const linkedVariantIds = items.filter((i: { variantId?: string }) => i.variantId).map((i: { variantId: string }) => i.variantId);
        if (linkedVariantIds.length > 0) {
            const variants = await prisma.productVariant.findMany({
                where: { id: { in: linkedVariantIds }, product: { tenantId } },
                select: { id: true },
            });
            if (variants.length !== linkedVariantIds.length) {
                return NextResponse.json({ error: "One or more variants not found" }, { status: 400 });
            }
        }

        const order = await prisma.purchaseOrder.create({
            data: {
                supplierId,
                tenantId,
                createdBy: authResult.user.id,
                expectedDate: expectedDate ? new Date(expectedDate) : null,
                notes,
                items: {
                    create: items.map((item: { variantId?: string; itemName?: string; unit?: string; quantity: number; unitCost: number; updateVariantCost?: boolean }) => ({
                        variantId: item.variantId ?? null,
                        itemName: item.itemName ?? null,
                        unit: item.unit ?? null,
                        quantity: item.quantity,
                        unitCost: item.unitCost,
                        receivedQuantity: 0,
                        updateVariantCost: item.updateVariantCost ?? false,
                    })),
                },
            },
            include: {
                supplier: { select: { id: true, name: true } },
                items: true,
            },
        });

        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE",
            resource: "PURCHASE_ORDER",
            resourceId: order.id,
            after: { supplierId, itemCount: items.length },
            request: req,
        });

        return NextResponse.json(order, { status: 201 });
    } catch (error) {
        console.error("Error creating purchase order:", error);
        return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 });
    }
}
