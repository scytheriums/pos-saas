import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, hasRole } from '@/lib/auth';
import { clerkClient } from '@clerk/nextjs/server';

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        // Get authenticated user
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { userId, tenantId, role } = authResult.user;

        // Only owners can remove users
        if (!hasRole(role, ['owner'])) {
            return NextResponse.json({ error: 'Only owners can remove team members' }, { status: 403 });
        }

        const userIdToRemove = params.id;

        // Prevent removing yourself
        if (userIdToRemove === userId) {
            return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
        }

        // Get user to verify they're in the same tenant
        const client = await clerkClient();
        const userToRemove = await client.users.getUser(userIdToRemove);

        if (userToRemove.publicMetadata.tenantId !== tenantId) {
            return NextResponse.json({ error: 'User not in your tenant' }, { status: 403 });
        }

        // Remove tenant association (or delete user based on your preference)
        await client.users.updateUser(userIdToRemove, {
            publicMetadata: {
                tenantId: null,
                role: null,
            },
        });

        return NextResponse.json({ message: 'User removed successfully' });
    } catch (error) {
        console.error('Error removing user:', error);
        return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 });
    }
}
