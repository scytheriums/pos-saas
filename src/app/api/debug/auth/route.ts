import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await auth();

        if (!session.userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const client = await clerkClient();
        const clerkUser = await client.users.getUser(session.userId);

        const dbUser = await prisma.user.findUnique({
            where: { clerkUserId: session.userId },
            include: {
                tenant: true,
                role: true
            }
        });

        return NextResponse.json({
            clerk: {
                userId: session.userId,
                email: clerkUser.emailAddresses[0]?.emailAddress,
                metadata: clerkUser.publicMetadata,
                sessionClaims: session.sessionClaims
            },
            database: dbUser,
            match: {
                userExists: !!dbUser,
                tenantIdMatch: dbUser?.tenantId === clerkUser.publicMetadata.tenantId,
                hasRole: !!dbUser?.role
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            error: 'Debug failed',
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
