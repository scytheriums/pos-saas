import { auth } from '@/lib/better-auth';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const session = await auth.api.getSession({ headers: await headers() });

        return NextResponse.json({
            authenticated: !!session,
            userId: session?.user.id ?? null,
            sessionId: session?.session.id ?? null,
            email: session?.user.email ?? null,
            tenantId: session?.user.tenantId ?? null,
            role: session?.user.role ?? null,
        });
    } catch (error: any) {
        return NextResponse.json({
            error: 'Session check failed',
            message: error.message
        }, { status: 500 });
    }
}
