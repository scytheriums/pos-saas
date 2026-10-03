import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, PaymentMethod } from "@prisma/client";
import { calculateOrderTotals, lineDiscount } from "@/lib/order-totals";
import { netPaymentEntries } from "@/lib/shift-cash";
import { loadStockTargets, groupDemand, checkAvailability, takeStock } from "@/lib/stock";
import { getAuthUser, requirePermission } from "@/lib/auth";
import { logCrudAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
    try {
        // Get authenticated user and tenant
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const denied = await requirePermission(authResult.user, 'VIEW', 'ORDERS');
        if (denied) return denied;
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

/** A checkout the server refuses, with a message the cashier can act on. Never 409: offline sync treats 409 as "already synced". */
class CheckoutError extends Error {
    constructor(message: string, public status: number = 422, public extra: Record<string, unknown> = {}) {
        super(message);
    }
}

interface IncomingItem {
    id?: string;
    variantId?: string;
    quantity: number;
    itemDiscount?: number;
}

export async function POST(req: NextRequest) {
    try {
        // Get authenticated user and tenant
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const denied = await requirePermission(authResult.user, 'CREATE', 'ORDERS');
        if (denied) return denied;
        const { tenantId, name: cashierName } = authResult.user;

        const body = await req.json();
        const { items, total, paymentMethod, cashTendered, customerName, customerId, discountId, discountAmount, paymentEntries, shiftId, redeemPoints, offlineClientId, clientLastModifiedAt } = body;

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
        }
        for (const item of items as IncomingItem[]) {
            if (!(item.variantId || item.id) || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
                return NextResponse.json({ error: "Each cart line needs a product and a quantity of at least 1" }, { status: 400 });
            }
        }

        // Server-wins deduplication: if this offline order was already synced, return the existing order
        if (offlineClientId) {
            const existing = await prisma.order.findUnique({
                where: { offlineClientId },
                include: { items: true, paymentEntries: true },
            });
            if (existing && existing.tenantId === tenantId) {
                // Order already on server — if server's lastModifiedAt >= client's, server wins (return as-is)
                const serverMs = existing.lastModifiedAt.getTime();
                const clientMs = clientLastModifiedAt ? Number(clientLastModifiedAt) : 0;
                if (serverMs >= clientMs) {
                    return NextResponse.json({ order: existing, stockWarnings: [], pointsEarned: 0 }, { status: 200 });
                }
                // Client would be newer (unusual for POS) — still server-wins, return existing
                return NextResponse.json({ order: existing, stockWarnings: [], pointsEarned: 0 }, { status: 200 });
            }
        }

        // Offline sales already happened at the till: record what the customer paid, but flag differences
        const isOfflineSync = !!offlineClientId;

        const result = await prisma.$transaction(async (tx) => {
            // 0. Load tenant settings
            const tenantSettings = await tx.tenant.findUnique({
                where: { id: tenantId },
                select: {
                    taxRate: true,
                    pointsPerCurrency: true,
                    pointRedemptionRate: true,
                    minimumRedeemPoints: true,
                    enableStockManagement: true,
                },
            });
            const taxRatePercent = Number(tenantSettings?.taxRate ?? 0);
            const pointsPerCurrency = Number(tenantSettings?.pointsPerCurrency ?? 0);
            const pointRedemptionRate = Number(tenantSettings?.pointRedemptionRate ?? 0);
            const minimumRedeemPoints = Number(tenantSettings?.minimumRedeemPoints ?? 0);
            const stockEnabled = tenantSettings?.enableStockManagement !== false;

            // 1. How many of each variant the cart holds
            const qtyByVariant = new Map<string, number>();
            for (const item of items as IncomingItem[]) {
                const variantId = (item.variantId || item.id)!;
                qtyByVariant.set(variantId, (qtyByVariant.get(variantId) ?? 0) + Number(item.quantity));
            }

            // Variants of this tenant only; pooled products' lines add up per pool (1 tray + 5 pcs = 35 pcs)
            const targets = await loadStockTargets(tx, [...qtyByVariant.keys()], tenantId);
            if (targets.size !== qtyByVariant.size) {
                throw new CheckoutError("One of the products in the cart no longer exists. Remove it and try again.");
            }
            const demands = groupDemand(targets, qtyByVariant);
            const { errors: stockErrors, warnings: stockWarnings } = stockEnabled
                ? checkAvailability(demands)
                : { errors: [] as string[], warnings: [] as string[] };

            const variantDataMap = new Map([...targets].map(([id, t]) => [id, { price: t.price, cost: t.cost }]));

            if (stockErrors.length > 0) {
                if (!isOfflineSync) {
                    throw new CheckoutError(`Not enough stock: ${stockErrors.join('; ')}`);
                }
                // The goods already left the shop: record the sale and flag that stock was off
                stockWarnings.push(`Sold offline with too little stock recorded: ${stockErrors.join('; ')}`);
            }

            // 2. Customer, discount, points and shift must all belong to this tenant and still be valid
            let customer: { id: string; points: number } | null = null;
            if (customerId) {
                customer = await tx.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true, points: true } });
                if (!customer) throw new CheckoutError("The selected customer was not found");
            }

            let discount: { id: string; name: string; type: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number; maxDiscount: number | null; minPurchase: number | null } | null = null;
            if (discountId) {
                const d = await tx.discount.findFirst({ where: { id: discountId, tenantId } });
                const now = new Date();
                if (!d || (!isOfflineSync && (!d.active || (d.startDate && now < d.startDate) || (d.endDate && now > d.endDate)))) {
                    throw new CheckoutError("The applied discount is no longer valid. Remove it and try again.");
                }
                discount = {
                    id: d.id,
                    name: d.name,
                    type: d.type,
                    value: Number(d.value),
                    maxDiscount: d.maxDiscount !== null ? Number(d.maxDiscount) : null,
                    minPurchase: d.minPurchase !== null ? Number(d.minPurchase) : null,
                };
            }

            const pointsRequested = Math.max(0, Math.floor(Number(redeemPoints) || 0));
            if (pointsRequested > 0) {
                if (!customer) throw new CheckoutError("Select a customer to redeem points");
                if (pointRedemptionRate <= 0) throw new CheckoutError("Points redemption is turned off");
                if (pointsRequested < minimumRedeemPoints) throw new CheckoutError(`At least ${minimumRedeemPoints} points are needed to redeem`);
                if (pointsRequested > customer.points) throw new CheckoutError(`The customer only has ${customer.points} points`);
            }

            if (shiftId) {
                const shift = await tx.shift.findFirst({ where: { id: shiftId, tenantId }, select: { status: true } });
                if (!shift) throw new CheckoutError("The shift for this sale was not found");
                if (!isOfflineSync && shift.status !== 'OPEN') {
                    throw new CheckoutError("This shift has been closed. Open a new shift to keep selling.");
                }
            }

            // 3. Totals from database prices and settings — never from the request
            const lines = (items as IncomingItem[]).map(item => {
                const variantId = (item.variantId || item.id)!;
                return {
                    variantId,
                    price: variantDataMap.get(variantId)!.price,
                    cost: variantDataMap.get(variantId)!.cost,
                    quantity: Number(item.quantity),
                    itemDiscount: Math.max(0, Number(item.itemDiscount) || 0),
                };
            });
            const totals = calculateOrderTotals({
                lines,
                taxRatePercent,
                discount,
                pointsRedeemed: pointsRequested,
                pointRedemptionRate,
            });

            if (discount && discount.minPurchase && totals.subtotal < discount.minPurchase && !isOfflineSync) {
                throw new CheckoutError(`"${discount.name}" needs a minimum purchase of ${discount.minPurchase}`);
            }

            const clientTotal = Number(total);
            const totalMismatch = Math.abs(totals.total - clientTotal) > 0.01;
            if (totalMismatch && !isOfflineSync) {
                throw new CheckoutError(
                    "The total on screen is out of date (a price or discount changed). Refresh the POS and try again.",
                    422,
                    { expectedTotal: totals.total, receivedTotal: clientTotal }
                );
            }
            // Offline: keep what was actually charged; online: the two are equal
            const recordedTotal = isOfflineSync ? clientTotal : totals.total;

            // 4. Payments must cover the total; cash handed over beyond it is change, not income
            const givenEntries: { method: PaymentMethod; amount: number }[] = Array.isArray(paymentEntries) && paymentEntries.length > 0
                ? paymentEntries.map((e: { method: PaymentMethod; amount: number }) => ({ method: e.method, amount: Number(e.amount) }))
                : [{ method: (paymentMethod as PaymentMethod) || "CASH", amount: Number(cashTendered) || recordedTotal }];
            const amountGiven = givenEntries.reduce((sum, e) => sum + e.amount, 0);
            if (amountGiven + 0.005 < recordedTotal) {
                throw new CheckoutError("Payments don't cover the total");
            }
            const keptEntries = netPaymentEntries(givenEntries, recordedTotal);
            if (!keptEntries) {
                throw new CheckoutError("Only cash can be overpaid. Card, e-wallet and transfer amounts can't be more than what's due.");
            }
            const cashGiven = givenEntries.filter(e => e.method === 'CASH').reduce((sum, e) => sum + e.amount, 0);
            const changeGiven = Math.max(0, Math.round((amountGiven - recordedTotal) * 100) / 100);

            // 5. Create Order
            const primaryMethod = givenEntries[0].method;
            const pointsEarned = customer && pointsPerCurrency > 0 ? Math.floor(recordedTotal * pointsPerCurrency) : 0;
            const recordedDiscount = isOfflineSync ? Number(discountAmount) || 0 : totals.discountAmount;

            const order = await tx.order.create({
                data: {
                    total: new Prisma.Decimal(recordedTotal),
                    subtotal: new Prisma.Decimal(totals.subtotal),
                    taxAmount: new Prisma.Decimal(totals.tax),
                    status: "COMPLETED",
                    tenantId,
                    paymentMethod: primaryMethod,
                    cashTendered: cashGiven > 0 ? new Prisma.Decimal(cashGiven) : null,
                    change: changeGiven > 0 ? new Prisma.Decimal(changeGiven) : null,
                    customerName: customerName,
                    cashierName: cashierName || "Unknown Cashier",
                    customerId: customer?.id ?? null,
                    discountId: discount?.id ?? null,
                    discountAmount: new Prisma.Decimal(recordedDiscount),
                    pointsRedeemed: totals.pointsUsed,
                    pointsDiscount: new Prisma.Decimal(totals.pointsDiscount),
                    pointsEarned,
                    shiftId: shiftId || null,
                    offlineClientId: offlineClientId || null,
                    items: {
                        create: lines.map(line => ({
                            variantId: line.variantId,
                            quantity: line.quantity,
                            price: new Prisma.Decimal(line.price),
                            cost: new Prisma.Decimal(line.cost),
                            itemDiscount: new Prisma.Decimal(lineDiscount(line)),
                        }))
                    },
                    // Amount kept per method (cash net of change)
                    paymentEntries: {
                        create: keptEntries.map(e => ({
                            method: e.method,
                            amount: new Prisma.Decimal(e.amount),
                        }))
                    }
                },
                include: {
                    items: true,
                    paymentEntries: true,
                }
            });

            // 6. Update Stock (only when stock management is enabled). Atomic per stock place, so a sale at
            // another till that took the stock since the check above makes this one fail instead of overselling.
            if (stockEnabled) {
                const taken = await takeStock(tx, demands, { allowNegative: isOfflineSync });
                if (!taken) {
                    throw new CheckoutError("Another sale just took the last of an item in this cart. Check stock and try again.");
                }
            }

            // 7. Loyalty points — redeem and award
            const pointsDelta = pointsEarned - totals.pointsUsed;
            if (customer && pointsDelta !== 0) {
                await tx.customer.update({
                    where: { id: customer.id },
                    data: { points: { increment: pointsDelta } },
                });
            }

            return {
                order,
                stockWarnings,
                pointsEarned,
                totalMismatch: totalMismatch ? { expectedTotal: totals.total, recordedTotal } : null,
            };
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
                paymentMethod: result.order.paymentMethod,
                // An offline sale whose total differs from current prices/discounts — worth reviewing
                ...(result.totalMismatch ? { offlineTotalMismatch: result.totalMismatch } : {}),
            },
            request: req
        });

        return NextResponse.json(
            { order: result.order, stockWarnings: result.stockWarnings, pointsEarned: result.pointsEarned },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof CheckoutError) {
            return NextResponse.json({ error: error.message, ...error.extra }, { status: error.status });
        }
        console.error("Error creating order:", error);
        return NextResponse.json({ error: "Checkout failed because of a server error. Try again." }, { status: 500 });
    }
}
