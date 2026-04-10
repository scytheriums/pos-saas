'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Package, ShoppingBag, Eye, X, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PAYMENT_TERMS = ['Net 30', 'Net 60', 'Net 90', 'COD', 'Prepaid', 'Other'];

type POStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
const STATUS_CONFIG: Record<POStatus, { label: string; className: string }> = {
    DRAFT:              { label: 'Draft',    className: 'bg-secondary text-secondary-foreground' },
    SENT:               { label: 'Sent',     className: 'bg-blue-100 text-blue-700' },
    PARTIALLY_RECEIVED: { label: 'Partial',  className: 'bg-yellow-100 text-yellow-700' },
    RECEIVED:           { label: 'Received', className: 'bg-green-100 text-green-700' },
    CANCELLED:          { label: 'Cancelled',className: 'bg-red-100 text-red-700' },
};

interface AssignedProduct {
    id: string;
    name: string;
    imageUrl: string | null;
    variants: { id: string; sku: string; stock: number; price: number }[];
}

interface PurchaseOrder {
    id: string;
    status: POStatus;
    createdAt: string;
    expectedDate: string | null;
    _count: { items: number };
}

export default function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [supplierId, setSupplierId] = useState<string>('');

    const [form, setForm] = useState({
        name: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        paymentTerms: '',
        notes: '',
    });

    // Assigned products state
    const [products, setProducts] = useState<AssignedProduct[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [assignMode, setAssignMode] = useState(false);
    const [assignSearch, setAssignSearch] = useState('');
    const [assignResults, setAssignResults] = useState<AssignedProduct[]>([]);
    const [assignSearching, setAssignSearching] = useState(false);
    const assignDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Purchase orders state
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);

    const set = (field: string, value: string) =>
        setForm(prev => ({ ...prev, [field]: value }));

    useEffect(() => {
        params.then(({ id }) => {
            setSupplierId(id);
            fetch(`/api/suppliers/${id}`)
                .then(res => res.json())
                .then(data => {
                    setForm({
                        name: data.name ?? '',
                        contactName: data.contactName ?? '',
                        phone: data.phone ?? '',
                        email: data.email ?? '',
                        address: data.address ?? '',
                        paymentTerms: data.paymentTerms ?? '',
                        notes: data.notes ?? '',
                    });
                })
                .catch(() => setError('Failed to load supplier'))
                .finally(() => setLoading(false));

            // Fetch assigned products
            setProductsLoading(true);
            fetch(`/api/products?supplierId=${id}&limit=50&isPurchasable=true`)
                .then(res => res.json())
                .then(data => setProducts(data.products ?? []))
                .catch(() => {})
                .finally(() => setProductsLoading(false));

            // Fetch purchase orders
            setOrdersLoading(true);
            fetch(`/api/purchase-orders?supplierId=${id}&limit=10`)
                .then(res => res.json())
                .then(data => setOrders(data.data ?? []))
                .catch(() => {})
                .finally(() => setOrdersLoading(false));
        });
    }, [params]);

    // Debounced product search for assign
    useEffect(() => {
        if (!assignMode) return;
        if (assignDebounceRef.current) clearTimeout(assignDebounceRef.current);
        if (!assignSearch.trim()) { setAssignResults([]); return; }
        assignDebounceRef.current = setTimeout(async () => {
            setAssignSearching(true);
            try {
                const res = await fetch(`/api/products?search=${encodeURIComponent(assignSearch)}&limit=8&isPurchasable=true`);
                const data = await res.json();
                // Filter out already-assigned
                const assignedIds = new Set(products.map(p => p.id));
                setAssignResults((data.products ?? []).filter((p: AssignedProduct) => !assignedIds.has(p.id)));
            } finally {
                setAssignSearching(false);
            }
        }, 300);
    }, [assignSearch, assignMode, products]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { setError('Supplier name is required'); return; }

        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/suppliers/${supplierId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Failed to update supplier');
            router.push('/dashboard/suppliers');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    const assignProduct = async (product: AssignedProduct) => {
        try {
            const res = await fetch(`/api/products/${product.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supplierId }),
            });
            if (!res.ok) return;
            setProducts(prev => [...prev, product]);
            setAssignSearch('');
            setAssignResults([]);
            setAssignMode(false);
        } catch {}
    };

    const unassignProduct = async (productId: string) => {
        try {
            const res = await fetch(`/api/products/${productId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supplierId: null }),
            });
            if (!res.ok) return;
            setProducts(prev => prev.filter(p => p.id !== productId));
        } catch {}
    };

    const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : '—';

    if (loading) {
        return (
            <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="space-y-1">
                        <Skeleton className="h-6 w-36" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                </div>
                <Card>
                    <CardContent className="p-6 space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
                    </CardContent>
                </Card>
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/dashboard/suppliers">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold">Edit Supplier</h1>
                    <p className="text-xs text-muted-foreground">Update supplier information</p>
                </div>
            </div>

            <Tabs defaultValue="details">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="products">
                        Products{products.length > 0 ? ` (${products.length})` : ''}
                    </TabsTrigger>
                    <TabsTrigger value="orders">Orders</TabsTrigger>
                </TabsList>

            {/* Details Tab */}
            <TabsContent value="details">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Supplier Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-destructive/10 border border-destructive text-destructive px-3 py-2 rounded text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="name">Supplier Name <span className="text-destructive">*</span></Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={e => set('name', e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="contactName">Contact Name</Label>
                            <Input
                                id="contactName"
                                value={form.contactName}
                                onChange={e => set('contactName', e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={form.phone}
                                    onChange={e => set('phone', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.email}
                                    onChange={e => set('email', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="paymentTerms">Payment Terms</Label>
                            <Select value={form.paymentTerms} onValueChange={val => set('paymentTerms', val)}>
                                <SelectTrigger id="paymentTerms">
                                    <SelectValue placeholder="Select terms..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_TERMS.map(t => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="address">Address</Label>
                            <Textarea
                                id="address"
                                value={form.address}
                                onChange={e => set('address', e.target.value)}
                                rows={2}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={form.notes}
                                onChange={e => set('notes', e.target.value)}
                                rows={2}
                            />
                        </div>

                        <div className="flex gap-2 pt-1">
                            <Button type="submit" disabled={saving} className="flex-1">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Link href="/dashboard/suppliers">
                                <Button type="button" variant="outline">Cancel</Button>
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>

            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products">
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">Assigned Products</CardTitle>
                            {!productsLoading && (
                                <Badge variant="secondary" className="text-xs">{products.length}</Badge>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1.5"
                            onClick={() => { setAssignMode(v => !v); setAssignSearch(''); setAssignResults([]); }}
                        >
                            {assignMode ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            {assignMode ? 'Cancel' : 'Assign'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Assign search */}
                    {assignMode && (
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search products to assign..."
                                    value={assignSearch}
                                    onChange={e => setAssignSearch(e.target.value)}
                                    className="pl-8 h-8 text-sm"
                                    autoFocus
                                />
                            </div>
                            {assignSearching && <p className="text-xs text-muted-foreground">Searching...</p>}
                            {!assignSearching && assignResults.length > 0 && (
                                <div className="border rounded-md divide-y">
                                    {assignResults.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 text-left"
                                            onClick={() => assignProduct(p)}
                                        >
                                            <span className="font-medium">{p.name}</span>
                                            <span className="text-xs text-muted-foreground">{p.variants.length} variant{p.variants.length !== 1 ? 's' : ''}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {!assignSearching && assignSearch.trim() && assignResults.length === 0 && (
                                <p className="text-xs text-muted-foreground">No unassigned products found</p>
                            )}
                        </div>
                    )}

                    {/* Products list */}
                    {productsLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : products.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No products assigned to this supplier yet.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {products.map(product => {
                                const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
                                const prices = product.variants.map(v => Number(v.price));
                                const minPrice = Math.min(...prices);
                                const maxPrice = Math.max(...prices);
                                const priceLabel = minPrice === maxPrice
                                    ? `Rp ${minPrice.toLocaleString('id-ID')}`
                                    : `Rp ${minPrice.toLocaleString('id-ID')} – ${maxPrice.toLocaleString('id-ID')}`;
                                return (
                                    <div key={product.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{product.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''} · stock {totalStock} · {priceLabel}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Link href={`/dashboard/products`}>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                    <Eye className="h-3 w-3" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => unassignProduct(product.id)}
                                                title="Unassign"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">Purchase Order History</CardTitle>
                        </div>
                        <Link href={`/dashboard/purchase-orders?supplierId=${supplierId}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                                <Eye className="h-3 w-3" />View All
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    {ordersLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : orders.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No purchase orders found for this supplier.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {orders.map(order => {
                                const cfg = STATUS_CONFIG[order.status];
                                return (
                                    <div key={order.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Badge className={`text-[10px] px-1.5 py-0 ${cfg.className}`}>{cfg.label}</Badge>
                                                <span className="text-xs text-muted-foreground">{order._count.items} item{order._count.items !== 1 ? 's' : ''}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Created {formatDate(order.createdAt)}
                                                {order.expectedDate && ` · Expected ${formatDate(order.expectedDate)}`}
                                            </p>
                                        </div>
                                        <Link href={`/dashboard/purchase-orders/${order.id}`}>
                                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Eye className="h-3 w-3" />View</Button>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
            </TabsContent>
            </Tabs>
        </div>
    );
}


