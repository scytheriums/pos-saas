import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

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
            language, currency, timezone, dateFormat, timeFormat
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
            }
        });

        return NextResponse.json(updatedTenant);
    } catch (error) {
        console.error("Error updating tenant settings:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
