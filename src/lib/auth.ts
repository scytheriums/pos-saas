import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export type UserRole = 'owner' | 'manager' | 'cashier';

export interface AuthUser {
    id: string; // Database User ID
    userId: string; // Clerk User ID
    tenantId: string;
    role: UserRole;
    email: string;
    name: string;
}

/**
 * Get authenticated user with tenant context.
 * If the user does not exist in the DB, it is created and assigned the default Owner role (isDefault).
 */
export async function getAuthUser():
    Promise<{ user: AuthUser; tenantId: string } | { error: string; status: number }> {
    const session = await auth();
    if (!session.userId) {
        return { error: 'Unauthorized', status: 401 };
    }

    try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(session.userId);
        const tenantId = clerkUser.publicMetadata.tenantId as string;
        const role = clerkUser.publicMetadata.role as UserRole;
        const email = clerkUser.emailAddresses[0]?.emailAddress || '';
        const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email;

        if (!tenantId) {
            return { error: 'No tenant assigned. Please complete onboarding.', status: 403 };
        }
        if (!role) {
            return { error: 'No role assigned', status: 403 };
        }

        const { prisma } = await import('@/lib/prisma');
        // Find existing user record
        let dbUser = await prisma.user.findUnique({
            where: { clerkUserId: session.userId },
        });

        // If not exists, create user and assign default Owner role (isDefault true)
        if (!dbUser) {
            let ownerRole = await prisma.userRole.findFirst({
                where: { tenantId, isDefault: true },
            });

            if (!ownerRole) {
                // Seed roles if they don't exist
                const { createDefaultRoles } = await import('@/lib/permissions');
                await createDefaultRoles(tenantId);
                ownerRole = await prisma.userRole.findFirst({
                    where: { tenantId, isDefault: true },
                });
            }

            dbUser = await prisma.user.create({
                data: {
                    clerkUserId: session.userId,
                    email,
                    name,
                    tenantId,
                    roleId: ownerRole?.id,
                },
            });
        }

        return {
            user: {
                id: dbUser.id,
                userId: session.userId,
                tenantId,
                role,
                email,
                name,
            },
            tenantId,
        };
    } catch (error) {
        console.error('Error fetching user:', error);
        return { error: 'Failed to fetch user data', status: 500 };
    }
}

/** Check if a user role is among allowed roles */
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
    return allowedRoles.includes(userRole);
}

/** Helper to create a 401 Unauthorized response */
export function unauthorizedResponse(message: string = 'Unauthorized') {
    return NextResponse.json({ error: message }, { status: 401 });
}

/** Helper to create a 403 Forbidden response */
export function forbiddenResponse(message: string = 'Forbidden') {
    return NextResponse.json({ error: message }, { status: 403 });
}

