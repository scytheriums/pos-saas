'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VariantMatrixEditor } from '@/components/products/VariantMatrixEditor';
import { ProductBasicInfoCard } from '@/components/products/ProductBasicInfoCard';

interface VariantData {
    id: string;
    optionValueIds: string[];
    sku: string;
    price: number;
    cost: number;
    stock: number;
    imageUrl?: string | null;
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

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [minStock, setMinStock] = useState(10);
    const [categoryId, setCategoryId] = useState<string>('');

    // SKU Settings
    const [skuSettings, setSkuSettings] = useState<{ autoGenerateSku: boolean; preview: string } | null>(null);

    useEffect(() => {
        fetchSkuSettings();
    }, []);

    // Fetch SKU settings
    async function fetchSkuSettings() {
        try {
            const res = await fetch('/api/settings/sku');
            if (res.ok) {
                const data = await res.json();
                setSkuSettings({
                    autoGenerateSku: data.autoGenerateSku,
                    preview: data.preview
                });
            }
        } catch (error) {
            console.error('Failed to fetch SKU settings:', error);
        }
    }

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
                imageUrl,
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
                        sku: skuSettings?.autoGenerateSku ? '' : v.sku,
                        price: v.price,
                        cost: v.cost,
                        stock: v.stock,
                        imageUrl: v.imageUrl
                    }))
                } : {
                    options: [],
                    variants: [{
                        sku: skuSettings?.autoGenerateSku ? '' : simpleSku,
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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold">Create New Product</h1>
                    <p className="text-xs text-muted-foreground">Add a new product to your inventory</p>
                </div>
                <Link href="/dashboard/products">
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back
                    </Button>
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Information */}
                <ProductBasicInfoCard
                    name={name}
                    description={description}
                    imageUrl={imageUrl}
                    minStock={minStock}
                    categoryId={categoryId}
                    disabled={loading}
                    onNameChange={setName}
                    onDescriptionChange={setDescription}
                    onImageChange={setImageUrl}
                    onMinStockChange={setMinStock}
                    onCategoryChange={setCategoryId}
                />

                {/* Variant Toggle */}
                <Card>
                    <CardHeader>
                        <CardTitle>Product Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="hasVariants">Product has variants</Label>
                                <p className="text-xs text-muted-foreground">
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
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="sku">SKU {!skuSettings?.autoGenerateSku && '*'}</Label>
                                    <Input
                                        id="sku"
                                        value={skuSettings?.autoGenerateSku ? skuSettings.preview : simpleSku}
                                        onChange={(e) => setSimpleSku(e.target.value)}
                                        placeholder={skuSettings?.autoGenerateSku ? "Will be auto-generated" : "PROD-001"}
                                        required={!skuSettings?.autoGenerateSku}
                                        readOnly={skuSettings?.autoGenerateSku}
                                        className={skuSettings?.autoGenerateSku ? "bg-muted cursor-not-allowed" : ""}
                                    />
                                    {skuSettings?.autoGenerateSku && (
                                        <p className="text-xs text-muted-foreground">✨ Auto-generated</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
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
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
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
                                <div className="space-y-1.5">
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
                <div className="flex justify-end gap-2">
                    <Link href="/dashboard/products">
                        <Button type="button" variant="outline" size="sm" disabled={loading}>
                            Cancel
                        </Button>
                    </Link>
                    <Button type="submit" size="sm" disabled={loading}>
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        {loading ? 'Creating...' : 'Create Product'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
