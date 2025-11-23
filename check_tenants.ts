import { prisma } from './src/lib/prisma';

async function main() {
    console.log('Checking Tenants and Users...');

    const tenants = await prisma.tenant.findMany();
    console.log(`Found ${tenants.length} tenants:`);
    tenants.forEach(t => console.log(`- ID: ${t.id}, Name: ${t.name}`));

    // We can't easily check Clerk users here without the secret key and Clerk SDK setup in this script context,
    // but we can check the local User table if it's being used (schema has User model).
    // However, auth.ts uses Clerk directly.

    // Let's check the local User table anyway
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} local users:`);
    users.forEach(u => console.log(`- ID: ${u.id}, Email: ${u.email}, TenantId: ${u.tenantId}`));

    if (tenants.length === 0) {
        console.log('\nWARNING: No tenants found in database! This explains the foreign key error.');
        console.log('You need to create a tenant.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
