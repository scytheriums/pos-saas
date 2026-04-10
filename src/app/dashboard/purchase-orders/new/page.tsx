'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Plus, Search, Trash2, Package } from 'lucide-react';
import Link from 'next/link';
import { useDebounce } from '@/hooks/use-debounce';

interface Supplier { id: string; name: string; }
interface Variant {
    id: string;
    sku: string;
    price: number;
    cost: number | null;
    product: { name: string };
}

interface LineItem {
    type: 'product';
    variantId?: string;
    variantLabel?: string;
    quantity: number;
    unitCost: number;
    updateVariantCost: boolean;
}

export default function NewPurchaseOrderPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [supplierId, setSupplierId] = useState('');
    const [expectedDate, setExpectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<LineItem[]>([]);

    // Add-item mode
    const [addMode, setAddMode] = useState<'product' | null>(null);

    // Product search
    const [variantSearch, setVariantSearch] = useState('');
    const debouncedVariantSearch = useDebounce(variantSearch, 300);
    const [variantResults, setVariantResults] = useState<Variant[]>([]);
    const [searchingVariants, setSearchingVariants] = useState(false);

    useEffect(() => {
        fetch('/api/suppliers?limit=100')
            .then(r => r.json())
            .then(d => setSuppliers(d.data ?? []));
    }, []);

    useEffect(() => {
        if (!debouncedVariantSearch.trim()) { setVariantResults([]); return; }
        setSearchingVariants(true);
        const params = new URLSearchParams({ search: debouncedVariantSearch, limit: '10', purchasable: 'true' });
        if (supplierId) params.append('supplierId', supplierId);
        fetch(`/api/products?${params}`)
            .then(r => r.json())
            .then(d => {
                const variants: Variant[] = [];
                for (const p of d.products ?? []) {
                    for (const v of p.variants ?? []) {
                        variants.push({ id: v.id, sku: v.sku, price: v.price, cost: v.cost, product: { name: p.name } });
                    }
                }
                setVariantResults(variants);
            })
            .finally(() => setSearchingVariants(false));
    }, [debouncedVariantSearch, supplierId]);

    const addProductVariant = (v: Variant) => {
        if (items.some(i => i.variantId === v.id)) return;
        setItems(prev => [...prev, {
            type: 'product',
            variantId: v.id,
            variantLabel: `${v.product.name} – ${v.sku}`,
            quantity: 1,
            unitCost: typeof v.cost === 'number' ? v.cost : v.price,
            updateVariantCost: true,
        }]);
        setVariantSearch('');
        setVariantResults([]);
        setAddMode(null);
    };

    const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

    const updateItem = (idx: number, patch: Partial<LineItem>) =>
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId) { setError('Please select a supplier'); return; }
        if (items.length === 0) { setError('Add at least one item'); return; }

        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplierId,
                    expectedDate: expectedDate || null,
                    notes: notes || null,
                    items: items.map(i => ({
                        variantId: i.variantId ?? null,
                        itemName: null,
                        unit: null,
                        quantity: i.quantity,
                        unitCost: i.unitCost,
                        updateVariantCost: i.updateVariantCost,
                    })),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Failed to create purchase order');
            router.push(`/dashboard/purchase-orders/${data.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    const totalCost = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

    return (
        <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
                <Link href="/dashboard/purchase-orders">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold">New Purchase Order</h1>
                    <p className="text-xs text-muted-foreground">Add products from a supplier</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-destructive/10 border border-destructive text-destructive px-3 py-2 rounded text-sm">
                        {error}
                    </div>
                )}

                {/* Order Details */}
                <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Order Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="supplier">Supplier <span className="text-destructive">*</span></Label>
                            <Select value={supplierId} onValueChange={v => { setSupplierId(v); setVariantSearch(''); setVariantResults([]); }}>
                                <SelectTrigger id="supplier">
                                    <SelectValue placeholder="Select a supplier..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {suppliers.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    No suppliers found.{' '}
                                    <Link href="/dashboard/suppliers/new" className="underline">Add one first.</Link>
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="expectedDate">Expected Date</Label>
                                <Input id="expectedDate" type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions..." rows={2} />
                        </div>
                    </CardContent>
                </Card>

                {/* Items */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Items</CardTitle>
                            <Button
                                type="button"
                                variant={addMode === 'product' ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => setAddMode(prev => prev === 'product' ? null : 'product')}
                            >
                                <Package className="h-3 w-3" />Add Product
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {/* Add product by search */}
                        {addMode === 'product' && (
                            <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                                <p className="text-xs font-medium">
                                    {supplierId ? 'Search products from this supplier' : 'Search product catalog'}
                                </p>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Product name or SKU..."
                                        value={variantSearch}
                                        onChange={e => setVariantSearch(e.target.value)}
                                        className="pl-8 h-9 text-sm"
                                        autoFocus
                                    />
                                    {(variantResults.length > 0 || searchingVariants) && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-md z-10 max-h-48 overflow-y-auto">
                                            {searchingVariants ? (
                                                <div className="px-3 py-2 text-xs text-muted-foreground">Searching...</div>
                                            ) : variantResults.map(v => (
                                                <button
                                                    key={v.id}
                                                    type="button"
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-2"
                                                    onClick={() => addProductVariant(v)}
                                                >
                                                    <span>
                                                        <span className="font-medium">{v.product.name}</span>
                                                        <span className="text-muted-foreground ml-2 text-xs">{v.sku}</span>
                                                    </span>
                                                    <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Items list */}
                        {items.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">
                                Use the button above to add products
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {items.map((item, idx) => (
                                    <div key={idx} className="border rounded-md p-3 space-y-2.5 bg-background">
                                        {/* Name + delete */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <Badge variant="default" className="text-[10px] px-1.5 py-0 shrink-0">Product</Badge>
                                                <p className="text-sm font-medium leading-tight">
                                                    {item.variantLabel}
                                                </p>
                                            </div>
                                            <Button
                                                type="button" variant="ghost" size="icon"
                                                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => removeItem(idx)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        {/* Qty + cost + line total */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <Label className="text-xs text-muted-foreground shrink-0">Qty</Label>
                                                <Input
                                                    type="number" min={1}
                                                    value={item.quantity}
                                                    onChange={e => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                                                    className="h-7 w-16 text-xs"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-1">
                                                <Label className="text-xs text-muted-foreground shrink-0">Unit Cost</Label>
                                                <Input
                                                    type="number" min={0} step="0.01"
                                                    value={item.unitCost}
                                                    onChange={e => updateItem(idx, { unitCost: parseFloat(e.target.value) || 0 })}
                                                    className="h-7 flex-1 text-xs"
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground shrink-0">
                                                = <span className="font-semibold text-foreground">Rp {(item.quantity * item.unitCost).toLocaleString('id-ID')}</span>
                                            </span>
                                        </div>
                                        {/* Update cost toggle (product only) */}
                                        {item.type === 'product' && (
                                            <div className="flex items-center gap-2 pt-0.5">
                                                <Checkbox
                                                    id={`update-cost-${idx}`}
                                                    checked={item.updateVariantCost}
                                                    onCheckedChange={v => updateItem(idx, { updateVariantCost: !!v })}
                                                />
                                                <Label htmlFor={`update-cost-${idx}`} className="text-xs text-muted-foreground cursor-pointer">
                                                    Update product cost when received
                                                </Label>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div className="pt-1 flex justify-end">
                                    <span className="text-sm">Total: <span className="font-semibold">Rp {totalCost.toLocaleString('id-ID')}</span></span>
                                </div>
                            </div>
                        )}

                        {items.some(i => i.type === 'product' && i.updateVariantCost) && (
                            <p className="text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                                Items with "Update product cost when received" will update the product cost automatically on stock receipt.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <div className="flex gap-2">
                    <Button type="submit" disabled={saving} className="flex-1">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {saving ? 'Creating...' : 'Create Purchase Order'}
                    </Button>
                    <Link href="/dashboard/purchase-orders">
                        <Button type="button" variant="outline">Cancel</Button>
                    </Link>
                </div>
            </form>
        </div>
    );
}

