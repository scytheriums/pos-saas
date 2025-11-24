import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { PermissionAction, PermissionResource } from '@prisma/client';

// GET /api/audit-logs - List audit logs
export async function GET(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { user, tenantId } = authResult;

        // Check permission
        const canView = await hasPermission(user.id, PermissionAction.VIEW, PermissionResource.SETTINGS);
        if (!canView) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const action = searchParams.get('action');
        const resource = searchParams.get('resource');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const where: any = { tenantId };
        if (userId) where.userId = userId;
        if (action) where.action = action;
        if (resource) where.resource = resource;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit,
                skip: offset
            }),
            prisma.auditLog.count({ where })
        ]);

        const page = Math.floor(offset / limit) + 1;
        return NextResponse.json({
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
