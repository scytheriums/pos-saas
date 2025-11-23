'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import Link from 'next/link';

interface OrderDetails {
    id: string;
    total: number;
    status: string;
    paymentMethod: string | null;
    customerName: string | null;
    cashierName: string | null;
    notes: string | null;
    createdAt: string;
    items: {
        id: string;
        quantity: number;
        price: number;
        variant: {
            sku: string;
            product: {
                name: string;
            };
        };
    }[];
}

export default function OrderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            fetchOrder(params.id as string);
        }
    }, [params.id]);

    const fetchOrder = async (id: string) => {
        try {
            const res = await fetch(`/api/orders/${id}`);
            if (res.ok) {
                const data = await res.json();
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat('id-ID', {
            dateStyle: 'long',
            timeStyle: 'medium',
        }).format(new Date(date));
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

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/orders">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Order Details</h1>
                        <p className="text-muted-foreground">Order ID: {order.id}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Printer className="mr-2 h-4 w-4" />
                        Reprint Receipt
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
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
                                    {order.customerName || <span className="text-muted-foreground">Walk-in</span>}
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
                                <p className="mt-1 font-medium">{formatDate(order.createdAt)}</p>
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
                            <span>{formatCurrency(Number(order.total))}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>{formatCurrency(Number(order.total))}</span>
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
                            <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0">
                                <div className="flex-1">
                                    <p className="font-medium">{item.variant.product.name}</p>
                                    <p className="text-sm text-muted-foreground">SKU: {item.variant.sku}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">{formatCurrency(Number(item.price))}</p>
                                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                </div>
                                <div className="ml-8 text-right min-w-[120px]">
                                    <p className="font-bold">{formatCurrency(Number(item.price) * item.quantity)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
