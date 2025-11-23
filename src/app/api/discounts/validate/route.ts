import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// POST /api/discounts/validate - Validate discount code and calculate discount
export async function POST(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const body = await req.json();
        const { code, subtotal } = body;

        if (!code) {
            return NextResponse.json({ error: "Discount code is required" }, { status: 400 });
        }

        if (!subtotal || subtotal <= 0) {
            return NextResponse.json({ error: "Valid subtotal is required" }, { status: 400 });
        }

        // Find discount
        const discount = await prisma.discount.findFirst({
            where: {
                code: {
                    equals: code,
                    mode: 'insensitive'
                },
                tenantId,
                active: true,
            },
        });

        if (!discount) {
            return NextResponse.json({
                valid: false,
                error: "Invalid discount code"
            }, { status: 404 });
        }

        // Check date validity
        const now = new Date();
        if (discount.startDate && now < discount.startDate) {
            return NextResponse.json({
                valid: false,
                error: "Discount not yet active"
            }, { status: 400 });
        }

        if (discount.endDate && now > discount.endDate) {
            return NextResponse.json({
                valid: false,
                error: "Discount has expired"
            }, { status: 400 });
        }

        // Check minimum purchase
        if (discount.minPurchase && subtotal < Number(discount.minPurchase)) {
            return NextResponse.json({
                valid: false,
                error: `Minimum purchase of ${discount.minPurchase} required`
            }, { status: 400 });
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (discount.type === 'PERCENTAGE') {
            discountAmount = (subtotal * Number(discount.value)) / 100;
            // Apply max discount cap if set
            if (discount.maxDiscount && discountAmount > Number(discount.maxDiscount)) {
                discountAmount = Number(discount.maxDiscount);
            }
        } else {
            // FIXED_AMOUNT
            discountAmount = Number(discount.value);
        }

        // Discount cannot exceed subtotal
        discountAmount = Math.min(discountAmount, subtotal);

        return NextResponse.json({
            valid: true,
            discount: {
                id: discount.id,
                name: discount.name,
                type: discount.type,
                value: discount.value,
            },
            discountAmount,
            finalTotal: subtotal - discountAmount,
        });
    } catch (error) {
        console.error("Failed to validate discount:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
