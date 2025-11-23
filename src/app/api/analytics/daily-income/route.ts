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
        const date = searchParams.get('date');
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        // Determine date range
        let startDate: Date;
        let endDate: Date;

        if (startDateParam && endDateParam) {
            // Date range mode
            startDate = new Date(startDateParam);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(endDateParam);
            endDate.setHours(23, 59, 59, 999);
        } else if (date) {
            // Single date mode
            startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
        } else {
            // Default to today
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
        }

        // Fetch orders in date range
        const orders = await prisma.order.findMany({
            where: {
                tenantId,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                total: true,
                items: {
                    select: {
                        price: true,
                        quantity: true,
                        variantId: true,

                        variant: {
                            select: {
                                sku: true,
                                product: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Calculate metrics
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Calculate top selling products
        const productSales = new Map<string, {
            productName: string;
            variantSku: string;
            quantitySold: number;
            revenue: number;
        }>();

        orders.forEach(order => {
            order.items.forEach(item => {
                const key = item.variantId;
                const existing = productSales.get(key);
                const revenue = Number(item.price) * item.quantity;

                if (existing) {
                    existing.quantitySold += item.quantity;
                    existing.revenue += revenue;
                } else {
                    productSales.set(key, {
                        productName: item.variant?.product.name || 'Unknown',
                        variantSku: item.variant?.sku || 'N/A',
                        quantitySold: item.quantity,
                        revenue
                    });
                }
            });
        });

        // Sort by quantity sold and get top 10
        const topSellingProducts = Array.from(productSales.values())
            .sort((a, b) => b.quantitySold - a.quantitySold)
            .slice(0, 10);

        return NextResponse.json({
            date: date || startDate.toISOString().split('T')[0],
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            totalOrders,
            totalRevenue,
            averageOrderValue,
            topSellingProducts
        });

    } catch (error) {
        console.error('Error fetching daily income:', error);
        return NextResponse.json(
            { error: 'Failed to fetch daily income data' },
            { status: 500 }
        );
    }
}
