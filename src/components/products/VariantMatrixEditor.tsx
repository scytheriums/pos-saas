'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, X, AlertCircle } from 'lucide-react';
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
}

export function VariantMatrixEditor({
    options,
    variants,
    onOptionsChange,
    onVariantsChange
}: VariantMatrixEditorProps) {
    const [newOptionName, setNewOptionName] = useState('');
    const [newOptionValues, setNewOptionValues] = useState<{ [key: string]: string }>({});
    const [skuSettings, setSkuSettings] = useState<{ autoGenerateSku: boolean; preview: string } | null>(null);

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

    // Generate variants when options change
    useEffect(() => {
        if (options.length > 0 && options.every(opt => opt.values.length > 0)) {
            const newVariants = generateVariantCombinations(options);

            // Preserve existing variant data if the combination exists
            const updatedVariants = newVariants.map(newVar => {
                const existing = variants.find(v =>
                    v.optionValueIds.length === newVar.optionValueIds.length &&
                    v.optionValueIds.every(id => newVar.optionValueIds.includes(id))
                );
                return existing || newVar;
            });

            onVariantsChange(updatedVariants);
        } else {
            onVariantsChange([]);
        }
    }, [options]);

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

    const bulkSetPrice = () => {
        const price = prompt('Enter price for all variants:');
        if (price === null) return;

        const priceNum = parseFloat(price);
        if (isNaN(priceNum)) return;

        const updatedVariants = variants.map(v => ({ ...v, price: priceNum }));
        onVariantsChange(updatedVariants);
    };

    const bulkSetCost = () => {
        const cost = prompt('Enter cost for all variants:');
        if (cost === null) return;

        const costNum = parseFloat(cost);
        if (isNaN(costNum)) return;

        const updatedVariants = variants.map(v => ({ ...v, cost: costNum }));
        onVariantsChange(updatedVariants);
    };

    const bulkSetStock = () => {
        const stock = prompt('Enter stock for all variants:');
        if (stock === null) return;

        const stockNum = parseInt(stock);
        if (isNaN(stockNum)) return;

        const updatedVariants = variants.map(v => ({ ...v, stock: stockNum }));
        onVariantsChange(updatedVariants);
    };

    const hasEmptySkus = variants.some(v => !v.sku.trim());
    const hasDuplicateSkus = new Set(variants.map(v => v.sku)).size !== variants.length;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Variant Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Option Definition */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>Product Options</Label>
                        <p className="text-sm text-muted-foreground">
                            e.g., Size, Color, Material
                        </p>
                    </div>

                    {/* Add New Option */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Option name (e.g., Size)"
                            value={newOptionName}
                            onChange={(e) => setNewOptionName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                        />
                        <Button type="button" onClick={addOption}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Existing Options */}
                    {options.map(option => (
                        <Card key={option.id} className="border-2">
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">{option.name}</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeOption(option.id)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Option Values */}
                                <div className="flex flex-wrap gap-2">
                                    {option.values.map(value => (
                                        <Badge key={value.id} variant="secondary" className="gap-1">
                                            {value.value}
                                            <button
                                                type="button"
                                                onClick={() => removeOptionValue(option.id, value.id)}
                                                className="ml-1 hover:text-destructive"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>

                                {/* Add Value */}
                                <div className="flex gap-2">
                                    <Input
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
                                        onClick={() => addOptionValue(option.id)}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Variant Matrix */}
                {variants.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-base">Variant Matrix</Label>
                                <p className="text-sm text-muted-foreground">
                                    {variants.length} variant{variants.length !== 1 ? 's' : ''} generated
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={bulkSetPrice}>
                                    Bulk Set Price
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={bulkSetCost}>
                                    Bulk Set Cost
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={bulkSetStock}>
                                    Bulk Set Stock
                                </Button>
                            </div>
                        </div>

                        {/* Validation Warnings */}
                        {(hasEmptySkus || hasDuplicateSkus) && (
                            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-3">
                                <div className="flex gap-2">
                                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                    <div className="text-sm text-orange-800 dark:text-orange-200">
                                        {hasEmptySkus && <p>• Some variants are missing SKUs</p>}
                                        {hasDuplicateSkus && <p>• Duplicate SKUs detected</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Variant Table */}
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variant</TableHead>
                                        <TableHead className="w-[80px]">Image</TableHead>
                                        <TableHead>SKU {!skuSettings?.autoGenerateSku && '*'}</TableHead>
                                        <TableHead>Price (Rp) *</TableHead>
                                        <TableHead>Cost (Rp)</TableHead>
                                        <TableHead>Stock *</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {variants.map((variant, index) => (
                                        <TableRow key={variant.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-wrap gap-1">
                                                    {variant.optionValueIds.map(id => {
                                                        for (const option of options) {
                                                            const val = option.values.find(v => v.id === id);
                                                            if (val) return <Badge key={id} variant="outline" className="text-xs">{val.value}</Badge>;
                                                        }
                                                        return null;
                                                    })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="w-10 h-10">
                                                    <ImageUpload
                                                        value={variant.imageUrl || undefined}
                                                        onChange={(url) => updateVariant(variant.id, 'imageUrl', url)}
                                                        type="product"
                                                        minimal
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={skuSettings?.autoGenerateSku ? `${skuSettings.preview}-${index + 1}` : variant.sku}
                                                    onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                                                    placeholder={skuSettings?.autoGenerateSku ? "Auto-generated" : "SKU"}
                                                    required={!skuSettings?.autoGenerateSku}
                                                    readOnly={skuSettings?.autoGenerateSku}
                                                    className={skuSettings?.autoGenerateSku ? "bg-muted cursor-not-allowed" : ""}
                                                />
                                                {skuSettings?.autoGenerateSku && (
                                                    <p className="text-xs text-muted-foreground mt-1">✨ Auto-generated</p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={variant.price}
                                                    onChange={(e) => updateVariant(variant.id, 'price', parseFloat(e.target.value))}
                                                    min={0}
                                                    step={0.01}
                                                    required
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={variant.cost}
                                                    onChange={(e) => updateVariant(variant.id, 'cost', parseFloat(e.target.value))}
                                                    min={0}
                                                    step={0.01}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={variant.stock}
                                                    onChange={(e) => updateVariant(variant.id, 'stock', parseInt(e.target.value))}
                                                    min={0}
                                                    required
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
