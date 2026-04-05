import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";

// GET /api/shifts — list shifts (most recent first, cursor-paginated)
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
        const status = searchParams.get('status'); // 'OPEN' | 'CLOSED'

        const shifts = await prisma.shift.findMany({
            where: {
                tenantId,
                ...(status ? { status: status as any } : {}),
            },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            orderBy: { openedAt: 'desc' },
            include: {
                user: { select: { id: true, name: true, email: true } },
                _count: { select: { orders: true } },
            },
        });

        const hasMore = shifts.length > limit;
        const data = hasMore ? shifts.slice(0, limit) : shifts;
        const nextCursor = hasMore ? data[data.length - 1].id : null;

        // Attach cash sales total and total revenue per shift
        const enriched = await Promise.all(
            data.map(async (shift) => {
                const [cashAgg, totalAgg, payoutAgg] = await Promise.all([
                    prisma.order.aggregate({
                        where: { shiftId: shift.id, status: 'COMPLETED', paymentMethod: 'CASH' },
                        _sum: { total: true },
                    }),
                    prisma.order.aggregate({
                        where: { shiftId: shift.id, status: 'COMPLETED' },
                        _sum: { total: true },
                    }),
                    prisma.pettyCashPayout.aggregate({
                        where: { shiftId: shift.id },
                        _sum: { amount: true },
                    }),
                ]);
                const cashSales = Number((cashAgg._sum as any)?.total ?? 0);
                const totalPayouts = Number((payoutAgg._sum as any)?.amount ?? 0);
                const expectedCash = Number(shift.openingFloat) + cashSales - totalPayouts;
                const totalRevenue = Number((totalAgg._sum as any)?.total ?? 0);
                const orderCount = shift._count.orders;
                const { _count, ...rest } = shift;
                return { ...rest, cashSales, expectedCash, totalPayouts, totalRevenue, orderCount };
            })
        );

        return NextResponse.json({ data: enriched, nextCursor, hasMore });
    } catch (error) {
        console.error("Error fetching shifts:", error);
        return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 });
    }
}

// POST /api/shifts — open a new shift
export async function POST(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId, id: userId } = authResult.user;

        // Prevent opening a second shift if there's already an open one for this user
        const existing = await prisma.shift.findFirst({
            where: { tenantId, userId, status: 'OPEN' },
        });
        if (existing) {
            return NextResponse.json({ error: "A shift is already open", shift: existing }, { status: 409 });
        }

        const body = await req.json();
        const openingFloat = Number(body.openingFloat ?? 0);
        if (isNaN(openingFloat) || openingFloat < 0) {
            return NextResponse.json({ error: "Invalid opening float amount" }, { status: 400 });
        }

        const shift = await prisma.shift.create({
            data: {
                tenantId,
                userId,
                openingFloat: new Prisma.Decimal(openingFloat),
                status: 'OPEN',
            },
            include: { user: { select: { id: true, name: true } } },
        });

        return NextResponse.json({ shift }, { status: 201 });
    } catch (error) {
        console.error("Error opening shift:", error);
        return NextResponse.json({ error: "Failed to open shift" }, { status: 500 });
    }
}
