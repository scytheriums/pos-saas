import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { businessName } = await req.json();

        if (!businessName || businessName.trim().length === 0) {
            return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
        }

        // Get user from Clerk
        const client = await clerkClient();
        const user = await client.users.getUser(session.userId);

        // Check if user already has a tenant
        if (user.publicMetadata.tenantId) {
            return NextResponse.json({ error: 'User already has a tenant' }, { status: 400 });
        }

        // Create tenant in database
        const tenant = await prisma.tenant.create({
            data: {
                name: businessName.trim(),
                // You can add more fields like plan, settings, etc.
            },
        });

        // Update user metadata in Clerk
        await client.users.updateUser(session.userId, {
            publicMetadata: {
                tenantId: tenant.id,
                tenantName: tenant.name,
                role: 'owner',
            },
        });

        return NextResponse.json({
            tenantId: tenant.id,
            tenantName: tenant.name,
        });
    } catch (error) {
        console.error('Onboarding error:', error);
        return NextResponse.json(
            { error: 'Failed to create tenant' },
            { status: 500 }
        );
    }
}
