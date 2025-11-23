import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        // Get authenticated user and tenant
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const { searchParams } = new URL(req.url);
        const period = searchParams.get('period') || 'week'; // week, month, year

        // Calculate date range based on period
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        switch (period) {
            case 'week':
                startDate.setDate(endDate.getDate() - 6); // Last 7 days
                break;
            case 'month':
                startDate.setDate(endDate.getDate() - 29); // Last 30 days
                break;
            case 'year':
                startDate.setDate(endDate.getDate() - 364); // Last 365 days
                break;
        }

        // Fetch all orders in the date range
        const orders = await prisma.order.findMany({
            where: {
                tenantId,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: {
                createdAt: 'asc'
            },
            select: {
                createdAt: true,
                total: true
            }
        });

        // Group orders by date
        const salesByDate = new Map<string, { revenue: number; orders: number }>();

        orders.forEach(order => {
            const dateKey = order.createdAt.toISOString().split('T')[0];
            const existing = salesByDate.get(dateKey);

            if (existing) {
                existing.revenue += Number(order.total);
                existing.orders += 1;
            } else {
                salesByDate.set(dateKey, {
                    revenue: Number(order.total),
                    orders: 1
                });
            }
        });

        // Fill in missing dates with zero values
        const data: { date: string; revenue: number; orders: number }[] = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dateKey = currentDate.toISOString().split('T')[0];
            const salesData = salesByDate.get(dateKey);

            data.push({
                date: dateKey,
                revenue: salesData?.revenue || 0,
                orders: salesData?.orders || 0
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return NextResponse.json({
            period,
            data
        });

    } catch (error) {
        console.error('Error fetching sales trends:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sales trends data' },
            { status: 500 }
        );
    }
}
