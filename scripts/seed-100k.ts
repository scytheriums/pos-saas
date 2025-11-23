import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting 100k product seed...');

    // 1. Get or create a test tenant
    let tenant = await prisma.tenant.findFirst({
        where: { name: 'Performance Test Tenant' }
    });

    if (!tenant) {
        console.log('Creating test tenant...');
        tenant = await prisma.tenant.create({
            data: {
                name: 'Performance Test Tenant',
                address: '123 Test St',
                phone: '555-0123'
            }
        });
    }

    console.log(`Using tenant: ${tenant.id}`);

    // 2. Clean up existing data for this tenant to avoid duplicates/mess
    console.log('Cleaning up old data...');
    await prisma.product.deleteMany({ where: { tenantId: tenant.id } });

    // 3. Generate and insert products in batches
    const BATCH_SIZE = 1000;
    const TOTAL_PRODUCTS = 100000;
    const BATCHES = Math.ceil(TOTAL_PRODUCTS / BATCH_SIZE);

    const adjectives = ['Premium', 'Basic', 'Luxury', 'Standard', 'Eco', 'Pro', 'Ultra', 'Smart', 'Super', 'Mega'];
    const nouns = ['Widget', 'Gadget', 'Tool', 'Device', 'System', 'Module', 'Unit', 'Component', 'Part', 'Accessory'];
    const categories = ['Electronics', 'Home', 'Office', 'Industrial', 'Automotive'];

    console.log(`Seeding ${TOTAL_PRODUCTS} products in ${BATCHES} batches...`);

    const startTime = Date.now();

    for (let i = 0; i < BATCHES; i++) {
        const products = [];
        const variants = [];

        for (let j = 0; j < BATCH_SIZE; j++) {
            const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            const category = categories[Math.floor(Math.random() * categories.length)];
            const uniqueId = i * BATCH_SIZE + j;
            const productId = `seed-${uniqueId}-${Date.now()}`; // Simple unique ID generation
            const price = Math.floor(Math.random() * 100000) + 10000;

            products.push({
                id: productId,
                name: `${adj} ${noun} ${uniqueId}`,
                description: `This is a description for ${adj} ${noun} ${uniqueId}.`,
                minStock: Math.floor(Math.random() * 20) + 5,
                tenantId: tenant.id,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Create a default variant for each product
            variants.push({
                productId: productId,
                sku: `SKU-${uniqueId}`,
                price: new Prisma.Decimal(price),
                stock: Math.floor(Math.random() * 100),
                barcode: `BC-${uniqueId}`
            });
        }

        // Transaction to ensure both products and variants are created
        await prisma.$transaction([
            prisma.product.createMany({ data: products }),
            prisma.productVariant.createMany({ data: variants })
        ]);

        if ((i + 1) % 10 === 0) {
            const progress = ((i + 1) / BATCHES * 100).toFixed(1);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`Batch ${i + 1}/${BATCHES} (${progress}%) - ${elapsed}s elapsed`);
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Seeding complete! Inserted ${TOTAL_PRODUCTS} products with variants in ${totalTime}s.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
