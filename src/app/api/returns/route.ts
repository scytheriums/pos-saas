import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { logCrudAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

// GET /api/returns - List all returns with pagination and filters
export async function GET(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') ?? '1', 10);
        const limit = parseInt(searchParams.get('limit') ?? '20', 10);
        const status = searchParams.get('status');
        const orderId = searchParams.get('orderId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const skip = (page - 1) * limit;

        const where: Prisma.ReturnWhereInput = {
            tenantId,
            ...(status && { status: status as any }),
            ...(orderId && { orderId }),
            ...(startDate || endDate ? {
                createdAt: {
                    ...(startDate && { gte: new Date(startDate) }),
                    ...(endDate && { lte: new Date(endDate) }),
                }
            } : {})
        };

        const [returns, total] = await Promise.all([
            prisma.return.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    order: {
                        select: {
                            id: true,
                            total: true,
                            customerName: true,
                            createdAt: true
                        }
                    },
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true
                        }
                    },
                    items: {
                        include: {
                            variant: {
                                include: {
                                    product: {
                                        select: {
                                            name: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.return.count({ where })
        ]);

        return NextResponse.json({
            returns,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching returns:", error);
        return NextResponse.json({ error: "Failed to fetch returns" }, { status: 500 });
    }
}

// POST /api/returns - Create a new return
export async function POST(req: NextRequest) {
    try {
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId, id: userId, name: userName } = authResult.user;

        const body = await req.json();
        const { orderId, items, reason, reasonNote, refundMethod } = body;

        if (!orderId || !items || items.length === 0 || !reason || !refundMethod) {
            return NextResponse.json({
                error: "Order ID, items, reason, and refund method are required"
            }, { status: 400 });
        }

        // Verify order exists and belongs to tenant
        const order = await prisma.order.findFirst({
            where: { id: orderId, tenantId },
            include: {
                items: true,
                customer: true
            }
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Calculate total refund amount
        const totalRefundAmount = items.reduce((sum: number, item: any) =>
            sum + Number(item.refundAmount), 0
        );

        // Create return with items in a transaction
        const returnRecord = await prisma.$transaction(async (tx) => {
            const newReturn = await tx.return.create({
                data: {
                    tenantId,
                    orderId,
                    customerId: order.customerId,
                    reason,
                    reasonNote,
                    refundMethod,
                    refundAmount: new Prisma.Decimal(totalRefundAmount),
                    status: "PENDING",
                    processedBy: userId,
                    processedByName: userName,
                    items: {
                        create: items.map((item: any) => ({
                            orderItemId: item.orderItemId,
                            variantId: item.variantId,
                            quantity: item.quantity,
                            price: new Prisma.Decimal(item.price),
                            refundAmount: new Prisma.Decimal(item.refundAmount)
                        }))
                    }
                },
                include: {
                    items: {
                        include: {
                            variant: {
                                include: {
                                    product: true
                                }
                            }
                        }
                    },
                    order: true,
                    customer: true
                }
            });

            return newReturn;
        });

        // Log audit trail
        await logCrudAudit({
            tenantId,
            userId,
            userName,
            action: "CREATE",
            resource: "RETURN",
            resourceId: returnRecord.id,
            after: {
                orderId: returnRecord.orderId,
                reason: returnRecord.reason,
                refundAmount: Number(returnRecord.refundAmount),
                itemsCount: returnRecord.items.length
            },
            request: req
        });

        return NextResponse.json(returnRecord, { status: 201 });
    } catch (error) {
        console.error("Error creating return:", error);
        return NextResponse.json({ error: "Failed to create return" }, { status: 500 });
    }
}
