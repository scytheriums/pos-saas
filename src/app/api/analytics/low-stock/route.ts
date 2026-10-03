import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, requirePermission } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        // Get authenticated user and tenant
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const denied = await requirePermission(authResult.user, 'VIEW', 'INVENTORY');
        if (denied) return denied;
        const { tenantId } = authResult.user;

        const { searchParams } = new URL(req.url);
        const threshold = parseInt(searchParams.get('threshold') || '10');

        // Per-variant stock (shared-stock products' variants hold no stock of their own; checked below)
        const lowStockVariants = await prisma.productVariant.findMany({
            where: {
                product: {
                    tenantId,
                    stockMode: 'PER_VARIANT'
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

        // Shared stock pools: compared with the product's minimum, both in base units
        const pools = await prisma.product.findMany({
            where: { tenantId, stockMode: 'SHARED_POOL' },
            select: { id: true, name: true, minStock: true, sharedStock: true, baseUnit: { select: { abbreviation: true } } },
        });
        const lowPools = pools.filter(p => p.sharedStock <= p.minStock);

        const urgency = (stock: number, min: number) =>
            stock <= 0 ? 'critical' : stock <= min / 2 ? 'high' : 'medium';

        const formattedResults = [
            ...lowStockVariants.map(variant => ({
                id: variant.id,
                productName: variant.product.name,
                sku: variant.sku,
                currentStock: variant.stock,
                unit: null as string | null,
                minStock: variant.product.minStock,
                urgency: urgency(variant.stock, variant.product.minStock)
            })),
            ...lowPools.map(p => ({
                id: p.id,
                productName: p.name,
                sku: 'Shared stock',
                currentStock: p.sharedStock,
                unit: p.baseUnit?.abbreviation ?? null,
                minStock: p.minStock,
                urgency: urgency(p.sharedStock, p.minStock)
            })),
        ].sort((a, b) => a.currentStock - b.currentStock);

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
