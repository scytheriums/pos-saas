import { PrismaClient } from '@prisma/client';
import { clerkClient } from '@clerk/nextjs/server';

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

    try {
        const client = await clerkClient();
        const users = await client.users.getUserList({ emailAddress: [email] });

        if (users.data.length === 0) {
            console.error('User not found in Clerk.');
            process.exit(1);
        }

        const user = users.data[0];
        console.log(`Found user: ${user.id}`);

        await client.users.updateUserMetadata(user.id, {
            publicMetadata: {
                tenantId: tenant.id,
                role: 'owner',
                tenantName: tenant.name
            }
        });

        console.log(`Successfully assigned ${email} to tenant ${tenant.name} (${tenant.id})`);
        console.log('Please refresh your browser to see the changes.');
    } catch (error) {
        console.error('Error updating user metadata:', error);
        process.exit(1);
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
