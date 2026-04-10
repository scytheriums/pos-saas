'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Truck, Edit, Trash2, Package, ShoppingBag, SlidersHorizontal, Eye } from 'lucide-react';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
    const [filterOpen, setFilterOpen] = useState(false);
    const [pendingSearch, setPendingSearch] = useState('');
    const activeFilterCount = [searchQuery !== ''].filter(Boolean).length;

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

    const applyFilters = () => {
        setSearchQuery(pendingSearch);
        setFilterOpen(false);
        setCursor(null);
        fetchSuppliers(null, true, pendingSearch);
    };

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
                    <Skeleton className="h-9 w-32" />
                </div>
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="hidden sm:table-cell">Contact</TableHead>
                                <TableHead className="hidden md:table-cell">Email / Phone</TableHead>
                                <TableHead className="hidden sm:table-cell">Products</TableHead>
                                <TableHead className="hidden md:table-cell">Orders</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-8" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-8" /></TableCell>
                                    <TableCell><Skeleton className="h-7 w-20 ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
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
                <div className="flex items-center gap-2">
                    <Popover open={filterOpen} onOpenChange={open => { if (open) setPendingSearch(searchQuery); setFilterOpen(open); }}>
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
                        <PopoverContent align="end" className="w-60 p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold">Filters</p>
                                <button onClick={() => setPendingSearch('')} className="text-xs text-muted-foreground hover:text-foreground">Reset</button>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">Search</p>
                                <Input
                                    placeholder="Supplier name..."
                                    value={pendingSearch}
                                    onChange={e => setPendingSearch(e.target.value)}
                                    className="h-8 text-sm"
                                    onKeyDown={e => e.key === 'Enter' && applyFilters()}
                                />
                            </div>
                            <Button size="sm" className="w-full h-8" onClick={applyFilters}>Apply</Button>
                        </PopoverContent>
                    </Popover>
                    <Link href="/dashboard/suppliers/new">
                        <Button size="sm" className="h-9 gap-1.5">
                            <Plus className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Add Supplier</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead className="hidden sm:table-cell">Contact</TableHead>
                            <TableHead className="hidden md:table-cell">Email / Phone</TableHead>
                            <TableHead className="hidden sm:table-cell">Products</TableHead>
                            <TableHead className="hidden md:table-cell">Orders</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {suppliers.length === 0 && !loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <Truck className="h-10 w-10" />
                                        <p className="text-sm font-medium text-foreground">
                                            {searchQuery ? 'No suppliers found' : 'No suppliers yet'}
                                        </p>
                                        <p className="text-xs">
                                            {searchQuery ? 'Try adjusting your search' : 'Add your first supplier to get started'}
                                        </p>
                                        {!searchQuery && (
                                            <Link href="/dashboard/suppliers/new" className="mt-1">
                                                <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Add Supplier</Button>
                                            </Link>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            suppliers.map(supplier => (
                                <TableRow key={supplier.id} className="group">
                                    <TableCell>
                                        <div className="font-medium">{supplier.name}</div>
                                        {supplier.paymentTerms && (
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">{supplier.paymentTerms}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                                        {supplier.contactName ?? '—'}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-sm">
                                        <div className="text-muted-foreground">{supplier.email ?? '—'}</div>
                                        {supplier.phone && <div className="text-muted-foreground text-xs">{supplier.phone}</div>}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                                        <span className="flex items-center gap-1">
                                            <Package className="h-3 w-3" />
                                            {supplier._count.products}
                                        </span>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                                        <span className="flex items-center gap-1">
                                            <ShoppingBag className="h-3 w-3" />
                                            {supplier._count.purchaseOrders}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Link href={`/dashboard/purchase-orders?supplierId=${supplier.id}`}>
                                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                                                    <Eye className="h-3 w-3" />
                                                    <span className="hidden sm:inline">Orders</span>
                                                </Button>
                                            </Link>
                                            <Link href={`/dashboard/suppliers/${supplier.id}/edit`}>
                                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                                                    <Edit className="h-3 w-3" />
                                                    <span className="hidden sm:inline">Edit</span>
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
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

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
