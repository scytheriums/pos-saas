import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { PermissionAction, PermissionResource } from '@prisma/client';

// GET /api/roles - List all roles for tenant
export async function GET(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { user, tenantId } = authResult;

        // Check permission
        const canView = await hasPermission(user.id, PermissionAction.VIEW, PermissionResource.USERS);
        if (!canView) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const roles = await prisma.userRole.findMany({
            where: { tenantId },
            include: {
                permissions: true,
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ roles });
    } catch (error) {
        console.error('Failed to fetch roles:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/roles - Create new role with permissions
export async function POST(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { user, tenantId } = authResult;

        // Check permission
        const canManage = await hasPermission(user.id, PermissionAction.MANAGE, PermissionResource.USERS);
        if (!canManage) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await req.json();
        const { name, description, permissions, isDefault } = body;

        if (!name || !permissions || !Array.isArray(permissions)) {
            return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
        }

        // Check if role name already exists
        const existing = await prisma.userRole.findUnique({
            where: {
                tenantId_name: {
                    tenantId,
                    name
                }
            }
        });

        if (existing) {
            return NextResponse.json({ error: 'Role name already exists' }, { status: 400 });
        }

        const role = await prisma.userRole.create({
            data: {
                name,
                description,
                tenantId,
                isDefault: isDefault || false,
                permissions: {
                    create: permissions.map((p: any) => ({
                        action: p.action,
                        resource: p.resource
                    }))
                }
            },
            include: {
                permissions: true
            }
        });

        // Log audit
        await logAudit({
            userId: user.id,
            tenantId,
            action: 'CREATE',
            resource: 'Role',
            resourceId: role.id,
            details: { name: role.name }
        });

        return NextResponse.json({ role }, { status: 201 });
    } catch (error) {
        console.error('Failed to create role:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
