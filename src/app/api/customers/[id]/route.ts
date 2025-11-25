import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { logCrudAudit } from "@/lib/audit";

// GET /api/customers/[id] - Get customer details
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

        const customer = await prisma.customer.findFirst({
            where: {
                id: params.id,
                tenantId,
            },
            include: {
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        total: true,
                        status: true,
                        createdAt: true,
                    }
                },
                _count: {
                    select: { orders: true }
                }
            },
        });

        if (!customer) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        const totalSpent = await prisma.order.aggregate({
            where: {
                customerId: params.id,
                status: 'COMPLETED'
            },
            _sum: { total: true }
        });

        return NextResponse.json({
            customer: {
                ...customer,
                totalSpent: totalSpent._sum.total || 0
            }
        });
    } catch (error) {
        console.error("Failed to fetch customer:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH /api/customers/[id] - Update customer
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
        const { name, phone, email, address, points } = body;

        const customer = await prisma.customer.updateMany({
            where: {
                id: params.id,
                tenantId,
            },
            data: {
                ...(name !== undefined && { name }),
                ...(phone !== undefined && { phone }),
                ...(email !== undefined && { email }),
                ...(address !== undefined && { address }),
                ...(points !== undefined && { points }),
            },
        });

        if (customer.count === 0) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        const updatedCustomer = await prisma.customer.findUnique({
            where: { id: params.id },
        });

        // Log audit trail
        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE",
            resource: "CUSTOMER",
            resourceId: params.id,
            after: { name, phone, email, address, points },
            request: req
        });

        return NextResponse.json({ customer: updatedCustomer });
    } catch (error: any) {
        console.error("Failed to update customer:", error);
        if (error.code === 'P2002' && error.meta?.target?.includes('phone')) {
            return NextResponse.json({ error: "Phone number already exists" }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE /api/customers/[id] - Delete customer
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

        // Verify customer belongs to tenant
        const customerToDelete = await prisma.customer.findFirst({
            where: {
                id: params.id,
                tenantId
            }
        });

        if (!customerToDelete) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        // Check if customer has orders
        const orderCount = await prisma.order.count({
            where: {
                customerId: params.id,
            }
        });

        if (orderCount > 0) {
            return NextResponse.json({
                error: `Cannot delete customer. They have ${orderCount} existing order(s). Please delete the orders first.`
            }, { status: 400 });
        }

        const customer = await prisma.customer.delete({
            where: {
                id: params.id,
            },
        });

        // Log audit trail
        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE",
            resource: "CUSTOMER",
            resourceId: params.id,
            before: { name: customerToDelete.name, phone: customerToDelete.phone, email: customerToDelete.email },
            request: req
        });

        return NextResponse.json({ message: "Customer deleted successfully" });
    } catch (error) {
        console.error("Failed to delete customer:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
