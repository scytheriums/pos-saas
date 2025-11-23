import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET /api/discounts/[id]
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
        const { tenantId } = authResult.user;

        const discount = await prisma.discount.findFirst({
            where: {
                id: params.id,
                tenantId,
            },
            include: {
                _count: {
                    select: { orders: true }
                }
            }
        });

        if (!discount) {
            return NextResponse.json({ error: "Discount not found" }, { status: 404 });
        }

        return NextResponse.json({ discount });
    } catch (error) {
        console.error("Failed to fetch discount:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH /api/discounts/[id]
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
        const { tenantId } = authResult.user;

        const body = await req.json();
        const { name, code, type, value, minPurchase, maxDiscount, startDate, endDate, active } = body;

        if (type === 'PERCENTAGE' && value && (value < 0 || value > 100)) {
            return NextResponse.json({ error: "Percentage must be between 0 and 100" }, { status: 400 });
        }

        const discount = await prisma.discount.updateMany({
            where: {
                id: params.id,
                tenantId,
            },
            data: {
                ...(name !== undefined && { name }),
                ...(code !== undefined && { code: code || null }),
                ...(type !== undefined && { type }),
                ...(value !== undefined && { value }),
                ...(minPurchase !== undefined && { minPurchase: minPurchase || null }),
                ...(maxDiscount !== undefined && { maxDiscount: maxDiscount || null }),
                ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(active !== undefined && { active }),
            },
        });

        if (discount.count === 0) {
            return NextResponse.json({ error: "Discount not found" }, { status: 404 });
        }

        const updatedDiscount = await prisma.discount.findUnique({
            where: { id: params.id },
        });

        return NextResponse.json({ discount: updatedDiscount });
    } catch (error: any) {
        console.error("Failed to update discount:", error);
        if (error.code === 'P2002' && error.meta?.target?.includes('code')) {
            return NextResponse.json({ error: "Discount code already exists" }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE /api/discounts/[id]
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
        const { tenantId } = authResult.user;

        const discount = await prisma.discount.deleteMany({
            where: {
                id: params.id,
                tenantId,
            },
        });

        if (discount.count === 0) {
            return NextResponse.json({ error: "Discount not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Discount deleted successfully" });
    } catch (error) {
        console.error("Failed to delete discount:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
