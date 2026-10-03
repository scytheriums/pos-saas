import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requirePermission } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        // Get authenticated user and tenant
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const denied = await requirePermission(authResult.user, 'EDIT', 'INVENTORY');
        if (denied) return denied;
        const { userId, tenantId } = authResult.user;

        const body = await request.json();
        const { variantId, quantity, reason, notes } = body;

        if (!variantId || !quantity || !reason) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const qty = Number(quantity);
        if (!Number.isInteger(qty) || qty === 0) {
            return NextResponse.json({ error: "Quantity must be a whole number other than 0" }, { status: 400 });
        }

        // Variant must belong to this tenant
        const owned = await prisma.productVariant.findFirst({
            where: { id: variantId, product: { tenantId } },
            select: { id: true },
        });
        if (!owned) {
            return NextResponse.json({ error: "Product variant not found" }, { status: 404 });
        }

        // Transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the adjustment record
            const adjustment = await tx.stockAdjustment.create({
                data: {
                    productVariantId: variantId,
                    quantity: qty,
                    reason,
                    notes: notes || null,
                    userId: userId,
                    tenantId: tenantId,
                },
            });

            // 2. Update the product variant stock
            const variant = await tx.productVariant.update({
                where: { id: variantId },
                data: {
                    stock: {
                        increment: qty,
                    },
                },
            });

            return { adjustment, newStock: variant.stock };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to create stock adjustment:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const denied = await requirePermission(authResult.user, 'VIEW', 'INVENTORY');
        if (denied) return denied;
        const { tenantId } = authResult.user;

        const { searchParams } = new URL(request.url);
        const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20") || 20, 1), 100);
        const page = Math.max(parseInt(searchParams.get("page") || "1") || 1, 1);
        const skip = (page - 1) * limit;

        const adjustments = await prisma.stockAdjustment.findMany({
            where: { tenantId },
            take: limit,
            skip: skip,
            orderBy: {
                createdAt: "desc",
            },
            include: {
                variant: {
                    include: {
                        product: {
                            select: { name: true },
                        },
                    },
                },
            },
        });

        const total = await prisma.stockAdjustment.count({ where: { tenantId } });

        return NextResponse.json({
            adjustments,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                page,
                limit,
            },
        });
    } catch (error) {
        console.error("Failed to fetch stock adjustments:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
