'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VariantMatrixEditor } from '@/components/products/VariantMatrixEditor';

interface VariantData {
    id: string;
    optionValueIds: string[];
    sku: string;
    price: number;
    cost: number;
    stock: number;
}

interface OptionData {
    id: string;
    name: string;
    values: { id: string; value: string }[];
}

export default function NewProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Basic product info
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [minStock, setMinStock] = useState(10);
    const [categoryId, setCategoryId] = useState<string>('');

    // Categories
    const [categories, setCategories] = useState<any[]>([]);

    // Fetch categories
    useEffect(() => {
        async function fetchCategories() {
            try {
                const res = await fetch('/api/categories');
                if (res.ok) {
                    const data = await res.json();
                    // Flatten tree for dropdown
                    const flatten = (cats: any[], level = 0): any[] => {
                        return cats.reduce((acc, cat) => {
                            acc.push({ ...cat, level });
                            if (cat.children?.length > 0) {
                                acc.push(...flatten(cat.children, level + 1));
                            }
                            return acc;
                        }, []);
                    };
                    setCategories(flatten(data));
                }
            } catch (error) {
                console.error('Failed to fetch categories:', error);
            }
        }
        fetchCategories();
    }, []);

    // Variant toggle
    const [hasVariants, setHasVariants] = useState(false);

    // Simple product (no variants)
    const [simpleSku, setSimpleSku] = useState('');
    const [simplePrice, setSimplePrice] = useState(0);
    const [simpleCost, setSimpleCost] = useState(0);
    const [simpleStock, setSimpleStock] = useState(0);

    // Variant product
    const [options, setOptions] = useState<OptionData[]>([]);
    const [variants, setVariants] = useState<VariantData[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload = {
                name,
                description,
                minStock,
                categoryId: categoryId === '__none__' ? null : (categoryId || null),
                hasVariants,
                ...(hasVariants ? {
                    options: options.map(opt => ({
                        name: opt.name,
                        values: opt.values.map(v => v.value)
                    })),
                    variants: variants.map(v => ({
                        optionValueIds: v.optionValueIds,
                        sku: v.sku,
                        price: v.price,
                        cost: v.cost,
                        stock: v.stock
                    }))
                } : {
                    options: [],
                    variants: [{
                        sku: simpleSku,
                        price: simplePrice,
                        cost: simpleCost,
                        stock: simpleStock
                    }]
                })
            };

            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create product');
            }

            router.push('/dashboard/products');
        } catch (err: any) {
            setError(err.message || 'Failed to create product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/products">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Create New Product</h1>
                    <p className="text-muted-foreground">Add a new product to your inventory</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Product Name *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Cotton T-Shirt"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Product description..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category (Optional)</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">No Category</SelectItem>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {'  '.repeat(cat.level)}└─ {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="minStock">Minimum Stock Threshold</Label>
                            <Input
                                id="minStock"
                                type="number"
                                value={minStock}
                                onChange={(e) => setMinStock(parseInt(e.target.value))}
                                min={0}
                            />
                            <p className="text-xs text-muted-foreground">
                                You'll be alerted when stock falls below this level
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Variant Toggle */}
                <Card>
                    <CardHeader>
                        <CardTitle>Product Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="hasVariants">Product has variants</Label>
                                <p className="text-sm text-muted-foreground">
                                    Enable if this product comes in different sizes, colors, etc.
                                </p>
                            </div>
                            <Switch
                                id="hasVariants"
                                checked={hasVariants}
                                onCheckedChange={setHasVariants}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Simple Product Form */}
                {!hasVariants && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Product Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sku">SKU *</Label>
                                    <Input
                                        id="sku"
                                        value={simpleSku}
                                        onChange={(e) => setSimpleSku(e.target.value)}
                                        placeholder="PROD-001"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="stock">Initial Stock *</Label>
                                    <Input
                                        id="stock"
                                        type="number"
                                        value={simpleStock}
                                        onChange={(e) => setSimpleStock(parseInt(e.target.value))}
                                        min={0}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="price">Price (Rp) *</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        value={simplePrice}
                                        onChange={(e) => setSimplePrice(parseFloat(e.target.value))}
                                        min={0}
                                        step={0.01}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cost">Cost (Rp)</Label>
                                    <Input
                                        id="cost"
                                        type="number"
                                        value={simpleCost}
                                        onChange={(e) => setSimpleCost(parseFloat(e.target.value))}
                                        min={0}
                                        step={0.01}
                                        placeholder="0"
                                    />
                                    <p className="text-xs text-muted-foreground">Used to calculate profit margins</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Variant Matrix Editor */}
                {hasVariants && (
                    <VariantMatrixEditor
                        options={options}
                        variants={variants}
                        onOptionsChange={setOptions}
                        onVariantsChange={setVariants}
                    />
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-4">
                    <Link href="/dashboard/products">
                        <Button type="button" variant="outline" disabled={loading}>
                            Cancel
                        </Button>
                    </Link>
                    <Button type="submit" disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? 'Creating...' : 'Create Product'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
