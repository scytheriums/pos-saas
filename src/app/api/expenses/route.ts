import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";

// GET /api/expenses — list expenses, cursor-paginated
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
        const category = searchParams.get('category');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const where: any = {
            tenantId,
            ...(category ? { category: category as any } : {}),
            ...(from || to
                ? {
                    date: {
                        ...(from ? { gte: new Date(from) } : {}),
                        ...(to ? { lte: new Date(to) } : {}),
                    },
                }
                : {}),
        };

        const expenses = await prisma.expense.findMany({
            where,
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            orderBy: { date: 'desc' },
            include: {
                user: { select: { id: true, name: true } },
            },
        });

        const hasMore = expenses.length > limit;
        const data = hasMore ? expenses.slice(0, limit) : expenses;
        const nextCursor = hasMore ? data[data.length - 1].id : null;

        // Aggregate total for the filtered period
        const agg = await prisma.expense.aggregate({
            where,
            _sum: { amount: true },
        });
        const totalAmount = Number((agg._sum as any)?.amount ?? 0);

        return NextResponse.json({ data, nextCursor, hasMore, totalAmount });
    } catch (error) {
        console.error("Error fetching expenses:", error);
        return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
    }
}

// POST /api/expenses — create a new expense
export async function POST(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId, id: userId } = authResult.user;

        const body = await req.json();
        const { amount, category, date, notes } = body;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
        }

        const VALID_CATEGORIES = [
            'RENT', 'UTILITIES', 'SALARIES', 'SUPPLIES', 'MARKETING',
            'MAINTENANCE', 'TRANSPORT', 'FOOD', 'TAX', 'OTHER',
        ];
        const resolvedCategory = VALID_CATEGORIES.includes(category) ? category : 'OTHER';

        const expense = await prisma.expense.create({
            data: {
                amount: new Prisma.Decimal(Number(amount)),
                category: resolvedCategory as any,
                date: date ? new Date(date) : new Date(),
                notes: notes ?? null,
                tenantId,
                createdBy: userId,
            },
            include: { user: { select: { id: true, name: true } } },
        });

        return NextResponse.json({ expense }, { status: 201 });
    } catch (error) {
        console.error("Error creating expense:", error);
        return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
    }
}
