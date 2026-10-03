/**
 * Validation for shared-stock-pool product input, used by product create (POST /api/products)
 * and edit (PATCH /api/products/[id]).
 */
import { Prisma, PrismaClient, StockMode } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export class PoolValidationError extends Error {
    constructor(message: string, public status: number = 400) {
        super(message);
    }
}

export interface PoolSettings {
    stockMode: StockMode;
    baseUnitId: string | null;
    sharedStock: number;
    poolCost: number;
}

interface IncomingUnitVariant {
    unitId?: string | null;
    conversionFactor?: number;
}

/**
 * Read and check the stock-mode fields of a product request.
 * `fallback` supplies current values on edit when a field isn't sent.
 */
export async function parsePoolSettings(
    db: Db,
    tenantId: string,
    body: { stockMode?: string; baseUnitId?: string | null; sharedStock?: number; poolCost?: number },
    variants: IncomingUnitVariant[],
    fallback?: PoolSettings,
): Promise<PoolSettings> {
    const stockMode = body.stockMode === StockMode.SHARED_POOL ? StockMode.SHARED_POOL
        : body.stockMode === StockMode.PER_VARIANT ? StockMode.PER_VARIANT
        : fallback?.stockMode ?? StockMode.PER_VARIANT;

    if (stockMode === StockMode.PER_VARIANT) {
        return { stockMode, baseUnitId: null, sharedStock: 0, poolCost: 0 };
    }

    const baseUnitId = body.baseUnitId !== undefined ? body.baseUnitId : fallback?.baseUnitId ?? null;
    const sharedStock = body.sharedStock !== undefined ? Number(body.sharedStock) : fallback?.sharedStock ?? 0;
    const poolCost = body.poolCost !== undefined ? Number(body.poolCost) : fallback?.poolCost ?? 0;

    if (!baseUnitId) throw new PoolValidationError('Choose the base unit the shared stock is counted in');
    if (!Number.isInteger(sharedStock) || sharedStock < 0) throw new PoolValidationError('Shared stock must be a whole number, zero or more');
    if (!Number.isFinite(poolCost) || poolCost < 0) throw new PoolValidationError('Cost per base unit must be zero or more');
    if (variants.length === 0) throw new PoolValidationError('Add at least one selling unit');

    for (const v of variants) {
        if (!v.unitId) throw new PoolValidationError('Every selling unit needs a unit');
        const factor = Number(v.conversionFactor);
        if (!Number.isInteger(factor) || factor < 1) {
            throw new PoolValidationError('Each selling unit must equal a whole number of base units (1 or more)');
        }
    }

    // All units must belong to this store
    const unitIds = [...new Set([baseUnitId, ...variants.map(v => v.unitId!)])];
    const found = await db.unit.count({ where: { id: { in: unitIds }, tenantId } });
    if (found !== unitIds.length) throw new PoolValidationError('One of the units was not found');

    return { stockMode, baseUnitId, sharedStock, poolCost };
}

/** The unit/stock/cost fields to write on a variant, given the product's pool settings. */
export function variantPoolFields(pool: PoolSettings, v: IncomingUnitVariant) {
    if (pool.stockMode !== StockMode.SHARED_POOL) {
        return { unitId: null, conversionFactor: 1 };
    }
    const conversionFactor = Number(v.conversionFactor);
    return {
        unitId: v.unitId!,
        conversionFactor,
        stock: 0, // pooled stock lives on the product
        cost: new Prisma.Decimal(pool.poolCost * conversionFactor),
    };
}
