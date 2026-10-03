/**
 * Local copy of the sellable product catalog, so the POS can search, scan and sell offline.
 * Synced from GET /api/products while online; read from IndexedDB when the network is down.
 */
import { db } from './db';

const SYNC_KEY = 'awan-pos-catalog-synced-at';
const PAGE_SIZE = 100;
const MAX_PAGES = 50; // up to 5,000 products cached
const STALE_AFTER_MS = 10 * 60 * 1000;

/** The fields of a GET /api/products row the POS relies on */
export interface CatalogVariant {
    id: string;
    sku?: string;
    barcode?: string | null;
    price: number | string;
    [key: string]: unknown;
}
export interface CatalogProduct {
    id: string;
    name: string;
    categoryId?: string | null;
    variants?: CatalogVariant[];
    [key: string]: unknown;
}

let syncing: Promise<number> | null = null;

function lastSyncedAt(): number {
    try { return Number(localStorage.getItem(SYNC_KEY)) || 0; } catch { return 0; }
}

/** Download the whole sellable catalog into IndexedDB. Skips if synced recently unless forced. */
export function syncCatalog({ force = false } = {}): Promise<number> {
    if (syncing) return syncing;
    if (!force && Date.now() - lastSyncedAt() < STALE_AFTER_MS) return Promise.resolve(0);

    syncing = (async () => {
        const all: CatalogProduct[] = [];
        let cursor: string | null = null;
        for (let page = 0; page < MAX_PAGES; page++) {
            const params = new URLSearchParams({ limit: String(PAGE_SIZE), sellable: 'true' });
            if (cursor) params.set('cursor', cursor);
            const res = await fetch(`/api/products?${params}`);
            if (!res.ok) throw new Error(`Catalog sync failed: HTTP ${res.status}`);
            const data = await res.json();
            all.push(...(data.products ?? []));
            if (!data.hasMore || !data.nextCursor) break;
            cursor = data.nextCursor;
        }

        const now = Date.now();
        await db.transaction('rw', db.products, async () => {
            await db.products.clear();
            await db.products.bulkPut(all.map(p => ({
                id: p.id,
                name: p.name,
                price: Number(p.variants?.[0]?.price ?? 0),
                category: p.categoryId ?? '',
                variants: p.variants ?? [],
                updatedAt: now,
                product: p,
            })));
        });
        try { localStorage.setItem(SYNC_KEY, String(now)); } catch { /* per-device convenience only */ }
        return all.length;
    })().finally(() => { syncing = null; });

    return syncing;
}

/** Search the cached catalog by product name, SKU or barcode. */
export async function searchCachedProducts(query: string, offset: number, limit: number): Promise<CatalogProduct[]> {
    const q = query.trim().toLowerCase();
    const rows = await db.products.toArray();
    const matches = q
        ? rows.filter(r =>
            r.name.toLowerCase().includes(q) ||
            r.variants.some((v: CatalogVariant) => v.sku?.toLowerCase().includes(q) || v.barcode === query.trim()))
        : rows;
    return matches.slice(offset, offset + limit).map(r => r.product ?? { id: r.id, name: r.name, variants: r.variants });
}

/** Find the product and variant for a scanned code (barcode first, then exact SKU). */
export async function findCachedByCode(code: string): Promise<{ product: CatalogProduct; variant: CatalogVariant } | null> {
    const rows = await db.products.toArray();
    for (const match of [(v: CatalogVariant) => v.barcode === code, (v: CatalogVariant) => v.sku === code]) {
        for (const r of rows) {
            const variant = r.variants.find(match);
            if (variant) return { product: r.product ?? r, variant };
        }
    }
    return null;
}
