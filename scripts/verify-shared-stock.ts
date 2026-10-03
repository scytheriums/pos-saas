/**
 * Scenario check for shared stock pools (src/lib/stock.ts) against a real database.
 *
 * Creates a throwaway store with an "Egg" product counted in pcs and sold as pcs / Tray (30) / Box (180),
 * runs sales, a race for the last stock, a return, a PO receipt, an adjustment, then deletes everything.
 *
 * Run ONLY against a test database (e.g. a Neon branch), with the migrations applied:
 *   npx dotenv-cli -e .env.test -- npx tsx scripts/verify-shared-stock.ts --test-database
 */
import { Prisma, PrismaClient, StockMode } from '@prisma/client';
import { loadStockTargets, groupDemand, checkAvailability, takeStock, putStock, syncPoolVariantCosts, withAvailableStock } from '../src/lib/stock';

if (!process.argv.includes('--test-database')) {
    console.error('Refusing to run: this writes test data. Point DATABASE_URL at a test database and pass --test-database.');
    process.exit(1);
}

const prisma = new PrismaClient();
let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : ` — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
}

async function pool(productId: string) {
    return (await prisma.product.findUniqueOrThrow({ where: { id: productId }, select: { sharedStock: true } })).sharedStock;
}

/** One checkout's stock step, as POST /api/orders does it */
async function sell(tenantId: string, cart: Record<string, number>) {
    return prisma.$transaction(async (tx) => {
        const qty = new Map(Object.entries(cart));
        const targets = await loadStockTargets(tx, [...qty.keys()], tenantId);
        const demands = groupDemand(targets, qty);
        const { errors } = checkAvailability(demands);
        if (errors.length) return { ok: false, errors };
        const taken = await takeStock(tx, demands);
        if (!taken) throw new Error('lost race');
        return { ok: true, errors };
    });
}

async function main() {
    const tenant = await prisma.tenant.create({ data: { name: `Verify shared stock ${Date.now()}` } });
    try {
        const [pcs, tray, box] = await Promise.all([
            prisma.unit.create({ data: { tenantId: tenant.id, name: 'Pieces', abbreviation: 'pcs' } }),
            prisma.unit.create({ data: { tenantId: tenant.id, name: 'Tray', abbreviation: 'tray' } }),
            prisma.unit.create({ data: { tenantId: tenant.id, name: 'Box', abbreviation: 'box' } }),
        ]);
        const stamp = Date.now();
        const product = await prisma.product.create({
            data: {
                tenantId: tenant.id,
                name: 'Egg',
                minStock: 60,
                stockMode: StockMode.SHARED_POOL,
                sharedStock: 400,
                poolCost: new Prisma.Decimal(1500),
                baseUnitId: pcs.id,
                variants: {
                    create: [
                        { sku: `VERIFY-EGG-1-${stamp}`, price: 2000, unitId: pcs.id, conversionFactor: 1 },
                        { sku: `VERIFY-EGG-30-${stamp}`, price: 55000, unitId: tray.id, conversionFactor: 30 },
                        { sku: `VERIFY-EGG-180-${stamp}`, price: 320000, unitId: box.id, conversionFactor: 180 },
                    ],
                },
            },
            include: { variants: { orderBy: { conversionFactor: 'asc' } } },
        });
        const [vPcs, vTray, vBox] = product.variants;
        await syncPoolVariantCosts(prisma, product.id);

        // 1. Mixed-unit sale from one pool: 180 + 60 + 5 = 245
        const sale = await sell(tenant.id, { [vBox.id]: 1, [vTray.id]: 2, [vPcs.id]: 5 });
        check('mixed sale accepted', sale.ok, true);
        check('pool after 1 box + 2 trays + 5 pcs', await pool(product.id), 155);

        // 2. Overselling is refused and nothing is taken
        const over = await sell(tenant.id, { [vBox.id]: 1 });
        check('selling a box from 155 pcs is refused', over.ok, false);
        check('pool unchanged after refusal', await pool(product.id), 155);

        // 3. Two tills race for the last tray: exactly one wins
        await prisma.product.update({ where: { id: product.id }, data: { sharedStock: 30 } });
        const race = await Promise.allSettled([sell(tenant.id, { [vTray.id]: 1 }), sell(tenant.id, { [vTray.id]: 1 })]);
        const winners = race.filter(r => r.status === 'fulfilled' && r.value.ok).length;
        check('only one of two simultaneous tray sales succeeds', winners, 1);
        check('pool after the race', await pool(product.id), 0);

        // 4. Return a tray
        const returned = await putStock(prisma, vTray.id, 1);
        check('returned tray adds 30 pcs', returned, { pooled: true, baseQuantity: 30 });
        check('pool after return', await pool(product.id), 30);

        // 5. Receive 2 boxes on a PO at Rp 270.000 per box, updating cost (as the receive route does)
        await putStock(prisma, vBox.id, 2);
        await prisma.product.update({ where: { id: product.id }, data: { poolCost: new Prisma.Decimal(270000 / 180) } });
        await syncPoolVariantCosts(prisma, product.id);
        check('pool after receiving 2 boxes', await pool(product.id), 390);
        const costs = await prisma.productVariant.findMany({ where: { productId: product.id }, orderBy: { conversionFactor: 'asc' }, select: { cost: true } });
        check('variant costs follow pool cost (pcs, tray, box)', costs.map(c => Number(c.cost)), [1500, 45000, 270000]);

        // 6. Adjustment: 3 trays damaged
        const adjusted = await putStock(prisma, vTray.id, -3);
        check('adjusting -3 trays moves -90 pcs', adjusted.baseQuantity, -90);
        check('pool after adjustment', await pool(product.id), 300);

        // 7. What the APIs show per selling unit
        const shaped = withAvailableStock(await prisma.product.findUniqueOrThrow({
            where: { id: product.id },
            include: { variants: { orderBy: { conversionFactor: 'asc' } } },
        }));
        check('available pcs / trays / boxes from 300 pcs', shaped.variants.map(v => v.stock), [300, 10, 1]);
        check('pooled variants hold no stock of their own', (await prisma.productVariant.findMany({ where: { productId: product.id } })).every(v => v.stock === 0), true);
    } finally {
        // Clean up everything this run created
        await prisma.productVariant.deleteMany({ where: { product: { tenantId: tenant.id } } });
        await prisma.product.deleteMany({ where: { tenantId: tenant.id } });
        await prisma.unit.deleteMany({ where: { tenantId: tenant.id } });
        await prisma.tenant.delete({ where: { id: tenant.id } });
        await prisma.$disconnect();
    }

    console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
});
