'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Save } from 'lucide-react';
import Link from 'next/link';
import { VariantMatrixEditor } from '@/components/products/VariantMatrixEditor';
import { ProductBasicInfoCard } from '@/components/products/ProductBasicInfoCard';

export interface ProductFormVariant {
    /** Real DB id for saved variants, `temp-...` for new ones */
    id: string;
    optionValueIds: string[];
    sku: string;
    price: number;
    cost: number;
    stock: number;
    imageUrl?: string | null;
}

export interface ProductFormOption {
    /** Real DB id for saved options/values, `opt-...` / `val-...` for new ones */
    id: string;
    name: string;
    values: { id: string; value: string }[];
}

export interface ProductFormValues {
    name: string;
    description: string;
    imageUrl: string | null;
    minStock: number;
    categoryId: string | null;
    isSellable: boolean;
    isPurchasable: boolean;
    hasVariants: boolean;
    options: ProductFormOption[];
    variants: ProductFormVariant[];
}

interface ProductFormProps {
    mode: 'create' | 'edit';
    initialValues?: ProductFormValues;
    /** Throw an Error to show its message in the form */
    onSubmit: (values: ProductFormValues) => Promise<void>;
}

const EMPTY_SIMPLE_VARIANT: ProductFormVariant = {
    id: 'temp-simple',
    optionValueIds: [],
    sku: '',
    price: 0,
    cost: 0,
    stock: 0,
    imageUrl: null,
};

export function ProductForm({ mode, initialValues, onSubmit }: ProductFormProps) {
    const isEdit = mode === 'edit';
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState(initialValues?.name ?? '');
    const [description, setDescription] = useState(initialValues?.description ?? '');
    const [imageUrl, setImageUrl] = useState<string | null>(initialValues?.imageUrl ?? null);
    const [minStock, setMinStock] = useState(initialValues?.minStock ?? 10);
    const [categoryId, setCategoryId] = useState<string>(initialValues?.categoryId ?? '');
    const [isSellable, setIsSellable] = useState(initialValues?.isSellable ?? true);
    const [isPurchasable, setIsPurchasable] = useState(initialValues?.isPurchasable ?? true);

    const [hasVariants, setHasVariants] = useState(initialValues?.hasVariants ?? false);

    // Simple product (no variants). When editing a variant product, seed from its first
    // variant so switching to "simple" keeps that variant (and its sales history).
    const [simple, setSimple] = useState<ProductFormVariant>(() => {
        const first = initialValues?.variants[0];
        return first ? { ...first, optionValueIds: [] } : EMPTY_SIMPLE_VARIANT;
    });
    const updateSimple = (patch: Partial<ProductFormVariant>) => setSimple(prev => ({ ...prev, ...patch }));

    // Variant product
    const [options, setOptions] = useState<ProductFormOption[]>(initialValues?.hasVariants ? initialValues.options : []);
    const [variants, setVariants] = useState<ProductFormVariant[]>(initialValues?.hasVariants ? initialValues.variants : []);

    const [skuSettings, setSkuSettings] = useState<{ autoGenerateSku: boolean; preview: string } | null>(null);

    useEffect(() => {
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
        fetchSkuSettings();
    }, []);

    const autoSku = !!skuSettings?.autoGenerateSku;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (hasVariants && variants.length === 0) {
            setError('Add at least one option with values to create variants.');
            return;
        }

        setSaving(true);
        try {
            await onSubmit({
                name,
                description,
                imageUrl,
                minStock,
                categoryId: categoryId === '__none__' ? null : (categoryId || null),
                isSellable,
                isPurchasable,
                hasVariants,
                options: hasVariants ? options : [],
                variants: hasVariants ? variants : [{ ...simple, optionValueIds: [] }],
            });
        } catch (err) {
            setError((err instanceof Error && err.message) || (isEdit ? 'Failed to update product' : 'Failed to create product'));
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <ProductBasicInfoCard
                name={name}
                description={description}
                imageUrl={imageUrl}
                minStock={minStock}
                categoryId={categoryId}
                isSellable={isSellable}
                isPurchasable={isPurchasable}
                disabled={saving}
                onNameChange={setName}
                onDescriptionChange={setDescription}
                onImageChange={setImageUrl}
                onMinStockChange={setMinStock}
                onCategoryChange={setCategoryId}
                onIsSellableChange={setIsSellable}
                onIsPurchasableChange={setIsPurchasable}
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
                                <Label htmlFor="sku">SKU {!autoSku && '*'}</Label>
                                <Input
                                    id="sku"
                                    value={autoSku ? (simple.sku || skuSettings!.preview) : simple.sku}
                                    onChange={(e) => updateSimple({ sku: e.target.value })}
                                    placeholder={autoSku ? "Will be auto-generated" : "PROD-001"}
                                    required={!autoSku}
                                    readOnly={autoSku}
                                    className={autoSku ? "bg-muted cursor-not-allowed" : ""}
                                />
                                {autoSku && !simple.sku && (
                                    <p className="text-xs text-muted-foreground">✨ Auto-generated</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="stock">{isEdit ? 'Stock *' : 'Initial Stock *'}</Label>
                                <Input
                                    id="stock"
                                    type="number"
                                    value={simple.stock}
                                    onChange={(e) => updateSimple({ stock: parseInt(e.target.value) || 0 })}
                                    min={0}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="price">Price (Rp) *</Label>
                                <CurrencyInput
                                    id="price"
                                    value={simple.price}
                                    onValueChange={(v) => updateSimple({ price: v ?? 0 })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cost">Cost (Rp)</Label>
                                <CurrencyInput
                                    id="cost"
                                    value={simple.cost}
                                    onValueChange={(v) => updateSimple({ cost: v ?? 0 })}
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
                    <Button type="button" variant="outline" size="sm" disabled={saving}>
                        Cancel
                    </Button>
                </Link>
                <Button type="submit" size="sm" disabled={saving}>
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    {isEdit
                        ? (saving ? 'Saving...' : 'Save Changes')
                        : (saving ? 'Creating...' : 'Create Product')}
                </Button>
            </div>
        </form>
    );
}
