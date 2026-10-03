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

        if (invitation.email.trim().toLowerCase() !== session.user.email.trim().toLowerCase()) {
            return NextResponse.json({ error: 'Invitation is for a different email address' }, { status: 403 });
        }

        // Don't silently move someone out of the store they already belong to
        const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { tenantId: true } });
        if (currentUser?.tenantId && currentUser.tenantId !== invitation.tenantId) {
            return NextResponse.json({
                error: 'This account already belongs to another store. Sign up with a different email to join this team.'
            }, { status: 409 });
        }

        // Find the role for this tenant+role combination
        const userRole = await prisma.userRole.findFirst({
            where: { tenantId: invitation.tenantId, name: { equals: invitation.role, mode: 'insensitive' } },
        });

        // Use the invitation and join the store together; an invitation works only once
        const joined = await prisma.$transaction(async (tx) => {
            const claimed = await tx.invitation.updateMany({
                where: { token, accepted: false },
                data: { accepted: true },
            });
            if (claimed.count === 0) return false;
            await tx.user.update({
                where: { id: session.user.id },
                data: {
                    tenantId: invitation.tenantId,
                    role: invitation.role,
                    roleId: userRole?.id ?? null,
                },
            });
            return true;
        });
        if (!joined) {
            return NextResponse.json({ error: 'Invitation has already been used' }, { status: 400 });
        }

        return NextResponse.json({ message: 'Invitation accepted successfully' });
    } catch (error) {
        console.error('Error accepting invitation:', error);
        return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
    }
}
