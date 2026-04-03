import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, hasRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

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

        // Get user from DB to verify they're in the same tenant
        const userToRemove = await prisma.user.findUnique({
            where: { id: userIdToRemove },
        });

        if (!userToRemove) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (userToRemove.tenantId !== tenantId) {
            return NextResponse.json({ error: 'User not in your tenant' }, { status: 403 });
        }

        // Remove tenant association
        await prisma.user.update({
            where: { id: userIdToRemove },
            data: {
                tenantId: null,
                role: null,
                roleId: null,
            },
        });

        // Log audit trail
        await logAudit({
            tenantId,
            userId,
            userName: authResult.user.name,
            action: "DELETE",
            resource: "USER",
            resourceId: userIdToRemove,
            details: {
                removedUserEmail: userToRemove.email,
                removedUserRole: userToRemove.role
            },
            request: req
        });

        return NextResponse.json({ message: 'User removed successfully' });
    } catch (error) {
        console.error('Error removing user:', error);
        return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 });
    }
}
