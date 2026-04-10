'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, PackageCheck, Send } from 'lucide-react';
import Link from 'next/link';

type POStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

interface POItem {
    id: string;
    variantId: string | null;
    itemName: string | null;
    unit: string | null;
    quantity: number;
    receivedQuantity: number;
    unitCost: number | string;
    updateVariantCost: boolean;
    variant: {
        id: string;
        sku: string;
        stock: number;
        price: number | string;
        product: { name: string };
    } | null;
}

interface PurchaseOrder {
    id: string;
    status: POStatus;
    expectedDate: string | null;
    createdAt: string;
    notes: string | null;
    supplier: { id: string; name: string; email: string | null; phone: string | null };
    items: POItem[];
}

const STATUS_CONFIG: Record<POStatus, { label: string; variant: 'secondary' | 'default' | 'outline' | 'destructive'; className?: string }> = {
    DRAFT: { label: 'Draft', variant: 'secondary' },
    SENT: { label: 'Sent', variant: 'default' },
    PARTIALLY_RECEIVED: { label: 'Partially Received', variant: 'outline', className: 'border-orange-400 text-orange-600' },
    RECEIVED: { label: 'Received', variant: 'default', className: 'bg-green-600 hover:bg-green-700' },
    CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [order, setOrder] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [orderId, setOrderId] = useState('');

    // Status update
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Receive modal
    const [receiveOpen, setReceiveOpen] = useState(false);
    const [receiving, setReceiving] = useState(false);
    const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

    useEffect(() => {
        params.then(({ id }) => {
            setOrderId(id);
            fetch(`/api/purchase-orders/${id}`)
                .then(r => r.json())
                .then(data => {
                    if (data.error) throw new Error(data.error);
                    setOrder(data);
                })
                .catch(() => setError('Failed to load purchase order'))
                .finally(() => setLoading(false));
        });
    }, [params]);

    const openReceiveModal = () => {
        if (!order) return;
        const qtys: Record<string, number> = {};
        for (const item of order.items) {
            const remaining = item.quantity - item.receivedQuantity;
            qtys[item.id] = remaining > 0 ? remaining : 0;
        }
        setReceiveQtys(qtys);
        setReceiveOpen(true);
    };

    const handleReceive = async () => {
        setReceiving(true);
        try {
            const res = await fetch(`/api/purchase-orders/${orderId}/receive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: Object.entries(receiveQtys)
                        .filter(([, qty]) => qty > 0)
                        .map(([purchaseOrderItemId, receivedQuantity]) => ({ purchaseOrderItemId, receivedQuantity })),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Failed to receive stock');
            setOrder(data);
            setReceiveOpen(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to receive stock');
        } finally {
            setReceiving(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        setUpdatingStatus(true);
        try {
            const res = await fetch(`/api/purchase-orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Failed to update status');
            setOrder(prev => prev ? { ...prev, status: data.status } : prev);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : '—';
    const formatCost = (v: number | string) => typeof v === 'string' ? parseFloat(v).toFixed(2) : v.toFixed(2);

    if (loading) {
        return (
            <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-6 w-52" />
                </div>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div>
                <h1 className="text-xl font-bold mb-3">Purchase Order</h1>
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded text-sm">
                    {error ?? 'Order not found'}
                </div>
            </div>
        );
    }

    const cfg = STATUS_CONFIG[order.status];
    const canReceive = order.status !== 'RECEIVED' && order.status !== 'CANCELLED';
    const totalOrdered = order.items.reduce((sum, i) => sum + i.quantity, 0);
    const totalReceived = order.items.reduce((sum, i) => sum + i.receivedQuantity, 0);
    const totalCost = order.items.reduce((sum, i) => sum + i.quantity * parseFloat(String(i.unitCost)), 0);

    return (
        <div className="space-y-4 max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/purchase-orders">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold">Purchase Order</h1>
                            <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{order.supplier.name} · {formatDate(order.createdAt)}</p>
                    </div>
                </div>
                {canReceive && (
                    <Button size="sm" className="h-9 gap-1.5" onClick={openReceiveModal}>
                        <PackageCheck className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Receive Stock</span>
                    </Button>
                )}
            </div>

            {/* Info card */}
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Details</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                            <p className="text-xs text-muted-foreground">Supplier</p>
                            <p className="font-medium">{order.supplier.name}</p>
                            {order.supplier.email && <p className="text-xs text-muted-foreground">{order.supplier.email}</p>}
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Expected Date</p>
                            <p className="font-medium">{formatDate(order.expectedDate)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Progress</p>
                            <p className="font-medium">{totalReceived} / {totalOrdered} units received</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Cost</p>
                            <p className="font-medium">{totalCost.toFixed(2)}</p>
                        </div>
                    </div>

                    {order.notes && (
                        <div>
                            <p className="text-xs text-muted-foreground">Notes</p>
                            <p className="text-sm">{order.notes}</p>
                        </div>
                    )}

                    {/* Status changer */}
                    {order.status !== 'RECEIVED' && order.status !== 'CANCELLED' && (
                        <div className="flex items-center gap-2 pt-1">
                            <p className="text-xs text-muted-foreground shrink-0">Change status:</p>
                            <Select value={order.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
                                <SelectTrigger className="h-7 text-xs w-44">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DRAFT">Draft</SelectItem>
                                    <SelectItem value="SENT">Sent</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                            {updatingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Items */}
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Items ({order.items.length})</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_60px_60px_60px_70px] gap-2 text-[10px] font-medium text-muted-foreground px-1">
                            <span>Item</span>
                            <span className="text-right">Ordered</span>
                            <span className="text-right">Received</span>
                            <span className="text-right">Cost</span>
                            <span className="text-right">Stock</span>
                        </div>
                        {order.items.map(item => {
                            const isComplete = item.receivedQuantity >= item.quantity;
                            const isProduct = !!item.variantId;
                            const displayName = isProduct
                                ? item.variant!.product.name
                                : (item.itemName ?? '—');
                            const displaySub = isProduct
                                ? item.variant!.sku
                                : item.unit ?? 'raw material';
                            return (
                                <div key={item.id} className="grid grid-cols-[1fr_60px_60px_60px_70px] gap-2 items-center py-1 border-b last:border-0">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[9px] px-1 py-0 rounded font-medium shrink-0 ${isProduct ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                {isProduct ? 'Product' : 'Raw'}
                                            </span>
                                            <p className="text-xs font-medium truncate">{displayName}</p>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground ml-0">
                                            {displaySub}
                                            {isProduct && item.updateVariantCost && (
                                                <span className="ml-1 text-green-600">· cost sync</span>
                                            )}
                                        </p>
                                    </div>
                                    <p className="text-xs text-right">{item.quantity}</p>
                                    <p className={`text-xs text-right font-medium ${isComplete ? 'text-green-600' : item.receivedQuantity > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                        {item.receivedQuantity}
                                    </p>
                                    <p className="text-xs text-right">{formatCost(item.unitCost)}</p>
                                    <p className="text-xs text-right">{isProduct ? item.variant!.stock : '—'}</p>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Receive Modal */}
            <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Send className="h-4 w-4" />Receive Stock
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                        <p className="text-sm text-muted-foreground">
                            Enter the quantity received for each item. Stock will be incremented automatically.
                        </p>
                        <div className="grid grid-cols-[1fr_100px] gap-2 text-[10px] font-medium text-muted-foreground px-1">
                            <span>Product</span>
                            <span className="text-right">Qty to Receive</span>
                        </div>
                        {order.items.map(item => {
                            const remaining = item.quantity - item.receivedQuantity;
                            const isProduct = !!item.variantId;
                            const displayName = isProduct ? item.variant!.product.name : (item.itemName ?? '—');
                            const displaySub = isProduct
                                ? `${item.variant!.sku} · ${item.receivedQuantity}/${item.quantity} received`
                                : `${item.unit ?? 'raw material'} · ${item.receivedQuantity}/${item.quantity} received`;
                            return (
                                <div key={item.id} className="grid grid-cols-[1fr_100px] gap-2 items-center">
                                    <div>
                                        <p className="text-xs font-medium truncate">{displayName}</p>
                                        <p className="text-[10px] text-muted-foreground">{displaySub}</p>
                                    </div>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={remaining}
                                        value={receiveQtys[item.id] ?? 0}
                                        onChange={e => setReceiveQtys(prev => ({
                                            ...prev,
                                            [item.id]: Math.min(parseInt(e.target.value) || 0, remaining),
                                        }))}
                                        className="h-7 text-xs text-right"
                                        disabled={remaining <= 0}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
                        <Button onClick={handleReceive} disabled={receiving}>
                            {receiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {receiving ? 'Receiving...' : 'Confirm Receipt'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
