import { auth } from '@/lib/better-auth';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export type UserRole = 'owner' | 'manager' | 'cashier';

export interface AuthUser {
    id: string;        // Database User ID (same as Better Auth user ID)
    userId: string;    // Same as id — kept for compatibility
    tenantId: string;
    role: UserRole;
    email: string;
    name: string;
}

/**
 * Get authenticated user with tenant context.
 * Creates a DB user record if one doesn't exist yet.
 */
export async function getAuthUser():
    Promise<{ user: AuthUser; tenantId: string } | { error: string; status: number }> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return { error: 'Unauthorized', status: 401 };
    }

    const sessionUser = session.user as {
        id: string;
        email: string;
        name: string;
        tenantId?: string | null;
        role?: string | null;
    };

    const tenantId = sessionUser.tenantId;
    const role = sessionUser.role as UserRole | null;

    if (!tenantId) {
        return { error: 'No tenant assigned. Please complete onboarding.', status: 403 };
    }
    if (!role) {
        return { error: 'No role assigned', status: 403 };
    }

    try {
        const { prisma } = await import('@/lib/prisma');

        let dbUser = await prisma.user.findUnique({
            where: { id: sessionUser.id },
        });

        if (!dbUser) {
            let ownerRole = await prisma.userRole.findFirst({
                where: { tenantId, isDefault: true },
            });

            if (!ownerRole) {
                const { createDefaultRoles } = await import('@/lib/permissions');
                await createDefaultRoles(tenantId);
                ownerRole = await prisma.userRole.findFirst({
                    where: { tenantId, isDefault: true },
                });
            }

            dbUser = await prisma.user.create({
                data: {
                    id: sessionUser.id,
                    email: sessionUser.email,
                    name: sessionUser.name || sessionUser.email,
                    tenantId,
                    role,
                    roleId: ownerRole?.id,
                },
            });
        }

        return {
            user: {
                id: dbUser.id,
                userId: dbUser.id,
                tenantId,
                role,
                email: dbUser.email,
                name: dbUser.name || dbUser.email,
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


