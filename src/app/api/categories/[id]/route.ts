import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// Helper function to check for circular reference
async function wouldCreateCircularReference(categoryId: string, newParentId: string, tenantId: string): Promise<boolean> {
    let currentId: string | null = newParentId;

    while (currentId) {
        if (currentId === categoryId) {
            return true; // Circular reference detected
        }

        const parent = await prisma.category.findFirst({
            where: { id: currentId, tenantId },
            select: { parentId: true }
        });

        currentId = parent?.parentId || null;
    }

    return false;
}

// PUT /api/categories/[id] - Update category
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user } = authResult;
        const { id } = params;
        const body = await request.json();
        const { name, parentId } = body;

        // Check if category exists and belongs to tenant
        const category = await prisma.category.findFirst({
            where: { id, tenantId: user.tenantId },
            include: {
                products: { select: { id: true } }
            }
        });

        if (!category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        // If moving category and it has products, prevent the move
        if (parentId !== undefined && parentId !== category.parentId && category.products.length > 0) {
            return NextResponse.json({
                error: 'Cannot move category with assigned products. Please remove products first.'
            }, { status: 400 });
        }

        // Check for circular reference if changing parent
        if (parentId && parentId !== category.parentId) {
            const isCircular = await wouldCreateCircularReference(id, parentId, user.tenantId);
            if (isCircular) {
                return NextResponse.json({
                    error: 'Cannot set parent: would create circular reference'
                }, { status: 400 });
            }

            // Verify parent exists
            const parent = await prisma.category.findFirst({
                where: { id: parentId, tenantId: user.tenantId }
            });

            if (!parent) {
                return NextResponse.json({ error: 'Parent category not found' }, { status: 404 });
            }
        }

        // Update category
        const updated = await prisma.category.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(parentId !== undefined && { parentId: parentId || null })
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Error updating category:', error);

        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Category name already exists in this parent' }, { status: 409 });
        }

        return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }
}

// DELETE /api/categories/[id] - Delete category
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user } = authResult;
        const { id } = params;

        // Check if category exists and belongs to tenant
        const category = await prisma.category.findFirst({
            where: { id, tenantId: user.tenantId },
            include: {
                children: { select: { id: true } },
                products: { select: { id: true } }
            }
        });

        if (!category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        // Prevent deletion if has children
        if (category.children.length > 0) {
            return NextResponse.json({
                error: 'Cannot delete category with subcategories. Please delete subcategories first.'
            }, { status: 400 });
        }

        // Prevent deletion if has products
        if (category.products.length > 0) {
            return NextResponse.json({
                error: 'Cannot delete category with assigned products. Please reassign products first.'
            }, { status: 400 });
        }

        // Delete category
        await prisma.category.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }
}
