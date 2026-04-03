import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, hasRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        // Get authenticated user
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId, role } = authResult.user;

        // Only owners can invite users
        if (!hasRole(role, ['owner'])) {
            return NextResponse.json({ error: 'Only owners can invite team members' }, { status: 403 });
        }

        const { email, role: inviteRole } = await req.json();

        if (!email || !inviteRole) {
            return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
        }

        // Validate role
        if (!['owner', 'manager', 'cashier'].includes(inviteRole)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        // Create invitation record in DB
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        const invitation = await prisma.invitation.create({
            data: {
                email,
                tenantId,
                role: inviteRole,
                expiresAt,
            },
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const inviteLink = `${appUrl}/sign-up?invite=${invitation.token}`;

        // Log audit trail
        await logAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE",
            resource: "USER",
            resourceId: invitation.id,
            details: {
                email,
                role: inviteRole,
                invitationType: "INVITATION"
            },
            request: req
        });

        return NextResponse.json({
            message: 'Invitation created successfully',
            invitationId: invitation.id,
            inviteLink,
        });
    } catch (error: any) {
        console.error('Error creating invitation:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send invitation' },
            { status: 500 }
        );
    }
}
