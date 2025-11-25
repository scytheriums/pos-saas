'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Search,
    Package,
    AlertTriangle,
    Edit,
    Trash2,
    Filter,
} from 'lucide-react';
import Link from 'next/link';
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
    const [page, setPage] = useState(1);
    const limit = 20;
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const fetchProducts = async (pageNumber: number, search: string, reset: boolean = false) => {
        try {
            const params = new URLSearchParams({
                page: pageNumber.toString(),
                limit: limit.toString(),
            });
            if (search) {
                params.append('search', search);
            }

            const response = await fetch(`/api/products?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch products');
            }
            const data = await response.json();
            // data: { products, total, page, limit }
            setProducts(prev => reset ? data.products : [...prev, ...data.products]);
            setTotal(data.total);
            setPage(data.page);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchProducts(1, '', true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Search effect
    useEffect(() => {
        // Reset page to 1 when search changes
        setPage(1);
        fetchProducts(1, debouncedSearch, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const loadMore = () => {
        if (products.length < total) {
            fetchProducts(page + 1, debouncedSearch, false);
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

    const filteredProducts = products;

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
            <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                        <Skeleton key={i} className="h-48" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
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
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Products</h1>
                    <p className="text-muted-foreground">Manage your inventory and product catalog</p>
                </div>
                <Link href="/dashboard/products/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Product
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                        <p className="text-xs text-muted-foreground">Total across all pages</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Stock</CardTitle>
                        <Package className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {stats.total - stats.lowStock - stats.outOfStock}
                        </div>
                        <p className="text-xs text-muted-foreground">Visible items</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.lowStock}</div>
                        <p className="text-xs text-muted-foreground">Need restocking</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
                        <p className="text-xs text-muted-foreground">Urgent</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search products by name or SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                </Button>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 && !loading ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Package className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            {searchQuery ? 'No products found' : 'No products yet'}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            {searchQuery
                                ? 'Try adjusting your search query'
                                : 'Get started by adding your first product'}
                        </p>
                        {!searchQuery && (
                            <Link href="/dashboard/products/new">
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Product
                                </Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredProducts.map((product) => {
                        const stockStatus = getStockStatus(product);
                        const totalStock = getTotalStock(product);
                        return (
                            <Card key={product.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                                {/* Product Image */}
                                {product.imageUrl && (
                                    <div className="w-full h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-base">{product.name}</CardTitle>
                                            {product.description && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                    {product.description}
                                                </p>
                                            )}
                                        </div>
                                        <Badge variant={stockStatus.variant} className="text-[10px] px-1.5 py-0.5">{stockStatus.label}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-2">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Variants</span>
                                            <span className="font-medium">{product.variants.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Total Stock</span>
                                            <span
                                                className={`font-medium ${totalStock === 0
                                                    ? 'text-red-600'
                                                    : totalStock <= product.minStock
                                                        ? 'text-orange-600'
                                                        : 'text-green-600'
                                                    }`}
                                            >
                                                {totalStock} units
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Price Range</span>
                                            <span className="font-medium">
                                                {product.variants.length === 1
                                                    ? formatCurrency(product.variants[0].price)
                                                    : `${formatCurrency(
                                                        Math.min(...product.variants.map((v) => v.price))
                                                    )} - ${formatCurrency(
                                                        Math.max(...product.variants.map((v) => v.price))
                                                    )}`}
                                            </span>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <Link href={`/dashboard/products/${product.id}/edit`} className="flex-1">
                                                <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                                                    <Edit className="mr-2 h-3 w-3" />
                                                    Edit
                                                </Button>
                                            </Link>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground h-8 w-8 p-0"
                                                        disabled={deletingId === product.id}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(product.id)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Load More Button */}
            {products.length < total && (
                <div className="flex justify-center mt-6">
                    <Button onClick={loadMore} disabled={loading}>
                        {loading ? 'Loading...' : 'Load More'}
                    </Button>
                </div>
            )}
        </div>
    );
}
