import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/better-auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { token } = await req.json();
        if (!token) {
            return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 });
        }

        // Find the pending invitation
        const invitation = await prisma.invitation.findUnique({ where: { token } });

        if (!invitation) {
            return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 });
        }

        if (invitation.accepted) {
            return NextResponse.json({ error: 'Invitation has already been used' }, { status: 400 });
        }

        if (invitation.expiresAt < new Date()) {
            return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
        }

        if (invitation.email !== session.user.email) {
            return NextResponse.json({ error: 'Invitation is for a different email address' }, { status: 403 });
        }

        // Find the role for this tenant+role combination
        const userRole = await prisma.userRole.findFirst({
            where: { tenantId: invitation.tenantId, name: { equals: invitation.role, mode: 'insensitive' } },
        });

        // Assign user to tenant
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                tenantId: invitation.tenantId,
                role: invitation.role,
                roleId: userRole?.id ?? null,
            },
        });

        // Mark invitation as accepted
        await prisma.invitation.update({
            where: { token },
            data: { accepted: true },
        });

        return NextResponse.json({ message: 'Invitation accepted successfully' });
    } catch (error) {
        console.error('Error accepting invitation:', error);
        return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
    }
}
