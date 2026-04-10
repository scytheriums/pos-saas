import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { logCrudAudit } from '@/lib/audit';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const product = await prisma.product.findFirst({
            where: {
                id,
                tenantId
            },
            include: {
                variants: {
                    include: {
                        optionValues: {
                            include: {
                                option: true
                            }
                        }
                    }
                },
                options: {
                    include: {
                        values: true
                    }
                }
            }
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const body = await req.json();
        const { name, description, imageUrl, minStock, categoryId, supplierId, isSellable, isPurchasable } = body;

        // Verify product belongs to tenant
        const existingProduct = await prisma.product.findFirst({
            where: { id, tenantId }
        });

        if (!existingProduct) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: {
                name,
                description,
                imageUrl: imageUrl !== undefined ? imageUrl : undefined,
                minStock,
                categoryId: categoryId !== undefined ? categoryId : undefined,
                supplierId: supplierId !== undefined ? (supplierId || null) : undefined,
                isSellable: isSellable !== undefined ? isSellable : undefined,
                isPurchasable: isPurchasable !== undefined ? isPurchasable : undefined,
            },
            include: {
                variants: true,
                options: {
                    include: {
                        values: true
                    }
                }
            }
        });

        // Log audit trail
        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE",
            resource: "PRODUCT",
            resourceId: id,
            before: {
                name: existingProduct.name,
                description: existingProduct.description,
                minStock: existingProduct.minStock,
                categoryId: existingProduct.categoryId
            },
            after: {
                name: updatedProduct.name,
                description: updatedProduct.description,
                minStock: updatedProduct.minStock,
                categoryId: updatedProduct.categoryId
            },
            request: req
        });

        return NextResponse.json(updatedProduct);
    } catch (error) {
        console.error('Error updating product:', error);
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        // Verify product belongs to tenant
        const product = await prisma.product.findFirst({
            where: { id, tenantId },
            include: {
                variants: {
                    include: {
                        _count: {
                            select: { orderItems: true }
                        }
                    }
                }
            }
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Check if any variant has order items
        const hasOrders = product.variants.some(v => v._count.orderItems > 0);
        if (hasOrders) {
            return NextResponse.json({
                error: 'Cannot delete product with existing orders. This product has order history and cannot be deleted to maintain data integrity.'
            }, { status: 400 });
        }

        // Delete product (cascade will handle variants and options)
        // Using deleteMany to ensure tenant isolation and avoid "Record not found" race conditions
        const deleteResult = await prisma.product.deleteMany({
            where: {
                id,
                tenantId
            }
        });

        if (deleteResult.count === 0) {
            return NextResponse.json({ error: 'Product not found or access denied' }, { status: 404 });
        }

        // Log audit trail
        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE",
            resource: "PRODUCT",
            resourceId: id,
            before: {
                name: product.name,
                variantsCount: product.variants.length
            },
            request: req
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting product:', error);
        return NextResponse.json({
            error: 'Failed to delete product'
        }, { status: 500 });
    }
}
