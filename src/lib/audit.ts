import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export interface AuditLogParams {
    tenantId: string;
    userId: string;
    userName: string;
    action: AuditAction;
    resource: AuditResource;
    resourceId?: string;
    details?: Record<string, any>;
    request?: NextRequest;
}

// Audit Actions
export type AuditAction =
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "VIEW"
    | "LOGIN"
    | "LOGOUT"
    | "EXPORT"
    | "SETTINGS_CHANGE"
    | "STOCK_ADJUSTMENT"
    | "PERMISSION_CHANGE";

// Audit Resources
export type AuditResource =
    | "PRODUCT"
    | "CATEGORY"
    | "ORDER"
    | "USER"
    | "CUSTOMER"
    | "DISCOUNT"
    | "SETTINGS"
    | "ROLE"
    | "RETURN"
    | "STOCK_ADJUSTMENT"
    | "SUPPLIER"
    | "PURCHASE_ORDER";

/**
 * Log an audit event
 * This function is designed to never throw errors to avoid breaking main operations
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
    try {
        const {
            tenantId,
            userId,
            userName,
            action,
            resource,
            resourceId,
            details,
            request
        } = params;

        // Extract IP address and user agent from request if provided
        let ipAddress: string | undefined;
        let userAgent: string | undefined;

        if (request) {
            // Get IP from various headers (considering proxies)
            ipAddress =
                request.headers.get("x-forwarded-for")?.split(",")[0] ||
                request.headers.get("x-real-ip") ||
                undefined;

            userAgent = request.headers.get("user-agent") || undefined;
        }

        // Create audit log entry
        await prisma.auditLog.create({
            data: {
                tenantId,
                userId,
                userName,
                action,
                resource,
                resourceId,
                details: details || {},
                ipAddress,
                userAgent
            }
        });
    } catch (error) {
        // Log error but don't throw - we don't want audit logging to break main operations
        console.error("Failed to create audit log:", error);
    }
}

/**
 * Helper to create audit log for CRUD operations with before/after values
 */
export async function logCrudAudit(params: {
    tenantId: string;
    userId: string;
    userName: string;
    action: "CREATE" | "UPDATE" | "DELETE";
    resource: AuditResource;
    resourceId?: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
    request?: NextRequest;
}): Promise<void> {
    const { before, after, ...baseParams } = params;

    const details: Record<string, any> = {};
    if (before) details.before = before;
    if (after) details.after = after;

    // For UPDATE, calculate what changed
    if (params.action === "UPDATE" && before && after) {
        const changes: Record<string, { from: any; to: any }> = {};

        for (const key in after) {
            if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
                changes[key] = {
                    from: before[key],
                    to: after[key]
                };
            }
        }

        details.changes = changes;
    }

    await logAudit({
        ...baseParams,
        details
    });
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
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
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
            take: filters?.limit || 50,
            skip: filters?.offset || 0
        }),
        prisma.auditLog.count({ where })
    ]);

    return { logs, total };
}
