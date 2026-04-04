import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { logCrudAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
    try {
        // Get authenticated user and tenant
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') ?? '1', 10);
        const limit = parseInt(searchParams.get('limit') ?? '20', 10);
        const status = searchParams.get('status'); // PENDING, COMPLETED, REFUNDED, CANCELLED
        const paymentMethod = searchParams.get('paymentMethod');
        const search = searchParams.get('search'); // Search by customer name or order ID
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {
            tenantId,
            ...(status && { status }),
            ...(paymentMethod && { paymentMethod }),
            ...(search && {
                OR: [
                    { id: { contains: search, mode: 'insensitive' } },
                    { customerName: { contains: search, mode: 'insensitive' } },
                ]
            }),
            ...(startDate || endDate ? {
                createdAt: {
                    ...(startDate && { gte: new Date(startDate) }),
                    ...(endDate && { lte: new Date(endDate) }),
                }
            } : {})
        };

        // Fetch orders with pagination
        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where: {
                    tenantId
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    total: true,
                    createdAt: true,
                    status: true,
                    paymentMethod: true,
                    customerName: true,
                    customer: {
                        select: {
                            name: true,
                            email: true,
                            phone: true
                        }
                    },
                    cashierName: true,
                    notes: true,
                    items: {
                        select: {
                            id: true,
                            quantity: true,
                            price: true,
                            variant: {
                                select: {
                                    sku: true,
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
            prisma.order.count({ where: { tenantId } })
        ]);

        return NextResponse.json({
            orders,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        return NextResponse.json({
            error: "Failed to fetch orders",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Get authenticated user and tenant
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId, name: cashierName } = authResult.user;

        const body = await req.json();
        const { items, total, paymentMethod, cashTendered, change, customerName, customerId, discountId, discountAmount } = body;

        if (!items || items.length === 0) {
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Validate Stock Availability and fetch variant data
            const stockWarnings: string[] = [];
            const stockErrors: string[] = [];
            const variantDataMap = new Map<string, { price: number; cost: number }>();

            for (const item of items) {
                const variantId = item.variantId || item.id;
                const variant = await tx.productVariant.findUnique({
                    where: { id: variantId },
                    select: {
                        id: true,
                        stock: true,
                        sku: true,
                        price: true,
                        cost: true,
                        product: {
                            select: {
                                name: true,
                                minStock: true
                            }
                        }
                    }
                });

                if (!variant) {
                    stockErrors.push(`Product variant ${variantId} not found`);
                    continue;
                }

                // Check if sufficient stock
                if (variant.stock < item.quantity) {
                    stockErrors.push(
                        `Insufficient stock for ${variant.product.name} (${variant.sku}). ` +
                        `Available: ${variant.stock}, Requested: ${item.quantity}`
                    );
                }

                // Warn if stock will go below minimum threshold
                const newStock = variant.stock - item.quantity;
                if (newStock < variant.product.minStock && newStock >= 0) {
                    stockWarnings.push(
                        `${variant.product.name} (${variant.sku}) will be low on stock after this order. ` +
                        `New stock: ${newStock}, Minimum: ${variant.product.minStock}`
                    );
                }

                // Store variant data for order creation
                variantDataMap.set(variantId, {
                    price: Number(variant.price),
                    cost: Number(variant.cost)
                });
            }

            // If there are stock errors, abort transaction
            if (stockErrors.length > 0) {
                throw new Error(stockErrors.join('; '));
            }

            // 2. Create Order
            const order = await tx.order.create({
                data: {
                    total: new Prisma.Decimal(total),
                    status: "COMPLETED",
                    tenantId,
                    paymentMethod: paymentMethod,
                    cashTendered: cashTendered ? new Prisma.Decimal(cashTendered) : null,
                    change: change ? new Prisma.Decimal(change) : null,
                    customerName: customerName,
                    cashierName: cashierName || "Unknown Cashier",
                    customerId: customerId || null,
                    discountId: discountId || null,
                    discountAmount: discountAmount ? new Prisma.Decimal(discountAmount) : new Prisma.Decimal(0),
                    items: {
                        create: items.map((item: any) => {
                            const variantId = item.variantId || item.id;
                            const variantData = variantDataMap.get(variantId);
                            return {
                                variantId,
                                quantity: item.quantity,
                                price: new Prisma.Decimal(variantData?.price || item.price),
                                cost: new Prisma.Decimal(variantData?.cost || 0),
                                itemDiscount: new Prisma.Decimal(item.itemDiscount || 0),
                            };
                        })
                    }
                },
                include: {
                    items: true
                }
            });

            // 3. Update Stock
            for (const item of items) {
                const variantId = item.variantId || item.id;
                await tx.productVariant.update({
                    where: { id: variantId },
                    data: {
                        stock: {
                            decrement: item.quantity
                        }
                    }
                });
            }

            return { order, stockWarnings };
        });

        // Log audit trail
        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE",
            resource: "ORDER",
            resourceId: result.order.id,
            after: {
                total: Number(result.order.total),
                itemsCount: result.order.items.length,
                paymentMethod: result.order.paymentMethod
            },
            request: req
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Error creating order:", error);
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }
}
