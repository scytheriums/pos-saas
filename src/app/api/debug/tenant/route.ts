import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const authResult = await getAuthUser();
    if ('error' in authResult) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    return NextResponse.json({
        tenantId: authResult.user.tenantId,
        user: authResult.user
    });
}
