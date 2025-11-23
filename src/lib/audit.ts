import { prisma } from './prisma';

interface AuditLogParams {
    userId: string;
    tenantId: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
}

/**
 * Create an audit log entry
 */
export async function logAudit(params: AuditLogParams) {
    try {
        await prisma.auditLog.create({
            data: {
                userId: params.userId,
                tenantId: params.tenantId,
                action: params.action,
                resource: params.resource,
                resourceId: params.resourceId,
                details: params.details,
                ipAddress: params.ipAddress,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw - audit logging should not break the main flow
    }
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(
    tenantId: string,
    filters?: {
        userId?: string;
        action?: string;
        resource?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }
) {
    const where: any = { tenantId };

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.resource) where.resource = filters.resource;
    if (filters?.startDate || filters?.endDate) {
        where.timestamp = {};
        if (filters.startDate) where.timestamp.gte = filters.startDate;
        if (filters.endDate) where.timestamp.lte = filters.endDate;
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
                timestamp: 'desc'
            },
            take: filters?.limit || 50,
            skip: filters?.offset || 0
        }),
        prisma.auditLog.count({ where })
    ]);

    return { logs, total };
}
