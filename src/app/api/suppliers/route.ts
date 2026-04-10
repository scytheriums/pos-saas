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
        const search = searchParams.get('search');
        const cursor = searchParams.get('cursor');
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

        const suppliers = await prisma.supplier.findMany({
            where: {
                tenantId,
                ...(search ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { contactName: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                    ]
                } : {})
            },
            select: {
                id: true,
                name: true,
                contactName: true,
                phone: true,
                email: true,
                address: true,
                paymentTerms: true,
                notes: true,
                createdAt: true,
                _count: { select: { products: true, purchaseOrders: true } },
            },
            orderBy: { name: 'asc' },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = suppliers.length > limit;
        const data = hasMore ? suppliers.slice(0, limit) : suppliers;
        const nextCursor = hasMore ? data[data.length - 1].id : null;

        return NextResponse.json({ data, nextCursor, hasMore });
    } catch (error) {
        console.error("Error fetching suppliers:", error);
        return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
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
        const { name, contactName, phone, email, address, paymentTerms, notes } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
        }

        const supplier = await prisma.supplier.create({
            data: { name: name.trim(), contactName, phone, email, address, paymentTerms, notes, tenantId },
        });

        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE",
            resource: "SUPPLIER",
            resourceId: supplier.id,
            after: { name: supplier.name },
            request: req,
        });

        return NextResponse.json(supplier, { status: 201 });
    } catch (error) {
        console.error("Error creating supplier:", error);
        return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
    }
}
