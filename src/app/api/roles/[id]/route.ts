import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { PermissionAction, PermissionResource } from '@prisma/client';

// GET /api/roles/[id] - Get role details
export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
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

        const role = await prisma.userRole.findFirst({
            where: {
                id: params.id,
                tenantId
            },
            include: {
                permissions: true,
                _count: {
                    select: { users: true }
                }
            }
        });

        if (!role) {
            return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        }

        return NextResponse.json({ role });
    } catch (error) {
        console.error('Failed to fetch role:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH /api/roles/[id] - Update role
export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
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

        // Delete existing permissions and create new ones
        if (permissions) {
            await prisma.permission.deleteMany({
                where: { roleId: params.id }
            });
        }

        const role = await prisma.userRole.update({
            where: {
                id: params.id
            },
            data: {
                name,
                description,
                isDefault,
                ...(permissions && {
                    permissions: {
                        create: permissions.map((p: any) => ({
                            action: p.action,
                            resource: p.resource
                        }))
                    }
                })
            },
            include: {
                permissions: true
            }
        });

        // Log audit
        await logAudit({
            userId: user.id,
            tenantId,
            action: 'UPDATE',
            resource: 'Role',
            resourceId: role.id,
            details: { name: role.name }
        });

        return NextResponse.json({ role });
    } catch (error) {
        console.error('Failed to update role:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /api/roles/[id] - Delete role
export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
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
        const { id } = params;
        // Verify role belongs to tenant
        const roleToDelete = await prisma.userRole.findFirst({
            where: {
                id,
                tenantId
            }
        });

        if (!roleToDelete) {
            return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        }

        // Check if role has users
        const userCount = await prisma.user.count({
            where: { roleId: id }
        });

        if (userCount > 0) {
            return NextResponse.json({
                error: `Cannot delete role. It is currently assigned to ${userCount} user(s). Please reassign them first.`
            }, { status: 400 });
        }

        const role = await prisma.userRole.delete({
            where: { id: id }
        });

        // Log audit
        await logAudit({
            userId: user.id,
            tenantId,
            action: 'DELETE',
            resource: 'Role',
            resourceId: role.id,
            details: { name: role.name }
        });

        return NextResponse.json({ message: 'Role deleted successfully' });
    } catch (error) {
        console.error('Failed to delete role:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
