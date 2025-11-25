import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { logCrudAudit, logAudit } from "@/lib/audit";

// GET /api/returns/[id] - Get return details
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const returnRecord = await prisma.return.findFirst({
            where: { id, tenantId },
            include: {
                order: {
                    include: {
                        items: {
                            include: {
                                variant: {
                                    include: {
                                        product: true
                                    }
                                }
                            }
                        }
                    }
                },
                customer: true,
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true,
                                optionValues: {
                                    include: {
                                        option: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!returnRecord) {
            return NextResponse.json({ error: "Return not found" }, { status: 404 });
        }

        return NextResponse.json(returnRecord);
    } catch (error) {
        console.error("Error fetching return:", error);
        return NextResponse.json({ error: "Failed to fetch return" }, { status: 500 });
    }
}
