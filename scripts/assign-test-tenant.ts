import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error('Please provide an email address as an argument.');
        console.log('Usage: npx tsx scripts/assign-test-tenant.ts <email>');
        process.exit(1);
    }

    console.log(`Assigning user ${email} to Performance Test Tenant...`);

    const tenant = await prisma.tenant.findFirst({
        where: { name: 'Performance Test Tenant' }
    });

    if (!tenant) {
        console.error('Performance Test Tenant not found. Run seed-100k.ts first.');
        process.exit(1);
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.error('User not found in database.');
        process.exit(1);
    }

    console.log(`Found user: ${user.id}`);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            tenantId: tenant.id,
            role: 'owner',
        },
    });

    console.log(`Successfully assigned ${email} to tenant ${tenant.name} (${tenant.id})`);
    console.log('User will see changes on next sign-in.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
