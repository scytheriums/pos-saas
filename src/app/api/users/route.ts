import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, hasRole } from '@/lib/auth';
import { clerkClient } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
    try {
        // Get authenticated user
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId, role } = authResult.user;

        // Only owners and managers can view team members
        if (!hasRole(role, ['owner', 'manager'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get all users for this tenant from Clerk
        const client = await clerkClient();
        const { data: allUsers } = await client.users.getUserList({
            limit: 100,
        });

        // Filter users by tenant
        const tenantUsers = allUsers
            .filter((user) => user.publicMetadata.tenantId === tenantId)
            .map((user) => ({
                id: user.id,
                email: user.emailAddresses[0]?.emailAddress || '',
                role: user.publicMetadata.role as string,
                firstName: user.firstName,
                lastName: user.lastName,
            }));

        return NextResponse.json({ users: tenantUsers });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
