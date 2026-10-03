import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requirePermission } from "@/lib/auth";
import { logCrudAudit } from "@/lib/audit";

// GET /api/units - The store's units of measure, with how often each is used
export async function GET() {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const units = await prisma.unit.findMany({
            where: { tenantId },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                abbreviation: true,
                _count: { select: { variants: true, baseForProducts: true } },
            },
        });

        return NextResponse.json({
            data: units.map(({ _count, ...u }) => ({ ...u, usageCount: _count.variants + _count.baseForProducts })),
        });
    } catch (error) {
        console.error("Error fetching units:", error);
        return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
    }
}

// POST /api/units - Add a unit
export async function POST(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const denied = await requirePermission(authResult.user, 'EDIT', 'SETTINGS');
        if (denied) return denied;
        const { tenantId } = authResult.user;

        const body = await req.json();
        const name = String(body.name ?? '').trim();
        const abbreviation = String(body.abbreviation ?? '').trim();
        if (!name || !abbreviation) {
            return NextResponse.json({ error: "Name and abbreviation are required" }, { status: 400 });
        }

        const unit = await prisma.unit.create({ data: { name, abbreviation, tenantId } });

        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE",
            resource: "SETTINGS",
            resourceId: unit.id,
            after: { unit: name, abbreviation },
            request: req,
        });

        return NextResponse.json(unit, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({ error: "A unit with this name already exists" }, { status: 409 });
        }
        console.error("Error creating unit:", error);
        return NextResponse.json({ error: "Failed to create unit" }, { status: 500 });
    }
}
