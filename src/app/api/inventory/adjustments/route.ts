import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { putStock } from "@/lib/stock";
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
            // 1. Move the stock: on the variant, or quantity × size in the product's shared pool
            const moved = await putStock(tx, variantId, qty);

            // 2. Record the adjustment (pooled products also keep the exact base units moved)
            const adjustment = await tx.stockAdjustment.create({
                data: {
                    productVariantId: variantId,
                    quantity: qty,
                    baseQuantity: moved.pooled ? moved.baseQuantity : null,
                    reason,
                    notes: notes || null,
                    userId: userId,
                    tenantId: tenantId,
                },
            });

            // New stock where it lives: the variant's own count, or the pool in base units
            const variant = await tx.productVariant.findUniqueOrThrow({
                where: { id: variantId },
                select: { stock: true, product: { select: { sharedStock: true, baseUnit: { select: { abbreviation: true } } } } },
            });
            return moved.pooled
                ? { adjustment, newStock: variant.product.sharedStock, pooled: true, baseUnit: variant.product.baseUnit?.abbreviation ?? null }
                : { adjustment, newStock: variant.stock, pooled: false, baseUnit: null };
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
                            select: { name: true, baseUnit: { select: { abbreviation: true } } },
                        },
                        unit: { select: { name: true } },
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
