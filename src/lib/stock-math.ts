/** Stock arithmetic shared by server code and the browser (no database imports). */

/** Whole units of a pooled variant the pool can supply. */
export function availableUnits(sharedStock: number, factor: number): number {
    return Math.floor(Math.max(0, sharedStock) / Math.max(1, factor));
}

/** A selling unit defined as "contains `qty` × `ref`", where ref is another unit's id or 'base'. */
export interface UnitDefinition {
    id: string;
    containsQty: number;
    containsRef: string; // another row's id, or 'base'
}

export const BASE_REF = 'base';

/**
 * Work out each unit's size in base units by following its chain:
 * Box = 12 × Pack, Pack = 12 × base → Box = 144. Returns an error for loops or missing units.
 */
export function resolveFactors(units: UnitDefinition[]): { factors: Map<string, number>; error: string | null } {
    const byId = new Map(units.map(u => [u.id, u]));
    const factors = new Map<string, number>();

    const resolve = (id: string, seen: Set<string>): number => {
        const known = factors.get(id);
        if (known !== undefined) return known;
        const unit = byId.get(id);
        if (!unit) throw new Error('A unit refers to a unit that no longer exists');
        if (seen.has(id)) throw new Error('Units refer to each other in a loop');
        seen.add(id);
        const qty = Math.max(1, Math.floor(unit.containsQty || 1));
        const factor = unit.containsRef === BASE_REF ? qty : qty * resolve(unit.containsRef, seen);
        factors.set(id, factor);
        return factor;
    };

    try {
        for (const u of units) resolve(u.id, new Set());
        return { factors, error: null };
    } catch (e) {
        return { factors, error: e instanceof Error ? e.message : 'Invalid units' };
    }
}

/** Split a base-unit total into counts per unit, largest first: 499 pcs → 3 Box, 5 Pack, 7 pcs. */
export function splitStock(total: number, units: { id: string; factor: number }[]): Record<string, number> {
    const counts: Record<string, number> = {};
    let left = Math.max(0, total);
    for (const u of [...units].sort((a, b) => b.factor - a.factor)) {
        counts[u.id] = Math.floor(left / u.factor);
        left -= counts[u.id] * u.factor;
    }
    return counts;
}

/** A row in a unit ladder: contains `containsQty` × the row above it, or × base units if `countInBase`. */
export interface LadderRow {
    id: string;
    containsQty?: number;
    countInBase?: boolean;
}

/** Ladder rows as definitions for `resolveFactors`: the first row (and any `countInBase` row) counts in base units. */
export function ladderDefinitions(rows: LadderRow[]): UnitDefinition[] {
    return rows.map((r, i) => ({
        id: r.id,
        containsQty: Math.max(1, Math.floor(r.containsQty ?? 1)),
        containsRef: i === 0 || r.countInBase ? BASE_REF : rows[i - 1].id,
    }));
}

/** How to describe a size `factor` sitting above a row of size `prevFactor`: N × that row if it divides, else in base units. */
export function ladderStep(factor: number, prevFactor: number): { containsQty: number; countInBase: boolean } {
    return prevFactor > 1 && factor % prevFactor === 0
        ? { containsQty: factor / prevFactor, countInBase: false }
        : { containsQty: factor, countInBase: prevFactor !== 1 };
}

/** Order saved units small → big and describe each relative to the one below it (Box 144 above Pack 12 → 12 × Pack). */
export function inferLadder<T extends { id: string; conversionFactor?: number }>(rows: T[]): (T & { containsQty: number; countInBase: boolean })[] {
    const sorted = [...rows].sort((a, b) => (a.conversionFactor ?? 1) - (b.conversionFactor ?? 1));
    return sorted.map((r, i) => {
        const factor = r.conversionFactor ?? 1;
        const prev = i === 0 ? 1 : sorted[i - 1].conversionFactor ?? 1;
        return { ...r, ...ladderStep(factor, prev) };
    });
}
