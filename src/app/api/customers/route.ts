import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { logCrudAudit } from "@/lib/audit";

// GET /api/customers - List customers with search
export async function GET(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const { searchParams } = new URL(req.url);
        const cursor = searchParams.get('cursor');
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
        const search = searchParams.get('search');

        const where: any = { tenantId };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        const customers = await prisma.customer.findMany({
            where,
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { orders: true }
                }
            }
        });

        const hasMore = customers.length > limit;
        const data = hasMore ? customers.slice(0, limit) : customers;
        const nextCursor = hasMore ? data[data.length - 1].id : null;

        return NextResponse.json({
            customers: data,
            nextCursor,
            hasMore,
        });
    } catch (error) {
        console.error("Failed to fetch customers:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/customers - Create customer
export async function POST(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const body = await req.json();
        const { name, phone, email, address } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const customer = await prisma.customer.create({
            data: {
                name,
                phone,
                email,
                address,
                tenantId,
            },
        });

        // Log audit trail
        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE",
            resource: "CUSTOMER",
            resourceId: customer.id,
            after: { name, phone, email },
            request: req
        });

        return NextResponse.json({ customer }, { status: 201 });
    } catch (error: any) {
        console.error("Failed to create customer:", error);
        if (error.code === 'P2002' && error.meta?.target?.includes('phone')) {
            return NextResponse.json({ error: "Phone number already exists" }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
