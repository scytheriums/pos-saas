'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingBag, Trash2, Eye, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type POStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

interface PurchaseOrder {
    id: string;
    status: POStatus;
    expectedDate: string | null;
    createdAt: string;
    notes: string | null;
    supplier: { id: string; name: string };
    _count: { items: number };
}

const STATUS_CONFIG: Record<POStatus, { label: string; variant: 'secondary' | 'default' | 'outline' | 'destructive' }> = {
    DRAFT: { label: 'Draft', variant: 'secondary' },
    SENT: { label: 'Sent', variant: 'default' },
    PARTIALLY_RECEIVED: { label: 'Partial', variant: 'outline' },
    RECEIVED: { label: 'Received', variant: 'default' },
    CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [filterOpen, setFilterOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [pendingStatus, setPendingStatus] = useState('ALL');

    const activeFilterCount = [statusFilter !== 'ALL'].filter(Boolean).length;

    const fetchOrders = useCallback(async (overrideCursor?: string | null, reset = false, statusOverride?: string) => {
        try {
            const activeStatus = statusOverride !== undefined ? statusOverride : statusFilter;
            const params = new URLSearchParams({ limit: '20' });
            const activeCursor = overrideCursor !== undefined ? overrideCursor : cursor;
            if (activeCursor) params.append('cursor', activeCursor);
            if (activeStatus && activeStatus !== 'ALL') params.append('status', activeStatus);

            const res = await fetch(`/api/purchase-orders?${params}`);
            if (!res.ok) throw new Error('Failed to fetch purchase orders');
            const data = await res.json();

            setOrders(prev => reset ? data.data : [...prev, ...data.data]);
            setHasMore(data.hasMore);
            setCursor(data.nextCursor ?? null);
        } catch {
            setError('Failed to load purchase orders');
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    useEffect(() => { fetchOrders(null, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const applyFilters = () => {
        setStatusFilter(pendingStatus);
        setFilterOpen(false);
        setCursor(null);
        fetchOrders(null, true, pendingStatus);
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await fetch(`/api/purchase-orders/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error ?? 'Failed to delete');
            }
            setOrders(prev => prev.filter(o => o.id !== id));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete purchase order');
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : '—';

    if (loading && orders.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1"><Skeleton className="h-7 w-40" /><Skeleton className="h-3 w-52" /></div>
                    <Skeleton className="h-9 w-28" />
                </div>
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <h1 className="text-xl font-bold mb-3">Purchase Orders</h1>
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded text-sm">{error}</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold">Purchase Orders</h1>
                    <p className="text-xs text-muted-foreground">Track incoming stock from suppliers</p>
                </div>
                <div className="flex items-center gap-2">
                    <Popover open={filterOpen} onOpenChange={open => { if (open) setPendingStatus(statusFilter); setFilterOpen(open); }}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1.5 relative">
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-52 p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold">Filters</p>
                                <button onClick={() => setPendingStatus('ALL')} className="text-xs text-muted-foreground hover:text-foreground">Reset</button>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">Status</p>
                                <Select value={pendingStatus} onValueChange={setPendingStatus}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All</SelectItem>
                                        <SelectItem value="DRAFT">Draft</SelectItem>
                                        <SelectItem value="SENT">Sent</SelectItem>
                                        <SelectItem value="PARTIALLY_RECEIVED">Partial</SelectItem>
                                        <SelectItem value="RECEIVED">Received</SelectItem>
                                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button size="sm" className="w-full h-8" onClick={applyFilters}>Apply</Button>
                        </PopoverContent>
                    </Popover>
                    <Link href="/dashboard/purchase-orders/new">
                        <Button size="sm" className="h-9 gap-1.5">
                            <Plus className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">New Order</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* List */}
            {orders.length === 0 && !loading ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <ShoppingBag className="h-12 w-12 text-muted-foreground mb-3" />
                        <h3 className="text-sm font-semibold mb-1">No purchase orders found</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {statusFilter !== 'ALL' ? 'Try changing the status filter' : 'Create your first purchase order to track incoming stock'}
                        </p>
                        {statusFilter === 'ALL' && (
                            <Link href="/dashboard/purchase-orders/new">
                                <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />New Order</Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {orders.map(order => {
                        const cfg = STATUS_CONFIG[order.status];
                        return (
                            <Card key={order.id} className="hover:shadow-sm transition-shadow">
                                <CardContent className="p-3 lg:p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-sm">{order.supplier.name}</p>
                                                <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">{cfg.label}</Badge>
                                            </div>
                                            <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                                                <span>{order._count.items} item{order._count.items !== 1 ? 's' : ''}</span>
                                                <span>Created {formatDate(order.createdAt)}</span>
                                                {order.expectedDate && <span>Expected {formatDate(order.expectedDate)}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Link href={`/dashboard/purchase-orders/${order.id}`}>
                                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                                                    <Eye className="h-3 w-3" />View
                                                </Button>
                                            </Link>
                                            {order.status === 'DRAFT' && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground h-7 w-7 p-0"
                                                            disabled={deletingId === order.id}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This draft order from &quot;{order.supplier.name}&quot; will be permanently deleted.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(order.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {hasMore && (
                <div className="flex justify-center">
                    <Button variant="outline" size="sm" onClick={() => fetchOrders(cursor, false)} disabled={loading}>
                        {loading ? 'Loading...' : 'Load More'}
                    </Button>
                </div>
            )}
        </div>
    );
}
