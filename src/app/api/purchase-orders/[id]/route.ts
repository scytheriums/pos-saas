import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { logCrudAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;
        const { id } = await params;

        const order = await prisma.purchaseOrder.findFirst({
            where: { id, tenantId },
            include: {
                supplier: { select: { id: true, name: true, email: true, phone: true } },
                items: {
                    include: {
                        variant: {
                            select: {
                                id: true,
                                sku: true,
                                price: true,
                                stock: true,
                                product: { select: { id: true, name: true } },
                            },
                        },
                    },
                    orderBy: { id: 'asc' },
                },
            },
        });

        if (!order) {
            return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error("Error fetching purchase order:", error);
        return NextResponse.json({ error: "Failed to fetch purchase order" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;
        const { id } = await params;

        const existing = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
        }

        const body = await req.json();
        const { status, notes, expectedDate } = body;

        const order = await prisma.purchaseOrder.update({
            where: { id },
            data: {
                ...(status !== undefined ? { status } : {}),
                ...(notes !== undefined ? { notes } : {}),
                ...(expectedDate !== undefined ? { expectedDate: expectedDate ? new Date(expectedDate) : null } : {}),
            },
        });

        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE",
            resource: "PURCHASE_ORDER",
            resourceId: order.id,
            before: { status: existing.status },
            after: { status: order.status },
            request: req,
        });

        return NextResponse.json(order);
    } catch (error) {
        console.error("Error updating purchase order:", error);
        return NextResponse.json({ error: "Failed to update purchase order" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;
        const { id } = await params;

        const existing = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
        }

        if (existing.status !== "DRAFT") {
            return NextResponse.json(
                { error: "Only draft purchase orders can be deleted" },
                { status: 409 }
            );
        }

        await prisma.purchaseOrder.delete({ where: { id } });

        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE",
            resource: "PURCHASE_ORDER",
            resourceId: id,
            before: { status: existing.status },
            request: req,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting purchase order:", error);
        return NextResponse.json({ error: "Failed to delete purchase order" }, { status: 500 });
    }
}
