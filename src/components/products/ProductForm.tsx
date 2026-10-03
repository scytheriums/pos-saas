'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Save, ArrowLeft, ArrowRight, Check } from 'lucide-react';
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
    /** Form only (shared stock): 1 of this = containsQty × containsRef (an earlier unit's row id, or 'base') */
    containsQty?: number;
    containsRef?: string;
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

const STEPS = ['Basics', 'Product type', 'Prices & stock'];

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

    const [step, setStep] = useState(0);
    const [furthestStep, setFurthestStep] = useState(0);

    const goToStep = (i: number) => {
        setError(null);
        setStep(i);
        setFurthestStep(f => Math.max(f, i));
    };

    /** Check the current step before moving on */
    const nextStep = () => {
        if (step === 0 && !name.trim()) {
            setError('Give the product a name.');
            return;
        }
        goToStep(Math.min(step + 1, STEPS.length - 1));
    };

    /** Show the step a save-time problem belongs to */
    const failOn = (stepIndex: number, message: string) => {
        setStep(stepIndex);
        setFurthestStep(f => Math.max(f, stepIndex));
        setError(message);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Enter in a field while creating moves to the next step instead of saving early
        if (!isEdit && step < STEPS.length - 1) {
            nextStep();
            return;
        }
        if (!name.trim()) return failOn(0, 'Give the product a name.');
        if (!autoSku && productType === 'simple' && !simple.sku.trim()) return failOn(2, 'Add a SKU for this product.');
        if (!autoSku && productType === 'variants' && variants.some(v => !v.sku.trim())) {
            return failOn(2, 'Every variant needs a SKU.');
        }

        if (productType === 'variants' && variants.length === 0) {
            return failOn(2, 'Add at least one option with values to create variants.');
        }
        if (productType === 'pool') {
            if (!baseUnitId) return failOn(2, 'Choose the base unit the stock is counted in.');
            if (unitRows.length === 0) return failOn(2, 'Add at least one selling unit.');
            if (unitRows.some(r => !r.unitId)) return failOn(2, 'Choose a unit for every selling unit.');
            const { error: definitionError } = resolveFactors(ladderDefinitions(unitRows));
            if (definitionError) return failOn(2, `${definitionError}. Check what each selling unit contains.`);
            // SKUs live under each unit's ⋯; open the ones that still need one
            const missingSku = autoSku ? [] : unitRows.filter(r => !r.sku.trim());
            setExpandIds(missingSku.map(r => r.id));
            if (missingSku.length > 0) {
                const names = missingSku.map(r => units.find(u => u.id === r.unitId)?.name ?? 'a unit').join(', ');
                return failOn(2, `Add a SKU for ${names} (under ⋯).`);
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

    const lastStep = STEPS.length - 1;
    // Creating: walk through the steps in order. Editing: every step is open and Save is always there.
    const canOpenStep = (i: number) => isEdit || i <= furthestStep;

    return (
        // noValidate: required fields can sit on hidden steps, where the browser can't show its message; checked in handleSubmit
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Step header */}
            <ol className="grid grid-cols-3 gap-2" aria-label="Product form steps">
                {STEPS.map((label, i) => {
                    const active = i === step;
                    const done = !isEdit && i < furthestStep && !active;
                    return (
                        <li key={label}>
                            <button
                                type="button"
                                onClick={() => canOpenStep(i) && goToStep(i)}
                                disabled={!canOpenStep(i)}
                                aria-current={active ? 'step' : undefined}
                                className={`w-full flex items-center gap-2 rounded-lg border px-2 sm:px-3 py-2 text-left text-xs sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${active ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted/50'}`}
                            >
                                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${active ? 'bg-primary text-primary-foreground' : done ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                                </span>
                                <span className="truncate">{label}</span>
                            </button>
                        </li>
                    );
                })}
            </ol>

            {/* Step 1: Basics */}
            <div className={step === 0 ? 'space-y-4' : 'hidden'}>
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
                    showMinStock={false}
                />
            </div>

            {/* Step 2: Product type */}
            <div className={step === 1 ? 'space-y-4' : 'hidden'}>
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
            </div>

            {/* Step 3: Prices & stock */}
            <div className={step === 2 ? 'space-y-4' : 'hidden'}>
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

                <Card>
                    <CardContent className="pt-6 space-y-1.5">
                        <Label htmlFor="minStock">Low-stock alert</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="minStock"
                                type="number"
                                className="w-32"
                                min={0}
                                value={minStock}
                                onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                            />
                            <span className="text-sm text-muted-foreground">
                                {productType === 'pool' ? (baseAbbr ?? 'base units') : 'units'}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">You&apos;ll be alerted when stock falls to this level or below.</p>
                    </CardContent>
                </Card>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    {step > 0 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => goToStep(step - 1)} disabled={saving}>
                            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/products">
                        <Button type="button" variant="outline" size="sm" disabled={saving}>
                            Cancel
                        </Button>
                    </Link>
                    {step < lastStep && (
                        <Button type="button" size="sm" variant={isEdit ? 'outline' : 'default'} onClick={nextStep} disabled={saving}>
                            Next <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                    )}
                    {(isEdit || step === lastStep) && (
                        <Button type="submit" size="sm" disabled={saving}>
                            <Save className="mr-1.5 h-3.5 w-3.5" />
                            {isEdit
                                ? (saving ? 'Saving...' : 'Save Changes')
                                : (saving ? 'Creating...' : 'Create Product')}
                        </Button>
                    )}
                </div>
            </div>
        </form>
    );
}
