const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Prisma Client initialized successfully');
    const tenants = await prisma.tenant.findMany();
    console.log('Tenants:', tenants);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
