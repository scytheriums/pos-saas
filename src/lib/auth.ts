import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export type UserRole = 'owner' | 'manager' | 'cashier';

export interface AuthUser {
    userId: string;
    tenantId: string;
    role: UserRole;
    email: string;
}

/**
 * Get authenticated user with tenant context
 * Use this in API routes to get the current user's tenant and role
 */
export async function getAuthUser(): Promise<{ user: AuthUser } | { error: string; status: number }> {
    const session = await auth();

    if (!session.userId) {
        return { error: 'Unauthorized', status: 401 };
    }

    try {
        const client = await clerkClient();
        const user = await client.users.getUser(session.userId);
        const tenantId = user.publicMetadata.tenantId as string;
        const role = user.publicMetadata.role as UserRole;
        const email = user.emailAddresses[0]?.emailAddress || '';

        if (!tenantId) {
            return { error: 'No tenant assigned. Please complete onboarding.', status: 403 };
        }

        if (!role) {
            return { error: 'No role assigned', status: 403 };
        }

        return {
            user: {
                userId: session.userId,
                tenantId,
                role,
                email,
            }
        };
    } catch (error) {
        console.error('Error fetching user:', error);
        return { error: 'Failed to fetch user data', status: 500 };
    }
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
    return allowedRoles.includes(userRole);
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized') {
    return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message: string = 'Forbidden') {
    return NextResponse.json({ error: message }, { status: 403 });
}
