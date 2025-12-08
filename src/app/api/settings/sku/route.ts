import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { isValidSKUFormat, previewSKU } from '@/lib/sku-generator';

// GET - Fetch SKU settings
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
                autoGenerateSku: true,
                skuFormat: true,
                skuPrefix: true,
                skuCounter: true,
                name: true
            }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        // Generate preview
        const preview = previewSKU({
            businessName: tenant.name,
            counter: tenant.skuCounter,
            format: tenant.skuFormat,
            prefix: tenant.skuPrefix || undefined
        });

        return NextResponse.json({
            ...tenant,
            preview
        });
    } catch (error) {
        console.error('Error fetching SKU settings:', error);
        return NextResponse.json({ error: 'Failed to fetch SKU settings' }, { status: 500 });
    }
}

// PATCH - Update SKU settings
export async function PATCH(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId, role } = authResult.user;

        // Only Owner or Manager can update settings
        if (role !== 'owner' && role !== 'manager') {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await req.json();
        const { autoGenerateSku, skuFormat, skuPrefix } = body;

        // Validate format if provided
        if (skuFormat && !isValidSKUFormat(skuFormat)) {
            return NextResponse.json({
                error: 'Invalid SKU format. Use placeholders: {BUSINESS}, {DATE}, {COUNTER}, {RANDOM}, {PRODUCT}'
            }, { status: 400 });
        }

        const updated = await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                autoGenerateSku: autoGenerateSku !== undefined ? autoGenerateSku : undefined,
                skuFormat: skuFormat || undefined,
                skuPrefix: skuPrefix !== undefined ? skuPrefix : undefined
            },
            select: {
                autoGenerateSku: true,
                skuFormat: true,
                skuPrefix: true,
                skuCounter: true,
                name: true
            }
        });

        // Generate preview
        const preview = previewSKU({
            businessName: updated.name,
            counter: updated.skuCounter,
            format: updated.skuFormat,
            prefix: updated.skuPrefix || undefined
        });

        // Log audit trail
        await logAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: 'SETTINGS_CHANGE',
            resource: 'SETTINGS',
            details: {
                section: 'SKU Auto-Generation',
                changes: body
            },
            request: req
        });

        return NextResponse.json({
            ...updated,
            preview
        });
    } catch (error) {
        console.error('Error updating SKU settings:', error);
        return NextResponse.json({ error: 'Failed to update SKU settings' }, { status: 500 });
    }
}
