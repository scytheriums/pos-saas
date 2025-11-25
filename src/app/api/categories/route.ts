import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { logCrudAudit } from '@/lib/audit';

// Helper function to build category tree
function buildCategoryTree(categories: any[], parentId: string | null = null): any[] {
    return categories
        .filter(cat => cat.parentId === parentId)
        .map(cat => ({
            ...cat,
            children: buildCategoryTree(categories, cat.id),
            path: getFullPath(categories, cat.id)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

// Helper function to get full category path
function getFullPath(categories: any[], categoryId: string): string {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '';

    if (!category.parentId) return category.name;

    const parentPath = getFullPath(categories, category.parentId);
    return `${parentPath} > ${category.name}`;
}

// GET /api/categories - List all categories with hierarchy
export async function GET(request: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user } = authResult;

        // Fetch all categories for the tenant
        const categories = await prisma.category.findMany({
            where: { tenantId: user.tenantId },
            include: {
                _count: {
                    select: { products: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Transform to include product count
        const categoriesWithCount = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            parentId: cat.parentId,
            productCount: cat._count.products,
            createdAt: cat.createdAt,
            updatedAt: cat.updatedAt
        }));

        // Build tree structure
        const tree = buildCategoryTree(categoriesWithCount);

        return NextResponse.json(tree);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
}

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user } = authResult;
        const body = await request.json();
        const { name, parentId } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Check if parent exists (if parentId provided)
        if (parentId) {
            const parent = await prisma.category.findFirst({
                where: { id: parentId, tenantId: user.tenantId }
            });

            if (!parent) {
                return NextResponse.json({ error: 'Parent category not found' }, { status: 404 });
            }
        }

        // Create category
        const category = await prisma.category.create({
            data: {
                name: name.trim(),
                parentId: parentId || null,
                tenantId: user.tenantId
            }
        });

        // Get full path
        const allCategories = await prisma.category.findMany({
            where: { tenantId: user.tenantId }
        });

        const path = getFullPath(allCategories, category.id);

        // Log audit trail
        await logCrudAudit({
            tenantId: user.tenantId,
            userId: user.id,
            userName: user.name,
            action: "CREATE",
            resource: "CATEGORY",
            resourceId: category.id,
            after: {
                name: category.name,
                parentId: category.parentId,
                path: path
            },
            request
        });

        return NextResponse.json({ ...category, path }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating category:', error);

        // Handle unique constraint violation
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Category name already exists in this parent' }, { status: 409 });
        }

        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }
}
