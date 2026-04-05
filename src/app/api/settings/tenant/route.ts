import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        // If user doesn't have a tenant yet (during onboarding), return 404
        if (!tenantId) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                name: true,
                address: true,
                phone: true,
                email: true,
                website: true,
                taxId: true,
                taxRate: true,
                receiptHeader: true,
                receiptFooter: true,
                showLogo: true,
                logoUrl: true,
                // POS Settings
                autoPrintReceipt: true,
                soundEffects: true,
                barcodeScanner: true,
                // Localization Settings
                language: true,
                currency: true,
                timezone: true,
                dateFormat: true,
                timeFormat: true,
                // Loyalty Settings
                pointsPerCurrency: true,
                pointRedemptionRate: true,
                minimumRedeemPoints: true,
            }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        return NextResponse.json(tenant);
    } catch (error) {
        console.error("Error fetching tenant settings:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId, role } = authResult.user;

        // Only Owner or Manager can update settings (or check specific permission if implemented)
        if (role !== 'owner' && role !== 'manager') {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const body = await req.json();
        const {
            name, address, phone, email, website,
            taxId, taxRate,
            receiptHeader, receiptFooter, showLogo, logoUrl,
            // POS Settings
            autoPrintReceipt, soundEffects, barcodeScanner,
            // Localization Settings
            language, currency, timezone, dateFormat, timeFormat,
            // Loyalty Settings
            pointsPerCurrency, pointRedemptionRate, minimumRedeemPoints,
        } = body;

        const updatedTenant = await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                name,
                address,
                phone,
                email,
                website,
                taxId,
                taxRate: taxRate !== undefined ? Number(taxRate) : undefined,
                receiptHeader,
                receiptFooter,
                showLogo,
                logoUrl,
                // POS Settings
                autoPrintReceipt,
                soundEffects,
                barcodeScanner,
                // Localization Settings
                language,
                currency,
                timezone,
                dateFormat,
                timeFormat,
                // Loyalty Settings
                pointsPerCurrency: pointsPerCurrency !== undefined ? Number(pointsPerCurrency) : undefined,
                pointRedemptionRate: pointRedemptionRate !== undefined ? Number(pointRedemptionRate) : undefined,
                minimumRedeemPoints: minimumRedeemPoints !== undefined ? Number(minimumRedeemPoints) : undefined,
            }
        });

        // Log audit trail
        await logAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "SETTINGS_CHANGE",
            resource: "SETTINGS",
            details: {
                updatedFields: Object.keys(body)
            },
            request: req
        });

        return NextResponse.json(updatedTenant);
    } catch (error) {
        console.error("Error updating tenant settings:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
