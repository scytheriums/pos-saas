'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingBag, Trash2, Eye, SlidersHorizontal, X } from 'lucide-react';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

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

function PurchaseOrdersContent() {
    const searchParams = useSearchParams();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [filterOpen, setFilterOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [pendingStatus, setPendingStatus] = useState('ALL');
    const [supplierFilter, setSupplierFilter] = useState(() => searchParams.get('supplierId') ?? '');
    const [supplierName, setSupplierName] = useState('');

    const activeFilterCount = [statusFilter !== 'ALL', supplierFilter !== ''].filter(Boolean).length;

    const fetchOrders = useCallback(async (overrideCursor?: string | null, reset = false, statusOverride?: string, supplierOverride?: string) => {
        try {
            const activeStatus = statusOverride !== undefined ? statusOverride : statusFilter;
            const activeSupplierId = supplierOverride !== undefined ? supplierOverride : supplierFilter;
            const params = new URLSearchParams({ limit: '20' });
            const activeCursor = overrideCursor !== undefined ? overrideCursor : cursor;
            if (activeCursor) params.append('cursor', activeCursor);
            if (activeStatus && activeStatus !== 'ALL') params.append('status', activeStatus);
            if (activeSupplierId) params.append('supplierId', activeSupplierId);

            const res = await fetch(`/api/purchase-orders?${params}`);
            if (!res.ok) throw new Error('Failed to fetch purchase orders');
            const data = await res.json();

            setOrders(prev => reset ? data.data : [...prev, ...data.data]);
            setHasMore(data.hasMore);
            setCursor(data.nextCursor ?? null);

            if (reset && activeSupplierId && data.data.length > 0) {
                setSupplierName(data.data[0].supplier.name);
            }
        } catch {
            setError('Failed to load purchase orders');
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, supplierFilter]);

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
                                <span className="hidden sm:inline">Filter</span>
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

            {/* Supplier filter chip */}
            {supplierFilter && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Filtered by supplier:</span>
                    <Badge variant="secondary" className="text-xs gap-1 pr-1">
                        {supplierName || 'Supplier'}
                        <button
                            onClick={() => { setSupplierFilter(''); setSupplierName(''); setCursor(null); fetchOrders(null, true, statusFilter, ''); }}
                            className="ml-1 hover:text-foreground"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded text-sm">{error}</div>
            )}

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden sm:table-cell">Items</TableHead>
                            <TableHead className="hidden md:table-cell">Created</TableHead>
                            <TableHead className="hidden md:table-cell">Expected</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && orders.length === 0 ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-10" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <ShoppingBag className="h-10 w-10" />
                                        <p className="text-sm font-medium text-foreground">No purchase orders found</p>
                                        <p className="text-xs">
                                            {statusFilter !== 'ALL' ? 'Try changing the status filter' : 'Create your first purchase order to track incoming stock'}
                                        </p>
                                        {statusFilter === 'ALL' && !supplierFilter && (
                                            <Link href="/dashboard/purchase-orders/new" className="mt-1">
                                                <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />New Order</Button>
                                            </Link>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            orders.map(order => {
                                const cfg = STATUS_CONFIG[order.status];
                                return (
                                    <TableRow key={order.id} className="group">
                                        <TableCell className="font-medium">{order.supplier.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">{cfg.label}</Badge>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                                            {order._count.items}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                                            {formatDate(order.createdAt)}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                                            {formatDate(order.expectedDate)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
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
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>

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

export default function PurchaseOrdersPage() {
    return (
        <Suspense>
            <PurchaseOrdersContent />
        </Suspense>
    );
}
