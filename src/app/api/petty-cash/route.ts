import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";

// GET /api/petty-cash — list payouts, optionally filtered by shiftId
export async function GET(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const { searchParams } = new URL(req.url);
        const shiftId = searchParams.get('shiftId');

        const where: any = {
            tenantId,
            ...(shiftId ? { shiftId } : {}),
        };

        const payouts = await prisma.pettyCashPayout.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, name: true } },
            },
        });

        const totalAmount = payouts.reduce((sum, p) => sum + Number(p.amount), 0);

        return NextResponse.json({ data: payouts, totalAmount });
    } catch (error) {
        console.error("Error fetching petty cash payouts:", error);
        return NextResponse.json({ error: "Failed to fetch petty cash payouts" }, { status: 500 });
    }
}

// POST /api/petty-cash — record a new payout during an active shift
export async function POST(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId, id: userId } = authResult.user;

        const body = await req.json();
        const { amount, reason, shiftId } = body;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
        }
        if (!reason || !String(reason).trim()) {
            return NextResponse.json({ error: "Reason is required" }, { status: 400 });
        }
        if (!shiftId) {
            return NextResponse.json({ error: "An active shift is required to record a payout" }, { status: 400 });
        }

        // Verify shift belongs to this tenant and is still open
        const shift = await prisma.shift.findFirst({
            where: { id: shiftId, tenantId, status: 'OPEN' },
        });
        if (!shift) {
            return NextResponse.json({ error: "Active shift not found" }, { status: 404 });
        }

        const [payout] = await prisma.$transaction([
            prisma.pettyCashPayout.create({
                data: {
                    amount: new Prisma.Decimal(Number(amount)),
                    reason: String(reason).trim(),
                    shiftId,
                    tenantId,
                    createdBy: userId,
                },
                include: { user: { select: { id: true, name: true } } },
            }),
        ]);

        // Also record as an Expense so it appears in the expenses dashboard
        await prisma.expense.create({
            data: {
                amount: new Prisma.Decimal(Number(amount)),
                category: 'PETTY_CASH',
                date: payout.createdAt,
                notes: String(reason).trim(),
                referenceType: 'PETTY_CASH',
                referenceId: payout.id,
                tenantId,
                createdBy: userId,
            },
        });

        return NextResponse.json({ payout }, { status: 201 });
    } catch (error) {
        console.error("Error creating petty cash payout:", error);
        return NextResponse.json({ error: "Failed to record petty cash payout" }, { status: 500 });
    }
}
