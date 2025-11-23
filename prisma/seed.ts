import { PrismaClient, Role } from '@prisma/client';

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

    // 2. Create Admin User
    const adminEmail = 'admin@example.com';
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            name: 'Admin User',
            role: Role.ADMIN,
            tenantId: tenant.id,
            password: 'hashed_password_placeholder', // In real app, hash this
        },
    });

    console.log('Created Admin User:', admin.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
