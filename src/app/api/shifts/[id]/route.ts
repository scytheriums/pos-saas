import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser, requirePermission } from "@/lib/auth";
import { getShiftCash } from "@/lib/shift-cash";

// GET /api/shifts/[id] — get a single shift with full summary
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const denied = await requirePermission(authResult.user, 'VIEW', 'ORDERS');
        if (denied) return denied;
        const { tenantId } = authResult.user;
        const { id } = await params;

        const shift = await prisma.shift.findFirst({
            where: { id, tenantId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                orders: {
                    where: { status: 'COMPLETED' },
                    select: {
                        id: true,
                        total: true,
                        paymentMethod: true,
                        paymentEntries: { select: { method: true, amount: true } },
                        createdAt: true,
                    },
                },
            },
        });

        if (!shift) {
            return NextResponse.json({ error: "Shift not found" }, { status: 404 });
        }

        const cash = await getShiftCash(prisma, shift);
        const { breakdown, cashSales, totalPayouts, cashRefunds, expectedCash } = cash;
        const grossRevenue = cash.totalRevenue;

        // Fetch individual payouts for display
        const payouts = await prisma.pettyCashPayout.findMany({
            where: { shiftId: id },
            select: { id: true, amount: true, reason: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({
            shift: {
                ...shift,
                cashSales,
                expectedCash,
                grossRevenue,
                paymentBreakdown: breakdown,
                totalPayouts,
                cashRefunds,
                payouts,
            },
        });
    } catch (error) {
        console.error("Error fetching shift:", error);
        return NextResponse.json({ error: "Failed to fetch shift" }, { status: 500 });
    }
}

// PUT /api/shifts/[id]/close is handled in the sub-route file below
// This PUT handles generic updates (notes, etc.) if needed
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const denied = await requirePermission(authResult.user, 'CREATE', 'ORDERS');
        if (denied) return denied;
        const { tenantId } = authResult.user;
        const { id } = await params;

        const shift = await prisma.shift.findFirst({ where: { id, tenantId } });
        if (!shift) {
            return NextResponse.json({ error: "Shift not found" }, { status: 404 });
        }
        if (shift.status === 'CLOSED') {
            return NextResponse.json({ error: "Shift is already closed" }, { status: 400 });
        }

        const body = await req.json();
        const actualCash = Number(body.actualCash);
        if (isNaN(actualCash) || actualCash < 0) {
            return NextResponse.json({ error: "Invalid actual cash amount" }, { status: 400 });
        }

        // Same calculation as the shift summary: float + cash taken - payouts - cash refunds
        const { cashSales, expectedCash } = await getShiftCash(prisma, shift);
        const difference = actualCash - expectedCash;

        const closed = await prisma.shift.update({
            where: { id },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                actualCash: new Prisma.Decimal(actualCash),
                expectedCash: new Prisma.Decimal(expectedCash),
                difference: new Prisma.Decimal(difference),
                notes: body.notes ?? shift.notes,
            },
            include: { user: { select: { id: true, name: true } } },
        });

        return NextResponse.json({ shift: closed, cashSales, expectedCash, difference });
    } catch (error) {
        console.error("Error closing shift:", error);
        return NextResponse.json({ error: "Failed to close shift" }, { status: 500 });
    }
}
