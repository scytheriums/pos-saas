import { NextResponse } from "next/server";
import { PermissionAction, PermissionResource } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// GET /api/me/permissions - What the signed-in user may do, as "ACTION:RESOURCE" strings (for hiding UI)
export async function GET() {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { user } = authResult;

        const granted: string[] = [];
        for (const resource of Object.values(PermissionResource)) {
            for (const action of Object.values(PermissionAction)) {
                if (action === PermissionAction.MANAGE) continue;
                if (await hasPermission(user.id, action, resource)) granted.push(`${action}:${resource}`);
            }
        }

        return NextResponse.json({ role: user.role, permissions: granted });
    } catch (error) {
        console.error("Error fetching permissions:", error);
        return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
    }
}
