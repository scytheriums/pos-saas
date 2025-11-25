import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// PATCH /api/returns/[id]/reject - Reject a return request
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId, id: userId, name: userName } = authResult.user;

        const body = await req.json();
        const { rejectionReason } = body;

        // Verify return exists and is pending
        const returnRecord = await prisma.return.findFirst({
            where: { id, tenantId }
        });

        if (!returnRecord) {
            return NextResponse.json({ error: "Return not found" }, { status: 404 });
        }

        if (returnRecord.status !== "PENDING") {
            return NextResponse.json({
                error: `Return is already ${returnRecord.status.toLowerCase()}`
            }, { status: 400 });
        }

        // Update return status to rejected
        const updatedReturn = await prisma.return.update({
            where: { id },
            data: {
                status: "REJECTED",
                reasonNote: rejectionReason || returnRecord.reasonNote,
                processedAt: new Date(),
                processedBy: userId,
                processedByName: userName
            }
        });

        // Log audit trail
        await logAudit({
            tenantId,
            userId,
            userName,
            action: "UPDATE",
            resource: "RETURN",
            resourceId: id,
            details: {
                action: "REJECTED",
                rejectionReason: rejectionReason
            },
            request: req
        });

        return NextResponse.json(updatedReturn);
    } catch (error) {
        console.error("Error rejecting return:", error);
        return NextResponse.json({ error: "Failed to reject return" }, { status: 500 });
    }
}
