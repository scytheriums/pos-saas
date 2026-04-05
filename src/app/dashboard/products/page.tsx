'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Search,
    Package,
    PackageCheck,
    PackageX,
    AlertTriangle,
    Edit,
    Trash2,
    SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
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
} from "@/components/ui/alert-dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounce } from '@/hooks/use-debounce';

interface Product {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    minStock: number;
    tenantId: string;
    categoryId: string | null;
    createdAt: string;
    variants: Array<{
        id: string;
        sku: string;
        price: number;
        stock: number;
    }>;
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const limit = 20;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Filter popup state
    const [filterOpen, setFilterOpen] = useState(false);
    const [pendingSearch, setPendingSearch] = useState('');
    const [stockFilter, setStockFilter] = useState('ALL');
    const [pendingStockFilter, setPendingStockFilter] = useState('ALL');

    const activeFilterCount = [stockFilter !== 'ALL'].filter(Boolean).length;

    const handleFilterOpen = (open: boolean) => {
        if (open) {
            setPendingSearch(searchQuery);
            setPendingStockFilter(stockFilter);
        }
        setFilterOpen(open);
    };

    const applyFilters = () => {
        setSearchQuery(pendingSearch);
        setStockFilter(pendingStockFilter);
        setFilterOpen(false);
    };

    const resetFilters = () => {
        setPendingSearch('');
        setPendingStockFilter('ALL');
    };

    const fetchProducts = async (overrideCursor?: string | null, reset: boolean = false, searchOverride?: string) => {
        try {
            const activeSearch = searchOverride !== undefined ? searchOverride : debouncedSearch;
            const params = new URLSearchParams({ limit: limit.toString() });
            const activeCursor = overrideCursor !== undefined ? overrideCursor : cursor;
            if (activeCursor) params.append('cursor', activeCursor);
            if (activeSearch) params.append('search', activeSearch);

            const response = await fetch(`/api/products?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch products');
            const data = await response.json();
            setProducts(prev => reset ? data.products : [...prev, ...data.products]);
            setHasMore(data.hasMore);
            setCursor(data.nextCursor ?? null);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchProducts(null, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Search effect
    useEffect(() => {
        setCursor(null);
        fetchProducts(null, true, debouncedSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const loadMore = () => {
        if (hasMore && cursor) {
            fetchProducts(cursor, false);
        }
    };

    const handleDelete = async (productId: string) => {
        setDeletingId(productId);
        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete product');
            }

            // Remove from local state
            setProducts(products.filter(p => p.id !== productId));
        } catch (err) {
            console.error('Error deleting product:', err);
            alert('Failed to delete product');
        } finally {
            setDeletingId(null);
        }
    };

    const filteredProducts = products.filter(p => {
        if (stockFilter === 'IN_STOCK') return getTotalStock(p) > p.minStock;
        if (stockFilter === 'LOW_STOCK') return getTotalStock(p) <= p.minStock && getTotalStock(p) > 0;
        if (stockFilter === 'OUT_OF_STOCK') return getTotalStock(p) === 0;
        return true;
    });

    const getTotalStock = (product: Product) => {
        return product.variants.reduce((sum, v) => sum + v.stock, 0);
    };

    const getStockStatus = (product: Product) => {
        const totalStock = getTotalStock(product);
        if (totalStock === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
        if (totalStock <= product.minStock) return { label: 'Low Stock', variant: 'secondary' as const };
        return { label: 'In Stock', variant: 'default' as const };
    };

    if (loading && products.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                        <Skeleton className="h-7 w-28" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                    </div>
                </div>
                <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-12" /><Skeleton className="h-12" />
                    <Skeleton className="h-12" /><Skeleton className="h-12" />
                </div>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <h1 className="text-xl font-bold mb-3">Products</h1>
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded text-sm">
                    {error}
                </div>
            </div>
        );
    }

    const stats = {
        total: products.length,
        totalVariants: products.reduce((sum, p) => sum + p.variants.length, 0),
        lowStock: products.filter(p => getTotalStock(p) <= p.minStock && getTotalStock(p) > 0).length,
        outOfStock: products.filter(p => getTotalStock(p) === 0).length,
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold">Products</h1>
                    <p className="text-xs text-muted-foreground">Manage your product catalog</p>
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
                        <PopoverContent align="end" className="w-60 p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold">Filters</p>
                                <button onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground">Reset</button>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">Search</p>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Name or SKU..."
                                        value={pendingSearch}
                                        onChange={(e) => setPendingSearch(e.target.value)}
                                        className="pl-7 h-8 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">Stock Status</p>
                                <Select value={pendingStockFilter} onValueChange={setPendingStockFilter}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All</SelectItem>
                                        <SelectItem value="IN_STOCK">In Stock</SelectItem>
                                        <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                                        <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button size="sm" className="w-full h-8" onClick={applyFilters}>Apply</Button>
                        </PopoverContent>
                    </Popover>
                    <Link href="/dashboard/products/new">
                        <Button size="sm" className="h-9 gap-1.5">
                            <Plus className="h-3.5 w-3.5" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
                <Card className="py-1">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="h-[18px] w-[18px] text-primary" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground leading-none">Total Products</p>
                            <p className="text-lg font-bold leading-none mt-1">{products.length}{hasMore ? '+' : ''}</p>
                        </div>
                    </div>
                </Card>
                <Card className="py-1">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                            <PackageCheck className="h-[18px] w-[18px] text-green-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground leading-none">In Stock</p>
                            <p className="text-lg font-bold leading-none mt-1 text-green-600">
                                {products.filter(p => getTotalStock(p) > p.minStock).length}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card className="py-1">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-[18px] w-[18px] text-orange-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground leading-none">Low Stock</p>
                            <p className="text-lg font-bold leading-none mt-1 text-orange-600">
                                {products.filter(p => getTotalStock(p) <= p.minStock && getTotalStock(p) > 0).length}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card className="py-1">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                            <PackageX className="h-[18px] w-[18px] text-red-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground leading-none">Out of Stock</p>
                            <p className="text-lg font-bold leading-none mt-1 text-red-600">
                                {products.filter(p => getTotalStock(p) === 0).length}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 && !loading ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Package className="h-12 w-12 text-muted-foreground mb-3" />
                        <h3 className="text-base font-semibold mb-1">
                            {searchQuery || stockFilter !== 'ALL' ? 'No products found' : 'No products yet'}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {searchQuery || stockFilter !== 'ALL'
                                ? 'Try adjusting your search or filter'
                                : 'Get started by adding your first product'}
                        </p>
                        {!searchQuery && stockFilter === 'ALL' && (
                            <Link href="/dashboard/products/new">
                                <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Add Product</Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-2 lg:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredProducts.map((product) => {
                        const stockStatus = getStockStatus(product);
                        const totalStock = getTotalStock(product);
                        return (
                            <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow p-0 pb-2 gap-2">
                                {/* Image: fixed compact height on mobile/tablet, aspect-square on desktop */}
                                <div className="aspect-square h-auto w-full bg-muted flex items-center justify-center overflow-hidden relative">
                                    {product.imageUrl ? (
                                        <Image
                                            src={product.imageUrl}
                                            alt={product.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <Package className="w-8 h-8 lg:w-10 lg:h-10 text-muted-foreground/30" />
                                    )}
                                </div>
                                <CardContent className="p-2 lg:p-2.5 space-y-1 lg:space-y-1.5">
                                    <div className="flex items-start justify-between gap-1">
                                        <p className="font-semibold text-xs lg:text-sm leading-tight line-clamp-2 flex-1">{product.name}</p>
                                        <Badge variant={stockStatus.variant} className="text-[9px] px-1 py-0 shrink-0 leading-tight">{stockStatus.label}</Badge>
                                    </div>
                                    <div className="text-[11px] lg:text-xs text-muted-foreground flex justify-between">
                                        <span>
                                            {product.variants.length === 1
                                                ? formatCurrency(product.variants[0].price)
                                                : `${formatCurrency(Math.min(...product.variants.map(v => v.price)))}+`}
                                        </span>
                                        <span className={
                                            totalStock === 0 ? 'text-red-600 font-medium' :
                                            totalStock <= product.minStock ? 'text-orange-600 font-medium' :
                                            'text-green-600'
                                        }>
                                            {totalStock} unit
                                        </span>
                                    </div>
                                    <div className="flex gap-1 lg:gap-1.5">
                                        <Link href={`/dashboard/products/${product.id}/edit`} className="flex-1">
                                            <Button variant="outline" size="sm" className="w-full h-6 lg:h-7 text-[11px] lg:text-xs px-1.5 lg:px-2">
                                                <Edit className="h-2.5 w-2.5 lg:h-3 lg:w-3 mr-1" />Edit
                                            </Button>
                                        </Link>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground h-6 w-6 lg:h-7 lg:w-7 p-0 shrink-0"
                                                    disabled={deletingId === product.id}
                                                >
                                                    <Trash2 className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete &quot;{product.name}&quot;? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(product.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Load More */}
            {hasMore && (
                <div className="flex justify-center">
                    <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
                        {loading ? 'Loading...' : 'Load More'}
                    </Button>
                </div>
            )}
        </div>
    );
}
