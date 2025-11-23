import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string; variantId: string } }
) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const variant = await prisma.productVariant.findFirst({
            where: {
                id: params.variantId,
                product: {
                    id: params.id,
                    tenantId
                }
            },
            include: {
                product: true,
                optionValues: {
                    include: {
                        option: true
                    }
                }
            }
        });

        if (!variant) {
            return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
        }

        return NextResponse.json(variant);
    } catch (error) {
        console.error('Error fetching variant:', error);
        return NextResponse.json({ error: 'Failed to fetch variant' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string; variantId: string } }
) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const body = await req.json();
        const { sku, price, stock } = body;

        // Verify variant belongs to tenant's product
        const variant = await prisma.productVariant.findFirst({
            where: {
                id: params.variantId,
                product: {
                    id: params.id,
                    tenantId
                }
            }
        });

        if (!variant) {
            return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
        }

        const updatedVariant = await prisma.productVariant.update({
            where: { id: params.variantId },
            data: {
                sku,
                price: new Prisma.Decimal(price),
                stock
            }
        });

        return NextResponse.json(updatedVariant);
    } catch (error) {
        console.error('Error updating variant:', error);
        return NextResponse.json({ error: 'Failed to update variant' }, { status: 500 });
    }
}
