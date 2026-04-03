import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createDefaultRoles } from '@/lib/permissions';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { user, tenantId } = authResult;

        // 1. Seed Roles
        await createDefaultRoles(tenantId);

        // 2. Find Owner Role
        const ownerRole = await prisma.userRole.findFirst({
            where: {
                tenantId,
                name: 'Owner'
            }
        });

        if (!ownerRole) {
            return NextResponse.json({ error: 'Failed to create Owner role' }, { status: 500 });
        }

        // 3. Assign Owner Role to current user
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                roleId: ownerRole.id
            },
            include: {
                userRole: true
            }
        });

        return NextResponse.json({
            message: 'Roles seeded and Owner role assigned successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Seed error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
    }
}
