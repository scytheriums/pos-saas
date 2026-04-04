'use client';

import { useState, useEffect } from 'react';
import { useTenantSettings } from '@/contexts/SettingsContext';
import { formatCurrencyWithSettings, formatDateTimeWithSettings } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Download, Eye, Calendar, SlidersHorizontal, ShoppingBag, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { addDays, startOfDay, endOfDay, startOfMonth } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Order {
    id: string;
    total: number;
    status: 'PENDING' | 'COMPLETED' | 'REFUNDED' | 'CANCELLED';
    paymentMethod: 'CASH' | 'CARD' | 'E_WALLET' | 'BANK_TRANSFER' | null;
    customerName: string | null;
    customer?: {
        name: string;
        email?: string;
        phone?: string;
    } | null;
    cashierName: string | null;
    createdAt: string;
    items: any[];
}

function getDateRange(preset: string) {
    const now = new Date();
    switch (preset) {
        case 'today': return { from: startOfDay(now), to: endOfDay(now) };
        case '7d':    return { from: addDays(now, -7), to: now };
        case '30d':   return { from: addDays(now, -30), to: now };
        case 'month': return { from: startOfMonth(now), to: now };
        default:      return null; // 'all'
    }
}

export default function OrdersPage() {
    const settings = useTenantSettings();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [paymentFilter, setPaymentFilter] = useState('ALL');
    const [datePreset, setDatePreset] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Popup filter state
    const [filterOpen, setFilterOpen] = useState(false);
    const [pendingSearch, setPendingSearch] = useState('');
    const [pendingStatus, setPendingStatus] = useState('ALL');
    const [pendingPayment, setPendingPayment] = useState('ALL');
    const [pendingDatePreset, setPendingDatePreset] = useState('all');

    const activeFilterCount = [
        search !== '',
        statusFilter !== 'ALL',
        paymentFilter !== 'ALL',
        datePreset !== 'all',
    ].filter(Boolean).length;

    const handleFilterOpen = (open: boolean) => {
        if (open) {
            setPendingSearch(search);
            setPendingStatus(statusFilter);
            setPendingPayment(paymentFilter);
            setPendingDatePreset(datePreset);
        }
        setFilterOpen(open);
    };

    const applyFilters = () => {
        setSearch(pendingSearch);
        setStatusFilter(pendingStatus);
        setPaymentFilter(pendingPayment);
        setDatePreset(pendingDatePreset);
        setPage(1);
        setFilterOpen(false);
    };

    const resetFilters = () => {
        setPendingSearch('');
        setPendingStatus('ALL');
        setPendingPayment('ALL');
        setPendingDatePreset('all');
    };

    useEffect(() => {
        fetchOrders();
    }, [page, statusFilter, paymentFilter, search, datePreset]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
            });

            if (statusFilter !== 'ALL') params.set('status', statusFilter);
            if (paymentFilter !== 'ALL') params.set('paymentMethod', paymentFilter);
            if (search) params.set('search', search);
            const range = getDateRange(datePreset);
            if (range?.from) params.set('startDate', range.from.toISOString());
            if (range?.to) params.set('endDate', range.to.toISOString());

            const res = await fetch(`/api/orders?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders);
                setTotalPages(data.pagination.totalPages);
                setTotal(data.pagination.total);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
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

    const getPaymentMethodBadge = (method: string | null) => {
        if (!method) return <span className="text-muted-foreground">-</span>;
        const labels: Record<string, string> = {
            CASH: 'Cash',
            CARD: 'Card',
            E_WALLET: 'E-Wallet',
            BANK_TRANSFER: 'Bank Transfer',
        };
        return <Badge variant="outline">{labels[method] || method}</Badge>;
    };



    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold">Orders</h1>
                    <p className="text-xs text-muted-foreground">View and manage all orders</p>
                </div>
                <div className="flex items-center gap-2">
                    <Popover open={filterOpen} onOpenChange={handleFilterOpen}>
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
                        <PopoverContent align="end" className="w-64 p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold">Filters</p>
                                <button
                                    onClick={resetFilters}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Reset
                                </button>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">Search</p>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Order ID or customer..."
                                        value={pendingSearch}
                                        onChange={(e) => setPendingSearch(e.target.value)}
                                        className="pl-7 h-8 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">Status</p>
                                <Select value={pendingStatus} onValueChange={setPendingStatus}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Status</SelectItem>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">Payment Method</p>
                                <Select value={pendingPayment} onValueChange={setPendingPayment}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="All Methods" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Methods</SelectItem>
                                        <SelectItem value="CASH">Cash</SelectItem>
                                        <SelectItem value="CARD">Card</SelectItem>
                                        <SelectItem value="E_WALLET">E-Wallet</SelectItem>
                                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">Date Range</p>
                                <Select value={pendingDatePreset} onValueChange={setPendingDatePreset}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All time</SelectItem>
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="7d">Last 7 days</SelectItem>
                                        <SelectItem value="30d">Last 30 days</SelectItem>
                                        <SelectItem value="month">This month</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button size="sm" className="w-full h-8" onClick={applyFilters}>
                                Apply Filters
                            </Button>
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                        <Download className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Stats Cards — 2 cols on mobile, 4 on desktop */}
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
                <Card className="py-1">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <ShoppingBag className="h-[18px] w-[18px] text-primary" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground leading-none">Total Orders</p>
                            <p className="text-lg font-bold leading-none mt-1">{total}</p>
                        </div>
                    </div>
                </Card>
                <Card className="py-1">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-[18px] w-[18px] text-green-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground leading-none">Completed</p>
                            <p className="text-lg font-bold leading-none mt-1 text-green-600">
                                {orders.filter(o => o.status === 'COMPLETED').length}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card className="py-1">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                            <Clock className="h-[18px] w-[18px] text-yellow-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground leading-none">Pending</p>
                            <p className="text-lg font-bold leading-none mt-1 text-yellow-600">
                                {orders.filter(o => o.status === 'PENDING').length}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card className="py-1">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                            <RotateCcw className="h-[18px] w-[18px] text-red-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground leading-none">Refunded</p>
                            <p className="text-lg font-bold leading-none mt-1 text-red-600">
                                {orders.filter(o => o.status === 'REFUNDED').length}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* ── Mobile card list (hidden on md+) ── */}
            <div className="md:hidden space-y-2">
                {loading ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">Loading orders...</div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">No orders found</div>
                ) : (
                    orders.map((order) => (
                        <Card key={order.id} className="overflow-hidden">
                            <CardContent className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-mono text-muted-foreground">
                                            #{order.id.slice(0, 8).toUpperCase()}
                                        </p>
                                        <p className="font-semibold text-sm truncate">
                                            {order.customer?.name || order.customerName || 'Walk-in'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDateTimeWithSettings(order.createdAt, settings)}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-bold text-sm">
                                            {formatCurrencyWithSettings(Number(order.total), settings)}
                                        </p>
                                        <div className="mt-1">{getStatusBadge(order.status)}</div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed">
                                    <div className="flex items-center gap-2">
                                        {getPaymentMethodBadge(order.paymentMethod)}
                                        <span className="text-xs text-muted-foreground">{order.items.length} items</span>
                                    </div>
                                    <Link href={`/dashboard/orders/${order.id}`}>
                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* ── Desktop table (hidden below md) ── */}
            <Card className="hidden md:block">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        Loading orders...
                                    </TableCell>
                                </TableRow>
                            ) : orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        No orders found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono text-sm">
                                            {order.id.slice(0, 8)}...
                                        </TableCell>
                                        <TableCell>{formatDateTimeWithSettings(order.createdAt, settings)}</TableCell>
                                        <TableCell>
                                            {order.customer?.name || order.customerName || <span className="text-muted-foreground">Walk-in</span>}
                                        </TableCell>
                                        <TableCell>{order.items.length} items</TableCell>
                                        <TableCell className="font-semibold">{formatCurrencyWithSettings(Number(order.total), settings)}</TableCell>
                                        <TableCell>{getPaymentMethodBadge(order.paymentMethod)}</TableCell>
                                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                                        <TableCell>
                                            <Link href={`/dashboard/orders/${order.id}`}>
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
