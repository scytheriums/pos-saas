import { prisma } from './prisma';

/** Units every store starts with. Keep in sync with the 20261004100000_shared_stock_pool migration. */
export const DEFAULT_UNITS = [
    { name: 'Pieces', abbreviation: 'pcs' },
    { name: 'Gram', abbreviation: 'g' },
    { name: 'Kilogram', abbreviation: 'kg' },
    { name: 'Millilitre', abbreviation: 'ml' },
    { name: 'Litre', abbreviation: 'L' },
    { name: 'Pack', abbreviation: 'pack' },
    { name: 'Box', abbreviation: 'box' },
    { name: 'Dozen', abbreviation: 'dozen' },
];

export async function createDefaultUnits(tenantId: string) {
    await prisma.unit.createMany({
        data: DEFAULT_UNITS.map(u => ({ ...u, tenantId })),
        skipDuplicates: true,
    });
}
