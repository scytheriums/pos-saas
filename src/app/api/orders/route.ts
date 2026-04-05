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
        const cursor = searchParams.get('cursor');
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
        const status = searchParams.get('status');
        const paymentMethod = searchParams.get('paymentMethod');
        const search = searchParams.get('search');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

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

        const orders = await prisma.order.findMany({
            where,
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
                paymentEntries: {
                    select: {
                        id: true,
                        method: true,
                        amount: true,
                    }
                },
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
        });

        const hasMore = orders.length > limit;
        const data = hasMore ? orders.slice(0, limit) : orders;
        const nextCursor = hasMore ? data[data.length - 1].id : null;

        return NextResponse.json({
            orders: data,
            nextCursor,
            hasMore,
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
        const { items, total, paymentMethod, cashTendered, change, customerName, customerId, discountId, discountAmount, paymentEntries, shiftId, redeemPoints } = body;

        if (!items || items.length === 0) {
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
        }

        // Validate payment entries if provided
        if (paymentEntries && paymentEntries.length > 0) {
            const entriesTotal = paymentEntries.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
            if (entriesTotal < Number(total)) {
                return NextResponse.json({ error: "Payment entries do not cover the total" }, { status: 400 });
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            // 0. Load tenant loyalty settings
            const tenantSettings = await tx.tenant.findUnique({
                where: { id: tenantId },
                select: { pointsPerCurrency: true, pointRedemptionRate: true, minimumRedeemPoints: true },
            });
            const pointsPerCurrency = Number(tenantSettings?.pointsPerCurrency ?? 0);
            const pointRedemptionRate = Number(tenantSettings?.pointRedemptionRate ?? 0);
            const minimumRedeemPoints = Number(tenantSettings?.minimumRedeemPoints ?? 0);
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
            // Derive legacy fields from paymentEntries when provided
            const primaryMethod = paymentEntries?.length > 0 ? paymentEntries[0].method : paymentMethod;
            const order = await tx.order.create({
                data: {
                    total: new Prisma.Decimal(total),
                    status: "COMPLETED",
                    tenantId,
                    paymentMethod: primaryMethod,
                    cashTendered: cashTendered ? new Prisma.Decimal(cashTendered) : null,
                    change: change ? new Prisma.Decimal(change) : null,
                    customerName: customerName,
                    cashierName: cashierName || "Unknown Cashier",
                    customerId: customerId || null,
                    discountId: discountId || null,
                    discountAmount: discountAmount ? new Prisma.Decimal(discountAmount) : new Prisma.Decimal(0),
                    shiftId: shiftId || null,
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
                    },
                    // Create payment entries (split payments)
                    paymentEntries: paymentEntries?.length > 0 ? {
                        create: paymentEntries.map((e: any) => ({
                            method: e.method,
                            amount: new Prisma.Decimal(e.amount),
                        }))
                    } : {
                        // Legacy single-method — still create an entry for consistency
                        create: [{ method: primaryMethod, amount: new Prisma.Decimal(total) }]
                    }
                },
                include: {
                    items: true,
                    paymentEntries: true,
                }
            });

            // 3. Update Stock (only variants confirmed found in validation step)
            for (const item of items) {
                const variantId = item.variantId || item.id;
                if (!variantDataMap.has(variantId)) continue;
                await tx.productVariant.update({
                    where: { id: variantId },
                    data: {
                        stock: {
                            decrement: Math.floor(Number(item.quantity))
                        }
                    }
                });
            }

            // 4. Loyalty points — redeem and/or award
            let pointsEarned = 0;
            if (customerId) {
                const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId }, select: { points: true } });
                if (customer) {
                    // Redeem points
                    const pointsToRedeem = redeemPoints && pointRedemptionRate > 0 && redeemPoints >= minimumRedeemPoints
                        ? Math.min(Math.floor(redeemPoints), customer.points)
                        : 0;

                    // Award points for this purchase (based on grand total)
                    pointsEarned = pointsPerCurrency > 0 ? Math.floor(Number(total) * pointsPerCurrency) : 0;

                    const pointsDelta = pointsEarned - pointsToRedeem;
                    if (pointsDelta !== 0) {
                        await tx.customer.update({
                            where: { id: customerId },
                            data: { points: { increment: pointsDelta } },
                        });
                    }
                }
            }

            return { order, stockWarnings, pointsEarned };
        }, {
            maxWait: 10000,  // 10s max wait for a connection
            timeout: 30000,  // 30s max for the transaction to complete
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
        if (error instanceof Error) {
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
            console.error("Error cause:", (error as any).code, (error as any).meta);
        }
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: "Failed to create order", details: msg }, { status: 500 });
    }
}
