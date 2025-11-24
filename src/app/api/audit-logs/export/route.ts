import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionAction, PermissionResource } from "@prisma/client";
import { getAuditLogs } from "@/lib/audit";
import { format } from "date-fns";

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

        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId') || undefined;
        const action = searchParams.get('action') || undefined;
        const resource = searchParams.get('resource') || undefined;
        const startDate = searchParams.get('startDate')
            ? new Date(searchParams.get('startDate')!)
            : undefined;
        const endDate = searchParams.get('endDate')
            ? new Date(searchParams.get('endDate')!)
            : undefined;

        // Fetch all audit logs (no pagination for export)
        const { logs } = await getAuditLogs(tenantId, {
            userId,
            action,
            resource,
            startDate,
            endDate,
            limit: 10000 // Max export limit
        });

        // Convert to CSV
        const headers = ['Date', 'User', 'Action', 'Resource', 'Resource ID', 'IP Address', 'Details'];
        const csvRows = [headers.join(',')];

        for (const log of logs) {
            const row = [
                format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
                `"${log.userName}"`,
                log.action,
                log.resource,
                log.resourceId || '',
                log.ipAddress || '',
                `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        }

        const csv = csvRows.join('\n');
        const filename = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (error) {
        console.error("Error exporting audit logs:", error);
        return NextResponse.json({ error: "Failed to export audit logs" }, { status: 500 });
    }
}
