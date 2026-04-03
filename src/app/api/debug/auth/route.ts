import { auth } from '@/lib/better-auth';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await auth.api.getSession({ headers: await headers() });

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                tenant: true,
                userRole: true,
            },
        });

        return NextResponse.json({
            session: {
                userId: session.user.id,
                email: session.user.email,
                tenantId: session.user.tenantId,
                role: session.user.role,
            },
            database: dbUser,
            match: {
                userExists: !!dbUser,
                tenantIdMatch: dbUser?.tenantId === session.user.tenantId,
                hasRole: !!dbUser?.userRole,
            },
        });
    } catch (error: any) {
        return NextResponse.json({
            error: 'Debug failed',
            message: error.message,
        }, { status: 500 });
    }
}
