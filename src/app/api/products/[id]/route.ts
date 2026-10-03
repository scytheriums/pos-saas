import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, StockMode } from '@prisma/client';
import { getAuthUser, requirePermission } from '@/lib/auth';
import { logCrudAudit } from '@/lib/audit';
import { withAvailableStock } from '@/lib/stock';
import { parsePoolSettings, variantPoolFields, PoolSettings, PoolValidationError } from '@/lib/product-pool';

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
        const denied = await requirePermission(authResult.user, 'VIEW', 'PRODUCTS');
        if (denied) return denied;
        const { tenantId } = authResult.user;

        const product = await prisma.product.findFirst({
            where: {
                id,
                tenantId
            },
            include: {
                baseUnit: { select: { id: true, name: true, abbreviation: true } },
                variants: {
                    include: {
                        unit: { select: { id: true, name: true, abbreviation: true } },
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

        return NextResponse.json(withAvailableStock(product));
    } catch (error) {
        console.error('Error fetching product:', error);
        return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }
}

interface IncomingOption {
    id: string;
    name: string;
    values: { id: string; value: string }[];
}

interface IncomingVariant {
    id: string;
    optionValueIds: string[];
    sku: string;
    price: number;
    cost?: number;
    stock: number;
    imageUrl?: string | null;
    /** Shared-pool products: the selling unit and how many base units it holds */
    unitId?: string | null;
    conversionFactor?: number;
}

class ProductSyncError extends Error {
    constructor(message: string, public status: number = 400) {
        super(message);
    }
}

/**
 * Make the product's options and variants match what the edit form sent.
 * Incoming ids that match saved records are updated; unknown (temp) ids are created;
 * saved records missing from the payload are deleted, unless a variant has history.
 */
async function syncOptionsAndVariants(
    tx: Prisma.TransactionClient,
    params: {
        productId: string;
        tenantId: string;
        productName: string;
        options: IncomingOption[];
        variants: IncomingVariant[];
        pool: PoolSettings;
    }
) {
    const { productId, tenantId, productName, options, variants, pool } = params;
    const pooled = pool.stockMode === StockMode.SHARED_POOL;

    const existingOptions = await tx.productOption.findMany({
        where: { productId },
        include: { values: true }
    });
    const existingVariants = await tx.productVariant.findMany({
        where: { productId },
        include: {
            _count: {
                select: { orderItems: true, stockAdjustments: true, returnItems: true, purchaseOrderItems: true }
            }
        }
    });

    // 1. Remove variants that are no longer present — refuse if they have history
    const incomingVariantIds = new Set(variants.map(v => v.id));
    const removedVariants = existingVariants.filter(v => !incomingVariantIds.has(v.id));
    const blocked = removedVariants.filter(v =>
        v._count.orderItems + v._count.stockAdjustments + v._count.returnItems + v._count.purchaseOrderItems > 0
    );
    if (blocked.length > 0) {
        throw new ProductSyncError(
            `Cannot remove variant${blocked.length > 1 ? 's' : ''} ${blocked.map(v => v.sku).join(', ')}: ` +
            `they have sales, stock, return or purchase order history.`,
            409
        );
    }
    if (removedVariants.length > 0) {
        await tx.productVariant.deleteMany({ where: { id: { in: removedVariants.map(v => v.id) }, productId } });
    }

    // 2. Upsert options & values, mapping client ids to real ids
    const valueIdMap = new Map<string, string>();
    const keptOptionIds = new Set<string>();
    const keptValueIds = new Set<string>();

    for (const opt of options) {
        const optName = opt.name?.trim();
        if (!optName) throw new ProductSyncError('Option name is required');
        if (!opt.values?.length) throw new ProductSyncError(`Option "${optName}" needs at least one value`);

        const existingOpt = existingOptions.find(o => o.id === opt.id);
        let optionId: string;
        if (existingOpt) {
            optionId = existingOpt.id;
            if (existingOpt.name !== optName) {
                await tx.productOption.update({ where: { id: optionId }, data: { name: optName } });
            }
        } else {
            optionId = (await tx.productOption.create({ data: { productId, name: optName } })).id;
        }
        keptOptionIds.add(optionId);

        for (const val of opt.values) {
            const valueName = val.value?.trim();
            if (!valueName) throw new ProductSyncError(`Option "${optName}" has an empty value`);

            const existingVal = existingOpt?.values.find(v => v.id === val.id);
            let valueId: string;
            if (existingVal) {
                valueId = existingVal.id;
                if (existingVal.value !== valueName) {
                    await tx.productOptionValue.update({ where: { id: valueId }, data: { value: valueName } });
                }
            } else {
                valueId = (await tx.productOptionValue.create({ data: { optionId, value: valueName } })).id;
            }
            valueIdMap.set(val.id, valueId);
            keptValueIds.add(valueId);
        }
    }

    // 3. Delete options/values that were removed (values cascade with their option)
    const removedOptionIds = existingOptions.filter(o => !keptOptionIds.has(o.id)).map(o => o.id);
    if (removedOptionIds.length > 0) {
        await tx.productOption.deleteMany({ where: { id: { in: removedOptionIds }, productId } });
    }
    const removedValueIds = existingOptions
        .filter(o => keptOptionIds.has(o.id))
        .flatMap(o => o.values)
        .filter(v => !keptValueIds.has(v.id))
        .map(v => v.id);
    if (removedValueIds.length > 0) {
        await tx.productOptionValue.deleteMany({ where: { id: { in: removedValueIds } } });
    }

    // 4. Update existing variants and create new ones
    const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { autoGenerateSku: true, skuFormat: true, skuPrefix: true, skuCounter: true, name: true }
    });
    let generatedSkus = 0;
    let added = 0;

    for (const variant of variants) {
        const price = Number(variant.price);
        const cost = Number(variant.cost ?? 0);
        // Pooled variants hold no stock of their own (the pool is on the product)
        const stock = pooled ? 0 : Number(variant.stock);
        if (!Number.isFinite(price) || price < 0) throw new ProductSyncError('Variant price must be zero or more');
        if (!Number.isFinite(cost) || cost < 0) throw new ProductSyncError('Variant cost must be zero or more');
        if (!Number.isInteger(stock) || stock < 0) throw new ProductSyncError('Variant stock must be a whole number, zero or more');

        const optionValueIds = (variant.optionValueIds ?? []).map(id => {
            const realId = valueIdMap.get(id);
            if (!realId) throw new ProductSyncError('Variant references an unknown option value');
            return realId;
        });

        let sku = variant.sku?.trim() ?? '';
        const existing = existingVariants.find(v => v.id === variant.id);

        if (existing) {
            await tx.productVariant.update({
                where: { id: existing.id },
                data: {
                    sku: sku || existing.sku,
                    price: new Prisma.Decimal(price),
                    cost: new Prisma.Decimal(cost),
                    stock,
                    imageUrl: variant.imageUrl ?? null,
                    optionValues: { set: optionValueIds.map(id => ({ id })) },
                    ...variantPoolFields(pool, variant),
                }
            });
            continue;
        }

        if (!sku) {
            if (!tenant?.autoGenerateSku) throw new ProductSyncError('SKU is required for new variants');
            const { generateSKU } = await import('@/lib/sku-generator');
            sku = generateSKU({
                businessName: tenant.name,
                counter: tenant.skuCounter + generatedSkus,
                format: tenant.skuFormat,
                prefix: tenant.skuPrefix || undefined,
                productName
            });
            generatedSkus++;
        }

        await tx.productVariant.create({
            data: {
                productId,
                sku,
                price: new Prisma.Decimal(price),
                cost: new Prisma.Decimal(cost),
                stock,
                imageUrl: variant.imageUrl || null,
                optionValues: { connect: optionValueIds.map(id => ({ id })) },
                ...variantPoolFields(pool, variant),
            }
        });
        added++;
    }

    if (generatedSkus > 0) {
        await tx.tenant.update({
            where: { id: tenantId },
            data: { skuCounter: { increment: generatedSkus } }
        });
    }

    return { added, removed: removedVariants.length };
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
        const denied = await requirePermission(authResult.user, 'EDIT', 'PRODUCTS');
        if (denied) return denied;
        const { tenantId } = authResult.user;

        const body = await req.json();
        const { name, description, imageUrl, minStock, categoryId, supplierId, isSellable, isPurchasable, hasVariants, options, variants } = body;

        // Variants are only synced when the full list is sent (edit form); base-info-only updates skip it
        const syncVariants = Array.isArray(variants);
        if (syncVariants && variants.length === 0) {
            return NextResponse.json({ error: 'Product must have at least one variant' }, { status: 400 });
        }
        if (syncVariants && !hasVariants && variants.length !== 1) {
            return NextResponse.json({ error: 'A product without variants must have exactly one variant' }, { status: 400 });
        }

        // Verify product belongs to tenant
        const existingProduct = await prisma.product.findFirst({
            where: { id, tenantId },
            include: { _count: { select: { variants: true } } }
        });

        if (!existingProduct) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Stock mode only changes together with the full variant list (the edit form)
        const pool = syncVariants
            ? await parsePoolSettings(prisma, tenantId, body, variants, {
                stockMode: existingProduct.stockMode,
                baseUnitId: existingProduct.baseUnitId,
                sharedStock: existingProduct.sharedStock,
                poolCost: Number(existingProduct.poolCost),
            })
            : null;
        const pooled = pool?.stockMode === StockMode.SHARED_POOL;

        const { updatedProduct, variantChanges } = await prisma.$transaction(async (tx) => {
            const updatedProduct = await tx.product.update({
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
                    ...(pool ? {
                        stockMode: pool.stockMode,
                        sharedStock: pool.sharedStock,
                        poolCost: new Prisma.Decimal(pool.poolCost),
                        baseUnitId: pool.baseUnitId,
                    } : {}),
                }
            });

            const variantChanges = syncVariants && pool
                ? await syncOptionsAndVariants(tx, {
                    productId: id,
                    tenantId,
                    productName: updatedProduct.name,
                    // Pooled products have selling units instead of options
                    options: hasVariants && !pooled && Array.isArray(options) ? options : [],
                    variants: hasVariants && !pooled
                        ? variants
                        : variants.map((v: IncomingVariant) => ({ ...v, optionValueIds: [] })),
                    pool,
                })
                : null;

            return { updatedProduct, variantChanges };
        }, { timeout: 30000 });

        const result = await prisma.product.findUnique({
            where: { id },
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
                categoryId: existingProduct.categoryId,
                variantsCount: existingProduct._count.variants
            },
            after: {
                name: updatedProduct.name,
                description: updatedProduct.description,
                minStock: updatedProduct.minStock,
                categoryId: updatedProduct.categoryId,
                variantsCount: result?.variants.length,
                ...(variantChanges ? { variantsAdded: variantChanges.added, variantsRemoved: variantChanges.removed } : {})
            },
            request: req
        });

        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof ProductSyncError || error instanceof PoolValidationError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({ error: 'One of the SKUs is already used by another product variant' }, { status: 409 });
        }
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
        const denied = await requirePermission(authResult.user, 'DELETE', 'PRODUCTS');
        if (denied) return denied;
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
