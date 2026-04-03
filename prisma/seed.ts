import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({});

async function main() {
    // 1. Create Default Tenant
    const tenant = await prisma.tenant.upsert({
        where: { id: 'default-tenant' },
        update: {},
        create: {
            id: 'default-tenant',
            name: 'Demo Store',
        },
    });

    console.log('Created Tenant:', tenant.name);

    // 2. Create Roles
    const adminRole = await prisma.userRole.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: 'Owner' } },
        update: {},
        create: {
            name: 'Owner',
            description: 'Full access to everything',
            tenantId: tenant.id,
            isDefault: false,
        },
    });

    const cashierRole = await prisma.userRole.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: 'Cashier' } },
        update: {},
        create: {
            name: 'Cashier',
            description: 'Process sales and view orders',
            tenantId: tenant.id,
            isDefault: true,
        },
    });

    console.log('Created Roles:', adminRole.name, cashierRole.name);

    // 3. Create Admin User
    const adminEmail = 'admin@example.com';

    const adminUser = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            name: 'Admin User',
            emailVerified: true,
            roleId: adminRole.id,
            tenantId: tenant.id,
        },
    });

    console.log('Created Admin User:', adminUser.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
