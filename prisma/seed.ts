import { PrismaClient } from '@prisma/client';
import { auth } from '../src/lib/better-auth';

const prisma = new PrismaClient({});

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';

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

    // 3. Create Admin User via Better Auth (handles password hashing + Account record)
    const existingUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

    if (!existingUser) {
        const result = await auth.api.signUpEmail({
            body: {
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                name: 'Admin User',
            },
        });

        if (!result?.user) {
            throw new Error('Failed to create admin user via Better Auth');
        }

        // Assign tenant + owner role
        await prisma.user.update({
            where: { email: ADMIN_EMAIL },
            data: {
                tenantId: tenant.id,
                roleId: adminRole.id,
                role: 'owner',
                emailVerified: true,
            },
        });

        console.log(`Created Admin User: ${ADMIN_EMAIL} / password: ${ADMIN_PASSWORD}`);
    } else {
        // Make sure existing user has correct tenant + role
        await prisma.user.update({
            where: { email: ADMIN_EMAIL },
            data: {
                tenantId: tenant.id,
                roleId: adminRole.id,
                role: 'owner',
                emailVerified: true,
            },
        });
        console.log(`Admin user already exists: ${ADMIN_EMAIL} (tenant + role updated)`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
