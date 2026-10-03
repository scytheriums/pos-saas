'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Save } from 'lucide-react';
import Link from 'next/link';
import { VariantMatrixEditor } from '@/components/products/VariantMatrixEditor';
import { ProductBasicInfoCard } from '@/components/products/ProductBasicInfoCard';
import { SellingUnitsEditor, UnitOption } from '@/components/products/SellingUnitsEditor';
import { availableUnits, inferLadder, ladderDefinitions, resolveFactors } from '@/lib/stock-math';

export interface ProductFormVariant {
    /** Real DB id for saved variants, `temp-...` for new ones */
    id: string;
    optionValueIds: string[];
    sku: string;
    price: number;
    cost: number;
    stock: number;
    imageUrl?: string | null;
    /** Shared-stock products: the selling unit and how many base units it holds */
    unitId?: string | null;
    conversionFactor?: number;
    /** Form only (shared stock): 1 of this = containsQty × the unit above it, or × base units if countInBase */
    containsQty?: number;
    countInBase?: boolean;
    /** Form only: price follows the unit below × size until the user types one */
    priceAuto?: boolean;
}

export interface ProductFormOption {
    /** Real DB id for saved options/values, `opt-...` / `val-...` for new ones */
    id: string;
    name: string;
    values: { id: string; value: string }[];
}

export type StockModeValue = 'PER_VARIANT' | 'SHARED_POOL';

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
    stockMode: StockModeValue;
    /** SHARED_POOL only */
    baseUnitId: string | null;
    sharedStock: number;
    poolCost: number;
}

interface ProductFormProps {
    mode: 'create' | 'edit';
    initialValues?: ProductFormValues;
    /** Throw an Error to show its message in the form */
    onSubmit: (values: ProductFormValues) => Promise<void>;
}

/** What kind of product this is; decides which editor is shown */
type ProductType = 'simple' | 'variants' | 'pool';

const EMPTY_SIMPLE_VARIANT: ProductFormVariant = {
    id: 'temp-simple',
    optionValueIds: [],
    sku: '',
    price: 0,
    cost: 0,
    stock: 0,
    imageUrl: null,
};

const PRODUCT_TYPES: { value: ProductType; title: string; description: string }[] = [
    { value: 'simple', title: 'Single item', description: 'One price, one stock count' },
    { value: 'variants', title: 'Variants', description: 'Sizes, colours… each with its own stock' },
    { value: 'pool', title: 'Pack sizes, shared stock', description: 'e.g. 1 pcs, Tray of 30, Box of 180 from one stock count' },
];

/** Order saved units small → big and describe each in terms of the one below (Box 144 pcs → "12 × Pack") */
function withDefinitions(rows: ProductFormVariant[]): ProductFormVariant[] {
    return inferLadder(rows).map(r => ({ ...r, priceAuto: false }));
}

function initialType(v?: ProductFormValues): ProductType {
    if (!v) return 'simple';
    if (v.stockMode === 'SHARED_POOL') return 'pool';
    return v.hasVariants ? 'variants' : 'simple';
}

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

    const [productType, setProductType] = useState<ProductType>(() => initialType(initialValues));
    const startType = initialType(initialValues);

    // Simple product (no variants). When editing a variant product, seed from its first
    // variant so switching to "simple" keeps that variant (and its sales history).
    const [simple, setSimple] = useState<ProductFormVariant>(() => {
        const first = initialValues?.variants[0];
        return first ? { ...first, optionValueIds: [] } : EMPTY_SIMPLE_VARIANT;
    });
    const updateSimple = (patch: Partial<ProductFormVariant>) => setSimple(prev => ({ ...prev, ...patch }));

    // Variant product (per-variant stock)
    const [options, setOptions] = useState<ProductFormOption[]>(startType === 'variants' ? initialValues!.options : []);
    const [variants, setVariants] = useState<ProductFormVariant[]>(startType === 'variants' ? initialValues!.variants : []);

    // Shared stock pool
    const [baseUnitId, setBaseUnitId] = useState<string>(initialValues?.baseUnitId ?? '');
    const [sharedStock, setSharedStock] = useState(initialValues?.sharedStock ?? 0);
    const [poolCost, setPoolCost] = useState(initialValues?.poolCost ?? 0);
    const [unitRows, setUnitRows] = useState<ProductFormVariant[]>(startType === 'pool' ? withDefinitions(initialValues!.variants) : []);
    const [units, setUnits] = useState<UnitOption[]>([]);
    const [expandIds, setExpandIds] = useState<string[]>([]);

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
        async function fetchUnits() {
            try {
                const res = await fetch('/api/units');
                if (res.ok) {
                    const data = await res.json();
                    setUnits(data.data ?? []);
                }
            } catch (error) {
                console.error('Failed to fetch units:', error);
            }
        }
        fetchSkuSettings();
        fetchUnits();
    }, []);

    const autoSku = !!skuSettings?.autoGenerateSku;

    /**
     * Change product type, carrying stock across so nothing is silently lost.
     * Existing variant ids are kept where possible, so sales history stays attached.
     */
    const changeType = (next: ProductType) => {
        if (next === productType) return;

        if (next === 'pool' && unitRows.length === 0) {
            const source = productType === 'variants' ? variants : [simple];
            const pcs = units.find(u => u.abbreviation.toLowerCase() === 'pcs');
            setUnitRows(withDefinitions(source.map(v => ({ ...v, optionValueIds: [], unitId: v.unitId ?? pcs?.id ?? null, conversionFactor: 1 }))));
            setSharedStock(source.reduce((sum, v) => sum + v.stock, 0));
            setPoolCost(source[0]?.cost ?? 0);
            if (!baseUnitId && pcs) setBaseUnitId(pcs.id);
        }

        if (productType === 'pool' && next === 'simple') {
            // Keep the 1:1 unit (or the smallest) as the single item, holding the whole pool
            const base = [...unitRows].sort((a, b) => (a.conversionFactor ?? 1) - (b.conversionFactor ?? 1))[0];
            if (base) {
                const factor = base.conversionFactor ?? 1;
                setSimple({ ...base, stock: availableUnits(sharedStock, factor), cost: poolCost * factor });
            }
        }

        setProductType(next);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (productType === 'variants' && variants.length === 0) {
            setError('Add at least one option with values to create variants.');
            return;
        }
        if (productType === 'pool') {
            if (!baseUnitId) return setError('Choose the base unit the stock is counted in.');
            if (unitRows.length === 0) return setError('Add at least one selling unit.');
            if (unitRows.some(r => !r.unitId)) return setError('Choose a unit for every selling unit.');
            const { error: definitionError } = resolveFactors(ladderDefinitions(unitRows));
            if (definitionError) return setError(`${definitionError}. Check what each selling unit contains.`);
            // SKUs live under each unit's ⋯; open the ones that still need one
            const missingSku = autoSku ? [] : unitRows.filter(r => !r.sku.trim());
            setExpandIds(missingSku.map(r => r.id));
            if (missingSku.length > 0) {
                const names = missingSku.map(r => units.find(u => u.id === r.unitId)?.name ?? 'a unit').join(', ');
                return setError(`Add a SKU for ${names} (under ⋯).`);
            }
        }

        setSaving(true);
        try {
            const pooled = productType === 'pool';
            await onSubmit({
                name,
                description,
                imageUrl,
                minStock,
                categoryId: categoryId === '__none__' ? null : (categoryId || null),
                isSellable,
                isPurchasable,
                hasVariants: productType !== 'simple',
                options: productType === 'variants' ? options : [],
                variants: productType === 'variants' ? variants
                    : pooled ? unitRows
                    : [{ ...simple, optionValueIds: [] }],
                stockMode: pooled ? 'SHARED_POOL' : 'PER_VARIANT',
                baseUnitId: pooled ? baseUnitId : null,
                sharedStock: pooled ? sharedStock : 0,
                poolCost: pooled ? poolCost : 0,
            });
        } catch (err) {
            setError((err instanceof Error && err.message) || (isEdit ? 'Failed to update product' : 'Failed to create product'));
            setSaving(false);
        }
    };

    const baseAbbr = units.find(u => u.id === baseUnitId)?.abbreviation;

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

            {/* Product Type */}
            <Card>
                <CardHeader>
                    <CardTitle>Product Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <RadioGroup
                        value={productType}
                        onValueChange={(v) => changeType(v as ProductType)}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                    >
                        {PRODUCT_TYPES.map(t => (
                            <Label
                                key={t.value}
                                htmlFor={`type-${t.value}`}
                                className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer font-normal transition-colors ${productType === t.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                            >
                                <RadioGroupItem id={`type-${t.value}`} value={t.value} className="mt-0.5" />
                                <span className="space-y-0.5">
                                    <span className="block text-sm font-medium">{t.title}</span>
                                    <span className="block text-xs text-muted-foreground">{t.description}</span>
                                </span>
                            </Label>
                        ))}
                    </RadioGroup>
                    {productType === 'pool' && (
                        <p className="text-xs text-muted-foreground">
                            Minimum stock above is counted in {baseAbbr ?? 'the base unit'}.
                        </p>
                    )}
                    {isEdit && startType === 'pool' && productType === 'variants' && (
                        <p className="text-xs text-amber-700">
                            Switching to variants removes the selling units and their shared stock. Units with sales history can&apos;t be removed.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Simple Product Form */}
            {productType === 'simple' && (
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
            {productType === 'variants' && (
                <VariantMatrixEditor
                    options={options}
                    variants={variants}
                    onOptionsChange={setOptions}
                    onVariantsChange={setVariants}
                />
            )}

            {/* Shared stock pool with selling units */}
            {productType === 'pool' && (
                <SellingUnitsEditor
                    units={units}
                    baseUnitId={baseUnitId}
                    sharedStock={sharedStock}
                    poolCost={poolCost}
                    rows={unitRows}
                    autoSku={autoSku}
                    skuPreview={skuSettings?.preview ?? ''}
                    isEdit={isEdit}
                    expandIds={expandIds}
                    onBaseUnitChange={setBaseUnitId}
                    onSharedStockChange={setSharedStock}
                    onPoolCostChange={setPoolCost}
                    onRowsChange={setUnitRows}
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
