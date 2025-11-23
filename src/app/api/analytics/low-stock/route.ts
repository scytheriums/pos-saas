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
        const threshold = parseInt(searchParams.get('threshold') || '10');

        const lowStockVariants = await prisma.productVariant.findMany({
            where: {
                product: {
                    tenantId
                },
                stock: {
                    lte: threshold
                }
            },
            select: {
                id: true,
                stock: true,
                sku: true,
                product: {
                    select: {
                        name: true,
                        minStock: true
                    }
                }
            },
            orderBy: {
                stock: 'asc'
            }
        });

        const formattedResults = lowStockVariants.map(variant => ({
            id: variant.id,
            productName: variant.product.name,
            sku: variant.sku,
            currentStock: variant.stock,
            minStock: variant.product.minStock,
            urgency: variant.stock === 0 ? 'critical' : variant.stock <= variant.product.minStock / 2 ? 'high' : 'medium'
        }));

        return NextResponse.json({
            threshold,
            count: formattedResults.length,
            items: formattedResults
        });

    } catch (error) {
        console.error('Error fetching low stock items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch low stock data' },
            { status: 500 }
        );
    }
}
