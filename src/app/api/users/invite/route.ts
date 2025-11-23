import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, hasRole } from '@/lib/auth';
import { clerkClient } from '@clerk/nextjs/server';

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

        // Create invitation using Clerk
        const client = await clerkClient();
        const invitation = await client.invitations.createInvitation({
            emailAddress: email,
            publicMetadata: {
                tenantId,
                role: inviteRole,
            },
            redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
        });

        return NextResponse.json({
            message: 'Invitation sent successfully',
            invitationId: invitation.id,
        });
    } catch (error: any) {
        console.error('Error creating invitation:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send invitation' },
            { status: 500 }
        );
    }
}
