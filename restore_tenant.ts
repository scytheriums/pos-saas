import { prisma } from './src/lib/prisma';

async function main() {
    const tenantId = 'cmi96oy6500005rhw6orqazi4';
    console.log(`Restoring tenant ${tenantId}...`);

    try {
        const tenant = await prisma.tenant.create({
            data: {
                id: tenantId,
                name: 'Restored Tenant', // We don't know the original name, but this allows operations to proceed
            }
        });
        console.log('Tenant restored successfully:', tenant);
    } catch (error) {
        console.error('Error restoring tenant:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
