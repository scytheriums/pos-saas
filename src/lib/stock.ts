/**
 * The one place stock moves.
 *
 * A product either keeps stock per variant (PER_VARIANT, the default) or in one shared pool
 * (SHARED_POOL) counted in its base unit. In a pool, each variant is a pack size:
 * 1 of the variant = `conversionFactor` base units, so selling 2 trays of 30 takes 60 from the pool.
 * For pooled products `variant.stock` stays 0 and is never written.
 */
import { Prisma, PrismaClient, StockMode } from '@prisma/client';
import { availableUnits } from './stock-math';

type Db = PrismaClient | Prisma.TransactionClient;

export interface StockTarget {
    variantId: string;
    sku: string;
    price: number;
    cost: number;
    pooled: boolean;
    factor: number;
    variantStock: number;
    productId: string;
    productName: string;
    minStock: number;
    sharedStock: number;
    /** Base unit abbreviation for pooled products, e.g. "pcs" */
    baseUnit: string;
}

/** Stock needed from one place: a variant's own stock, or a product's pool. Quantities in that place's units. */
export interface StockDemand {
    pooled: boolean;
    variantId?: string;
    productId: string;
    label: string;
    unit: string;
    need: number;
    available: number;
    minStock: number;
}

export { availableUnits };

/** Load variants (this tenant only) with what's needed to check and move their stock. */
export async function loadStockTargets(db: Db, variantIds: string[], tenantId: string): Promise<Map<string, StockTarget>> {
    const variants = await db.productVariant.findMany({
        where: { id: { in: variantIds }, product: { tenantId } },
        select: {
            id: true,
            sku: true,
            price: true,
            cost: true,
            stock: true,
            conversionFactor: true,
            product: {
                select: {
                    id: true,
                    name: true,
                    minStock: true,
                    stockMode: true,
                    sharedStock: true,
                    baseUnit: { select: { abbreviation: true } },
                },
            },
        },
    });

    return new Map(variants.map(v => [v.id, {
        variantId: v.id,
        sku: v.sku,
        price: Number(v.price),
        cost: Number(v.cost),
        pooled: v.product.stockMode === StockMode.SHARED_POOL,
        factor: v.conversionFactor,
        variantStock: v.stock,
        productId: v.product.id,
        productName: v.product.name,
        minStock: v.product.minStock,
        sharedStock: v.product.sharedStock,
        baseUnit: v.product.baseUnit?.abbreviation ?? 'units',
    }]));
}

/**
 * Turn "how many of each variant" into "how much from each stock place".
 * Pooled variants of one product add up in base units: 1 Tray (30) + 5 pcs = 35 pcs from one pool.
 */
export function groupDemand(targets: Map<string, StockTarget>, qtyByVariant: Map<string, number>): StockDemand[] {
    const byPlace = new Map<string, StockDemand>();
    for (const [variantId, quantity] of qtyByVariant) {
        const t = targets.get(variantId);
        if (!t) continue;
        const key = t.pooled ? `pool:${t.productId}` : `variant:${variantId}`;
        const existing = byPlace.get(key);
        const need = t.pooled ? quantity * t.factor : quantity;
        if (existing) {
            existing.need += need;
        } else {
            byPlace.set(key, {
                pooled: t.pooled,
                variantId: t.pooled ? undefined : variantId,
                productId: t.productId,
                label: t.pooled ? t.productName : `${t.productName} (${t.sku})`,
                unit: t.pooled ? t.baseUnit : 'in stock',
                need,
                available: t.pooled ? t.sharedStock : t.variantStock,
                minStock: t.minStock,
            });
        }
    }
    return [...byPlace.values()];
}

/** Errors (not enough stock) and warnings (will drop below minimum) for a set of demands. */
export function checkAvailability(demands: StockDemand[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    for (const d of demands) {
        const unit = d.pooled ? ` ${d.unit}` : '';
        if (d.available < d.need) {
            errors.push(`${d.label}: ${d.available}${unit} in stock, ${d.need}${unit} in cart`);
            continue;
        }
        const after = d.available - d.need;
        if (after < d.minStock) {
            warnings.push(`${d.label} will be low on stock after this order. New stock: ${after}${unit}, Minimum: ${d.minStock}${unit}`);
        }
    }
    return { errors, warnings };
}

/**
 * Take stock for each demand. Atomic per place: only succeeds if the stock is still there, so two
 * tills can't both take the last of it. Returns false if any place no longer had enough
 * (the caller should abort its transaction). `allowNegative` records it anyway (offline sales).
 */
export async function takeStock(db: Db, demands: StockDemand[], { allowNegative = false } = {}): Promise<boolean> {
    for (const d of demands) {
        if (d.pooled) {
            const taken = await db.product.updateMany({
                where: { id: d.productId, ...(allowNegative ? {} : { sharedStock: { gte: d.need } }) },
                data: { sharedStock: { decrement: d.need } },
            });
            if (taken.count === 0) return false;
        } else {
            const taken = await db.productVariant.updateMany({
                where: { id: d.variantId, ...(allowNegative ? {} : { stock: { gte: d.need } }) },
                data: { stock: { decrement: d.need } },
            });
            if (taken.count === 0) return false;
        }
    }
    return true;
}

/**
 * Add (or with a negative quantity, remove) stock for `quantity` of a variant: to the variant itself,
 * or `quantity × factor` to its product's pool. Returns the base units moved for pooled products.
 */
export async function putStock(db: Db, variantId: string, quantity: number): Promise<{ pooled: boolean; baseQuantity: number }> {
    const variant = await db.productVariant.findUniqueOrThrow({
        where: { id: variantId },
        select: { conversionFactor: true, product: { select: { id: true, stockMode: true } } },
    });

    if (variant.product.stockMode === StockMode.SHARED_POOL) {
        const baseQuantity = quantity * variant.conversionFactor;
        await db.product.update({
            where: { id: variant.product.id },
            data: { sharedStock: { increment: baseQuantity } },
        });
        return { pooled: true, baseQuantity };
    }

    await db.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: quantity } },
    });
    return { pooled: false, baseQuantity: quantity };
}

/** Pooled variants cost `poolCost × factor`; keep the stored `variant.cost` (snapshotted on sales) in step. */
export async function syncPoolVariantCosts(db: Db, productId: string): Promise<void> {
    const product = await db.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stockMode: true, poolCost: true, variants: { select: { id: true, conversionFactor: true } } },
    });
    if (product.stockMode !== StockMode.SHARED_POOL) return;
    for (const v of product.variants) {
        await db.productVariant.update({
            where: { id: v.id },
            data: { cost: new Prisma.Decimal(Number(product.poolCost) * v.conversionFactor) },
        });
    }
}

/**
 * For API responses: give pooled variants a computed `stock` (whole units available from the pool),
 * so screens that read `variant.stock` work the same for both modes.
 */
export function withAvailableStock<V extends { stock: number; conversionFactor?: number }, P extends { stockMode?: StockMode | string; sharedStock?: number; variants?: V[] }>(product: P): P {
    if (product.stockMode !== StockMode.SHARED_POOL || !product.variants) return product;
    return {
        ...product,
        variants: product.variants.map(v => ({
            ...v,
            stock: availableUnits(product.sharedStock ?? 0, v.conversionFactor ?? 1),
        })),
    };
}
