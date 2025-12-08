import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const session = await auth();

        return NextResponse.json({
            authenticated: !!session.userId,
            userId: session.userId || null,
            sessionId: session.sessionId || null,
            sessionClaims: session.sessionClaims || null,
            orgId: session.orgId || null,
            orgRole: session.orgRole || null,
            orgSlug: session.orgSlug || null,
        });
    } catch (error: any) {
        return NextResponse.json({
            error: 'Session check failed',
            message: error.message
        }, { status: 500 });
    }
}
