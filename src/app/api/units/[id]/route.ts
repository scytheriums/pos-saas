import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requirePermission } from "@/lib/auth";
import { logCrudAudit } from "@/lib/audit";

// PATCH /api/units/[id] - Rename a unit
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const denied = await requirePermission(authResult.user, 'EDIT', 'SETTINGS');
        if (denied) return denied;
        const { tenantId } = authResult.user;
        const { id } = await params;

        const existing = await prisma.unit.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json({ error: "Unit not found" }, { status: 404 });
        }

        const body = await req.json();
        const name = body.name !== undefined ? String(body.name).trim() : existing.name;
        const abbreviation = body.abbreviation !== undefined ? String(body.abbreviation).trim() : existing.abbreviation;
        if (!name || !abbreviation) {
            return NextResponse.json({ error: "Name and abbreviation are required" }, { status: 400 });
        }

        const unit = await prisma.unit.update({ where: { id }, data: { name, abbreviation } });

        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE",
            resource: "SETTINGS",
            resourceId: id,
            before: { unit: existing.name, abbreviation: existing.abbreviation },
            after: { unit: name, abbreviation },
            request: req,
        });

        return NextResponse.json(unit);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({ error: "A unit with this name already exists" }, { status: 409 });
        }
        console.error("Error updating unit:", error);
        return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
    }
}

// DELETE /api/units/[id] - Remove a unit that no product uses
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const denied = await requirePermission(authResult.user, 'EDIT', 'SETTINGS');
        if (denied) return denied;
        const { tenantId } = authResult.user;
        const { id } = await params;

        const unit = await prisma.unit.findFirst({
            where: { id, tenantId },
            include: { _count: { select: { variants: true, baseForProducts: true, productUnits: true } } },
        });
        if (!unit) {
            return NextResponse.json({ error: "Unit not found" }, { status: 404 });
        }
        const inUse = unit._count.variants + unit._count.baseForProducts + unit._count.productUnits;
        if (inUse > 0) {
            return NextResponse.json({
                error: `"${unit.name}" is used by ${inUse} product${inUse === 1 ? '' : 's'} or selling unit${inUse === 1 ? '' : 's'}. Change those first.`
            }, { status: 409 });
        }

        await prisma.unit.delete({ where: { id } });

        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE",
            resource: "SETTINGS",
            resourceId: id,
            before: { unit: unit.name, abbreviation: unit.abbreviation },
            request: req,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting unit:", error);
        return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 });
    }
}
