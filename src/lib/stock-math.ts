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

/**
 * A selling-unit row: 1 of it contains `containsQty` × `containsRef`, where the ref is an earlier
 * row's id or BASE_REF. With no ref it means "the row above" (the first row: base units).
 * Only earlier rows can be referenced, so sizes can never loop.
 */
export interface LadderRow {
    id: string;
    containsQty?: number;
    containsRef?: string;
}

/** Rows as definitions for `resolveFactors`; a ref to anything but an earlier row falls back to the row above. */
export function ladderDefinitions(rows: LadderRow[]): UnitDefinition[] {
    return rows.map((r, i) => {
        const earlier = rows.slice(0, i).map(x => x.id);
        const fallback = i === 0 ? BASE_REF : rows[i - 1].id;
        const ref = r.containsRef && (r.containsRef === BASE_REF || earlier.includes(r.containsRef)) ? r.containsRef : fallback;
        return { id: r.id, containsQty: Math.max(1, Math.floor(r.containsQty ?? 1)), containsRef: ref };
    });
}

/**
 * Describe a size in terms of the largest earlier unit that divides it evenly, else in base units:
 * Box 144 with Pack 12 → 12 × Pack; Box 50 with Dozen 12 → 50 × base.
 */
export function bestRef(factor: number, earlier: { id: string; factor: number }[]): { containsQty: number; containsRef: string } {
    const parent = earlier
        .filter(e => e.factor > 1 && e.factor < factor && factor % e.factor === 0)
        .sort((a, b) => b.factor - a.factor)[0];
    return parent
        ? { containsQty: factor / parent.factor, containsRef: parent.id }
        : { containsQty: factor, containsRef: BASE_REF };
}

/** Order saved units small → big and describe each in terms of a smaller one (Box 144 pcs → 12 × Pack). */
export function inferLadder<T extends { id: string; conversionFactor?: number }>(rows: T[]): (T & { containsQty: number; containsRef: string })[] {
    const sorted = [...rows].sort((a, b) => (a.conversionFactor ?? 1) - (b.conversionFactor ?? 1));
    return sorted.map((r, i) => ({
        ...r,
        ...bestRef(r.conversionFactor ?? 1, sorted.slice(0, i).map(e => ({ id: e.id, factor: e.conversionFactor ?? 1 }))),
    }));
}
