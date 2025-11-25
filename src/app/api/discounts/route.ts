import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { logCrudAudit } from "@/lib/audit";

// GET /api/discounts - List discounts
export async function GET(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') ?? '1', 10);
        const limit = parseInt(searchParams.get('limit') ?? '20', 10);
        const activeOnly = searchParams.get('active') === 'true';
        const skip = (page - 1) * limit;

        const where: any = { tenantId };
        if (activeOnly) {
            where.active = true;
        }

        const [discounts, total] = await Promise.all([
            prisma.discount.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { orders: true }
                    }
                }
            }),
            prisma.discount.count({ where })
        ]);

        return NextResponse.json({
            discounts,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                page,
                limit,
            },
        });
    } catch (error) {
        console.error("Failed to fetch discounts:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/discounts - Create discount
export async function POST(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const body = await req.json();
        const { name, code, type, value, minPurchase, maxDiscount, startDate, endDate, active } = body;

        if (!name || !type || !value) {
            return NextResponse.json({ error: "Name, type, and value are required" }, { status: 400 });
        }

        if (type === 'PERCENTAGE' && (value < 0 || value > 100)) {
            return NextResponse.json({ error: "Percentage must be between 0 and 100" }, { status: 400 });
        }

        const discount = await prisma.discount.create({
            data: {
                name,
                code: code || null,
                type,
                value,
                minPurchase: minPurchase || null,
                maxDiscount: maxDiscount || null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                active: active ?? true,
                tenantId,
            },
        });

        // Log audit trail
        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE",
            resource: "DISCOUNT",
            resourceId: discount.id,
            after: {
                name: discount.name,
                code: discount.code,
                type: discount.type,
                value: Number(discount.value),
                active: discount.active
            },
            request: req
        });

        return NextResponse.json({ discount }, { status: 201 });
    } catch (error: any) {
        console.error("Failed to create discount:", error);
        if (error.code === 'P2002' && error.meta?.target?.includes('code')) {
            return NextResponse.json({ error: "Discount code already exists" }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
