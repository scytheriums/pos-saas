'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Truck, Edit, Trash2, Package, ShoppingBag } from 'lucide-react';
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
import { useDebounce } from '@/hooks/use-debounce';

interface Supplier {
    id: string;
    name: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    paymentTerms: string | null;
    _count: { products: number; purchaseOrders: number };
}

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const fetchSuppliers = useCallback(async (overrideCursor?: string | null, reset = false, searchOverride?: string) => {
        try {
            const activeSearch = searchOverride !== undefined ? searchOverride : debouncedSearch;
            const params = new URLSearchParams({ limit: '20' });
            const activeCursor = overrideCursor !== undefined ? overrideCursor : cursor;
            if (activeCursor) params.append('cursor', activeCursor);
            if (activeSearch) params.append('search', activeSearch);

            const res = await fetch(`/api/suppliers?${params}`);
            if (!res.ok) throw new Error('Failed to fetch suppliers');
            const data = await res.json();

            setSuppliers(prev => reset ? data.data : [...prev, ...data.data]);
            setHasMore(data.hasMore);
            setCursor(data.nextCursor ?? null);
        } catch (err) {
            console.error(err);
            setError('Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    useEffect(() => { fetchSuppliers(null, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setCursor(null);
        fetchSuppliers(null, true, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setSuppliers(prev => prev.filter(s => s.id !== id));
        } catch {
            alert('Failed to delete supplier');
        } finally {
            setDeletingId(null);
        }
    };

    if (loading && suppliers.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                        <Skeleton className="h-7 w-28" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                </div>
                <Skeleton className="h-9 w-full max-w-xs" />
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <h1 className="text-xl font-bold mb-3">Suppliers</h1>
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded text-sm">{error}</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold">Suppliers</h1>
                    <p className="text-xs text-muted-foreground">Manage your product suppliers</p>
                </div>
                <Link href="/dashboard/suppliers/new">
                    <Button size="sm" className="h-9 gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">New Supplier</span>
                    </Button>
                </Link>
            </div>

            {/* Search */}
            <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    placeholder="Search suppliers..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-sm"
                />
            </div>

            {/* List */}
            {suppliers.length === 0 && !loading ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Truck className="h-12 w-12 text-muted-foreground mb-3" />
                        <h3 className="text-sm font-semibold mb-1">
                            {searchQuery ? 'No suppliers found' : 'No suppliers yet'}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {searchQuery ? 'Try adjusting your search' : 'Add your first supplier to get started'}
                        </p>
                        {!searchQuery && (
                            <Link href="/dashboard/suppliers/new">
                                <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Add Supplier</Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-2 lg:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {suppliers.map(supplier => (
                        <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-3 lg:p-4 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm leading-tight truncate">{supplier.name}</p>
                                        {supplier.contactName && (
                                            <p className="text-xs text-muted-foreground truncate">{supplier.contactName}</p>
                                        )}
                                    </div>
                                    {supplier.paymentTerms && (
                                        <Badge variant="secondary" className="text-[10px] shrink-0">{supplier.paymentTerms}</Badge>
                                    )}
                                </div>

                                <div className="flex gap-3 text-xs text-muted-foreground">
                                    {supplier.phone && <span className="truncate">{supplier.phone}</span>}
                                    {supplier.email && <span className="truncate">{supplier.email}</span>}
                                </div>

                                <div className="flex gap-3 text-[11px] text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Package className="h-3 w-3" />
                                        {supplier._count.products} product{supplier._count.products !== 1 ? 's' : ''}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <ShoppingBag className="h-3 w-3" />
                                        {supplier._count.purchaseOrders} order{supplier._count.purchaseOrders !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                <div className="flex gap-1.5">
                                    <Link href={`/dashboard/suppliers/${supplier.id}/edit`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5">
                                            <Edit className="h-3 w-3" />Edit
                                        </Button>
                                    </Link>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive hover:text-destructive-foreground h-7 w-7 p-0"
                                                disabled={deletingId === supplier.id}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete &quot;{supplier.name}&quot;? Products linked to this supplier will be unlinked.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDelete(supplier.id)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {hasMore && (
                <div className="flex justify-center">
                    <Button variant="outline" size="sm" onClick={() => fetchSuppliers(cursor, false)} disabled={loading}>
                        {loading ? 'Loading...' : 'Load More'}
                    </Button>
                </div>
            )}
        </div>
    );
}
