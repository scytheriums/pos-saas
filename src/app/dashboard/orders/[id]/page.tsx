'use client';

import { useState, useEffect } from 'react';
import { useTenantSettings } from '@/contexts/SettingsContext';
import { formatCurrencyWithSettings, formatDateTimeWithSettings } from '@/lib/format';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import Link from 'next/link';

import { ReceiptTemplate } from '@/components/pos/ReceiptTemplate';
import { useRef } from 'react';

interface OrderDetails {
    id: string;
    total: number;
    status: string;
    paymentMethod: string | null;
    customerName: string | null;
    customer?: {
        name: string;
        email?: string;
        phone?: string;
    } | null;
    cashierName: string | null;
    notes: string | null;
    createdAt: string;
    discountAmount: number | null;
    discount?: {
        name: string;
    };
    items: {
        id: string;
        quantity: number;
        price: number;
        itemDiscount: number;
        variant: {
            sku: string;
            product: {
                name: string;
            };
            optionValues: { value: string }[];
        };
    }[];
}

export default function OrderDetailsPage() {
    const settings = useTenantSettings();
    const params = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [tenant, setTenant] = useState<any>(null);
    const receiptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (params.id) {
            fetchOrder(params.id as string);
        }
        fetchTenant();
    }, [params.id]);

    const fetchTenant = async () => {
        try {
            const res = await fetch('/api/tenant/me');
            if (res.ok) {
                const data = await res.json();
                setTenant(data);
            }
        } catch (error) {
            console.error("Failed to fetch tenant details", error);
        }
    };

    const fetchOrder = async (id: string) => {
        try {
            const res = await fetch(`/api/orders/${id}`);
            if (res.ok) {
                const data = await res.json();
                console.log(data)
                setOrder(data);
            } else {
                console.error('Order not found');
            }
        } catch (error) {
            console.error('Error fetching order:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };



    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            PENDING: 'outline',
            COMPLETED: 'default',
            REFUNDED: 'secondary',
            CANCELLED: 'destructive',
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    };

    const getPaymentLabel = (method: string | null) => {
        if (!method) return '-';
        const labels: Record<string, string> = {
            CASH: 'Cash',
            CARD: 'Card',
            E_WALLET: 'E-Wallet',
            BANK_TRANSFER: 'Bank Transfer',
        };
        return labels[method] || method;
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Loading order details...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <p className="text-muted-foreground">Order not found</p>
                    <Link href="/dashboard/orders">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Orders
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Calculate subtotal and tax for receipt
    const subtotal = order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity - Number(item.itemDiscount || 0), 0);
    const taxRate = (tenant?.taxRate ?? 0) / 100;
    const tax = subtotal * taxRate;

    return (
        <>
            <div className="print:hidden p-3 md:p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/orders">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">Order Details</h1>
                            <p className="text-muted-foreground">Order ID: {order.id}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handlePrint} size="sm">
                            <Printer className="h-4 w-4" />
                            <span className="hidden sm:inline ml-2">Reprint Receipt</span>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {/* Order Information */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Order Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    <div className="mt-1">{getStatusBadge(order.status)}</div>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Payment Method</p>
                                    <p className="mt-1 font-medium">{getPaymentLabel(order.paymentMethod)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Customer</p>
                                    <p className="mt-1 font-medium">
                                        {order.customer?.name || order.customerName || <span className="text-muted-foreground">Walk-in</span>}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Cashier</p>
                                    <p className="mt-1 font-medium">
                                        {order.cashierName || <span className="text-muted-foreground">-</span>}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-muted-foreground">Date</p>
                                    <p className="mt-1 font-medium">{formatDateTimeWithSettings(order.createdAt, settings)}</p>
                                </div>
                                {order.notes && (
                                    <div className="col-span-2">
                                        <p className="text-sm text-muted-foreground">Notes</p>
                                        <p className="mt-1">{order.notes}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Order Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Items</span>
                                <span>{order.items.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>{formatCurrencyWithSettings(subtotal, settings)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tax (11%)</span>
                                <span>{formatCurrencyWithSettings(tax, settings)}</span>
                            </div>
                            {order.discountAmount && Number(order.discountAmount) > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span className="text-muted-foreground">Discount</span>
                                    <span>-{formatCurrencyWithSettings(Number(order.discountAmount), settings)}</span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>{formatCurrencyWithSettings(Number(order.total), settings)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Order Items */}
                <Card>
                    <CardHeader>
                        <CardTitle>Order Items</CardTitle>
                        <CardDescription>{order.items.length} items in this order</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {order.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div className="flex-1">
                                        <p className="font-medium">{item.variant.product.name}</p>
                                        <p className="text-sm text-muted-foreground">SKU: {item.variant.sku}</p>
                                        {item.variant.optionValues.length > 0 && (
                                            <p className="text-sm text-muted-foreground">{item.variant.optionValues.map(ov => ov.value).join(' / ')}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">{formatCurrencyWithSettings(Number(item.price), settings)}</p>
                                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                        {Number(item.itemDiscount || 0) > 0 && (
                                            <p className="text-sm text-green-600">-{formatCurrencyWithSettings(Number(item.itemDiscount), settings)}</p>
                                        )}
                                    </div>
                                    <div className="ml-4 text-right min-w-20">
                                        <p className="font-bold">{formatCurrencyWithSettings(Number(item.price) * item.quantity - Number(item.itemDiscount || 0), settings)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Hidden Receipt Template */}
            <ReceiptTemplate
                ref={receiptRef}
                storeName={tenant?.name || "Awan POS"}
                storeAddress={tenant?.address || "123 Tech Street, Jakarta"}
                storePhone={tenant?.phone || "+62 812 3456 7890"}
                headerText={tenant?.receiptHeader}
                footerText={tenant?.receiptFooter}
                showLogo={tenant?.showLogo !== false}
                logoUrl={tenant?.logoUrl}
                orderId={order.id}
                date={new Date(order.createdAt)}
                cashierName={order.cashierName || "Cashier"}
                items={order.items.map(item => ({
                    name: item.variant.product.name,
                    quantity: item.quantity,
                    price: Number(item.price),
                    variantName: item.variant.optionValues.length > 0
                        ? item.variant.optionValues.map(ov => ov.value).join(' / ')
                        : undefined,
                    itemDiscount: Number(item.itemDiscount || 0) > 0 ? Number(item.itemDiscount) : undefined,
                }))}
                subtotal={subtotal}
                tax={tax}
                total={Number(order.total)}
                discountAmount={Number(order.discountAmount || 0)}
                discountName={order.discount?.name}
            />
        </>
    );
}
