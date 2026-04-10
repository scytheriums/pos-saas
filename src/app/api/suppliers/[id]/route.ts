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

        const supplier = await prisma.supplier.findFirst({
            where: { id, tenantId },
            include: {
                _count: { select: { products: true, purchaseOrders: true } },
            },
        });

        if (!supplier) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
        }

        return NextResponse.json(supplier);
    } catch (error) {
        console.error("Error fetching supplier:", error);
        return NextResponse.json({ error: "Failed to fetch supplier" }, { status: 500 });
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

        const existing = await prisma.supplier.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
        }

        const body = await req.json();
        const { name, contactName, phone, email, address, paymentTerms, notes } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
        }

        const supplier = await prisma.supplier.update({
            where: { id },
            data: { name: name.trim(), contactName, phone, email, address, paymentTerms, notes },
        });

        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE",
            resource: "SUPPLIER",
            resourceId: supplier.id,
            before: { name: existing.name },
            after: { name: supplier.name },
            request: req,
        });

        return NextResponse.json(supplier);
    } catch (error) {
        console.error("Error updating supplier:", error);
        return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 });
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

        const existing = await prisma.supplier.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
        }

        // Unlink from products instead of blocking deletion
        await prisma.product.updateMany({
            where: { supplierId: id, tenantId },
            data: { supplierId: null },
        });

        await prisma.supplier.delete({ where: { id } });

        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE",
            resource: "SUPPLIER",
            resourceId: id,
            before: { name: existing.name },
            request: req,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting supplier:", error);
        return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
    }
}
