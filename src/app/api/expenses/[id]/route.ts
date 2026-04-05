import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";

// PUT /api/expenses/[id] — update an expense
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;
        const { id } = await params;

        const existing = await prisma.expense.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json({ error: "Expense not found" }, { status: 404 });
        }

        const body = await req.json();
        const { amount, category, date, notes } = body;

        const VALID_CATEGORIES = [
            'RENT', 'UTILITIES', 'SALARIES', 'SUPPLIES', 'MARKETING',
            'MAINTENANCE', 'TRANSPORT', 'FOOD', 'TAX', 'OTHER',
        ];

        const updated = await prisma.expense.update({
            where: { id },
            data: {
                ...(amount !== undefined ? { amount: new Prisma.Decimal(Number(amount)) } : {}),
                ...(category !== undefined && VALID_CATEGORIES.includes(category)
                    ? { category: category as any }
                    : {}),
                ...(date !== undefined ? { date: new Date(date) } : {}),
                ...(notes !== undefined ? { notes } : {}),
            },
            include: { user: { select: { id: true, name: true } } },
        });

        return NextResponse.json({ expense: updated });
    } catch (error) {
        console.error("Error updating expense:", error);
        return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
    }
}

// DELETE /api/expenses/[id] — delete an expense
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;
        const { id } = await params;

        const existing = await prisma.expense.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json({ error: "Expense not found" }, { status: 404 });
        }

        await prisma.expense.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting expense:", error);
        return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
    }
}
