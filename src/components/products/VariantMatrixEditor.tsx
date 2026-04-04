'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, AlertCircle, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/ui/image-upload';

interface OptionValue {
    id: string;
    value: string;
}

interface Option {
    id: string;
    name: string;
    values: OptionValue[];
}

interface Variant {
    id: string;
    optionValueIds: string[];
    sku: string;
    price: number;
    cost: number;
    stock: number;
    imageUrl?: string | null;
}

interface VariantMatrixEditorProps {
    options: Option[];
    variants: Variant[];
    onOptionsChange: (options: Option[]) => void;
    onVariantsChange: (variants: Variant[]) => void;
    /** When true, hides the option-definition section and disables auto-generation. Use for edit mode. */
    hideOptions?: boolean;
}

export function VariantMatrixEditor({
    options,
    variants,
    onOptionsChange,
    onVariantsChange,
    hideOptions = false
}: VariantMatrixEditorProps) {
    const [newOptionName, setNewOptionName] = useState('');
    const [newOptionValues, setNewOptionValues] = useState<{ [key: string]: string }>({});
    const [skuSettings, setSkuSettings] = useState<{ autoGenerateSku: boolean; preview: string } | null>(null);
    const [showBulk, setShowBulk] = useState(false);
    const [bulkPrice, setBulkPrice] = useState('');
    const [bulkCost, setBulkCost] = useState('');
    const [bulkStock, setBulkStock] = useState('');

    // Keep a ref to variants so the options effect always reads the latest data
    // without needing variants in its dependency array (which would cause infinite loops)
    const variantsRef = useRef(variants);
    variantsRef.current = variants;

    // Fetch SKU settings
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

    // Generate variants when options change, preserving any edits already made.
    // Skipped in edit mode (hideOptions) since variants already exist in the DB.
    useEffect(() => {
        if (hideOptions) return;
        if (options.length > 0 && options.every(opt => opt.values.length > 0)) {
            const newVariants = generateVariantCombinations(options);

            // Preserve existing variant data if the combination exists
            const updatedVariants = newVariants.map(newVar => {
                const existing = variantsRef.current.find(v =>
                    v.optionValueIds.length === newVar.optionValueIds.length &&
                    v.optionValueIds.every(id => newVar.optionValueIds.includes(id))
                );
                return existing || newVar;
            });

            onVariantsChange(updatedVariants);
        } else {
            onVariantsChange([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options, hideOptions]);

    const generateVariantCombinations = (opts: Option[]): Variant[] => {
        if (opts.length === 0) return [];

        let combinations: string[][] = [[]];

        for (const option of opts) {
            const newCombinations: string[][] = [];
            for (const combo of combinations) {
                for (const value of option.values) {
                    newCombinations.push([...combo, value.id]);
                }
            }
            combinations = newCombinations;
        }

        return combinations.map((optionValueIds, index) => ({
            id: `temp-${Date.now()}-${index}`,
            optionValueIds,
            sku: '',
            price: 0,
            cost: 0,
            stock: 0,
            imageUrl: null
        }));
    };

    const addOption = () => {
        if (!newOptionName.trim()) return;

        const newOption: Option = {
            id: `opt-${Date.now()}`,
            name: newOptionName.trim(),
            values: []
        };

        onOptionsChange([...options, newOption]);
        setNewOptionName('');
    };

    const removeOption = (optionId: string) => {
        onOptionsChange(options.filter(opt => opt.id !== optionId));
    };

    const addOptionValue = (optionId: string) => {
        const value = newOptionValues[optionId]?.trim();
        if (!value) return;

        const updatedOptions = options.map(opt => {
            if (opt.id === optionId) {
                return {
                    ...opt,
                    values: [...opt.values, { id: `val-${Date.now()}`, value }]
                };
            }
            return opt;
        });

        onOptionsChange(updatedOptions);
        setNewOptionValues({ ...newOptionValues, [optionId]: '' });
    };

    const removeOptionValue = (optionId: string, valueId: string) => {
        const updatedOptions = options.map(opt => {
            if (opt.id === optionId) {
                return {
                    ...opt,
                    values: opt.values.filter(v => v.id !== valueId)
                };
            }
            return opt;
        });

        onOptionsChange(updatedOptions);
    };

    const updateVariant = (variantId: string, field: 'sku' | 'price' | 'cost' | 'stock' | 'imageUrl', value: string | number | null) => {
        const updatedVariants = variants.map(v => {
            if (v.id === variantId) {
                return { ...v, [field]: value };
            }
            return v;
        });

        onVariantsChange(updatedVariants);
    };

    const getVariantLabel = (variant: Variant): string => {
        return variant.optionValueIds.map(valueId => {
            for (const option of options) {
                const value = option.values.find(v => v.id === valueId);
                if (value) return value.value;
            }
            return '';
        }).join(' / ');
    };

    const applyBulkPrice = () => {
        const val = parseFloat(bulkPrice);
        if (isNaN(val)) return;
        onVariantsChange(variants.map(v => ({ ...v, price: val })));
    };

    const applyBulkCost = () => {
        const val = parseFloat(bulkCost);
        if (isNaN(val)) return;
        onVariantsChange(variants.map(v => ({ ...v, cost: val })));
    };

    const applyBulkStock = () => {
        const val = parseInt(bulkStock);
        if (isNaN(val)) return;
        onVariantsChange(variants.map(v => ({ ...v, stock: val })));
    };

    const hasEmptySkus = !skuSettings?.autoGenerateSku && variants.some(v => !v.sku.trim());
    const hasDuplicateSkus = !skuSettings?.autoGenerateSku && new Set(variants.map(v => v.sku)).size !== variants.length;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Variant Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Option Definition — hidden in edit mode */}
                {!hideOptions && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Product Options</Label>
                        <p className="text-xs text-muted-foreground">e.g., Size, Color</p>
                    </div>

                    {/* Add New Option */}
                    <div className="flex gap-2">
                        <Input
                            className="h-8 text-sm"
                            placeholder="Option name (e.g., Size)"
                            value={newOptionName}
                            onChange={(e) => setNewOptionName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                        />
                        <Button type="button" size="sm" className="h-8 px-2.5" onClick={addOption}>
                            <Plus className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {/* Existing Options */}
                    {options.map(option => (
                        <Card key={option.id} className="border">
                            <CardContent className="p-3 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold">{option.name}</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => removeOption(option.id)}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {option.values.map(value => (
                                        <Badge key={value.id} variant="secondary" className="gap-1 text-xs">
                                            {value.value}
                                            <button
                                                type="button"
                                                onClick={() => removeOptionValue(option.id, value.id)}
                                                className="ml-0.5 hover:text-destructive"
                                            >
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <Input
                                        className="h-8 text-sm"
                                        placeholder={`Add ${option.name.toLowerCase()} value`}
                                        value={newOptionValues[option.id] || ''}
                                        onChange={(e) => setNewOptionValues({
                                            ...newOptionValues,
                                            [option.id]: e.target.value
                                        })}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOptionValue(option.id))}
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 px-2.5"
                                        onClick={() => addOptionValue(option.id)}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                )}

                {/* Variant Matrix */}
                {variants.length > 0 && (
                    <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                                Variants ({variants.length})
                            </Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => setShowBulk(!showBulk)}
                            >
                                Bulk Set
                                <ChevronDown className={`h-3 w-3 transition-transform ${showBulk ? 'rotate-180' : ''}`} />
                            </Button>
                        </div>

                        {/* Bulk Set Panel */}
                        {showBulk && (
                            <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Apply to all variants</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Price (Rp)</Label>
                                        <div className="flex gap-1">
                                            <Input
                                                className="h-8 text-sm"
                                                type="number"
                                                placeholder="0"
                                                value={bulkPrice}
                                                onChange={e => setBulkPrice(e.target.value)}
                                            />
                                            <Button type="button" size="sm" className="h-8 px-2" onClick={applyBulkPrice}>✓</Button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Cost (Rp)</Label>
                                        <div className="flex gap-1">
                                            <Input
                                                className="h-8 text-sm"
                                                type="number"
                                                placeholder="0"
                                                value={bulkCost}
                                                onChange={e => setBulkCost(e.target.value)}
                                            />
                                            <Button type="button" size="sm" className="h-8 px-2" onClick={applyBulkCost}>✓</Button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Stock</Label>
                                        <div className="flex gap-1">
                                            <Input
                                                className="h-8 text-sm"
                                                type="number"
                                                placeholder="0"
                                                value={bulkStock}
                                                onChange={e => setBulkStock(e.target.value)}
                                            />
                                            <Button type="button" size="sm" className="h-8 px-2" onClick={applyBulkStock}>✓</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Validation Warnings */}
                        {(hasEmptySkus || hasDuplicateSkus) && (
                            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-3">
                                <div className="flex gap-2">
                                    <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                                    <div className="text-sm text-orange-800 dark:text-orange-200">
                                        {hasEmptySkus && <p>• Some variants are missing SKUs</p>}
                                        {hasDuplicateSkus && <p>• Duplicate SKUs detected</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Variant Cards */}
                        <div className="space-y-2.5">
                            {variants.map((variant) => (
                                <div key={variant.id} className="border rounded-lg p-3 space-y-2.5 bg-muted/20">
                                    {/* Header: option badges + image */}
                                    <div className="flex items-start gap-2">
                                        <div className="flex flex-wrap gap-1 flex-1">
                                            {variant.optionValueIds.map(id => {
                                                for (const option of options) {
                                                    const val = option.values.find(v => v.id === id);
                                                    if (val) return <Badge key={id} variant="outline" className="text-xs">{val.value}</Badge>;
                                                }
                                                return null;
                                            })}
                                        </div>
                                        <div className="w-9 h-9 shrink-0">
                                            <ImageUpload
                                                value={variant.imageUrl || undefined}
                                                onChange={(url) => updateVariant(variant.id, 'imageUrl', url)}
                                                type="product"
                                                minimal
                                            />
                                        </div>
                                    </div>

                                    {/* Fields: 2-col grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs">
                                                {skuSettings?.autoGenerateSku ? 'SKU' : 'SKU *'}
                                            </Label>
                                            <Input
                                                className="h-8 text-sm"
                                                value={skuSettings?.autoGenerateSku ? skuSettings.preview : variant.sku}
                                                onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                                                placeholder={skuSettings?.autoGenerateSku ? 'Auto-generated' : 'SKU'}
                                                required={!skuSettings?.autoGenerateSku}
                                                readOnly={skuSettings?.autoGenerateSku}
                                                disabled={skuSettings?.autoGenerateSku}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Stock *</Label>
                                            <Input
                                                className="h-8 text-sm"
                                                type="number"
                                                value={variant.stock}
                                                onChange={(e) => updateVariant(variant.id, 'stock', parseInt(e.target.value) || 0)}
                                                min={0}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Price (Rp) *</Label>
                                            <Input
                                                className="h-8 text-sm"
                                                type="number"
                                                value={variant.price}
                                                onChange={(e) => updateVariant(variant.id, 'price', parseFloat(e.target.value) || 0)}
                                                min={0}
                                                step={0.01}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Cost (Rp)</Label>
                                            <Input
                                                className="h-8 text-sm"
                                                type="number"
                                                value={variant.cost}
                                                onChange={(e) => updateVariant(variant.id, 'cost', parseFloat(e.target.value) || 0)}
                                                min={0}
                                                step={0.01}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
