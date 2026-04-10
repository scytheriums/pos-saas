'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ImageUpload } from '@/components/ui/image-upload';

interface ProductBasicInfoCardProps {
    name: string;
    description: string;
    imageUrl: string | null;
    minStock: number;
    categoryId: string;
    isSellable?: boolean;
    isPurchasable?: boolean;
    disabled?: boolean;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onImageChange: (url: string | null) => void;
    onMinStockChange: (value: number) => void;
    onCategoryChange: (value: string) => void;
    onIsSellableChange?: (value: boolean) => void;
    onIsPurchasableChange?: (value: boolean) => void;
}

export function ProductBasicInfoCard({
    name,
    description,
    imageUrl,
    minStock,
    categoryId,
    isSellable = true,
    isPurchasable = true,
    disabled,
    onNameChange,
    onDescriptionChange,
    onImageChange,
    onMinStockChange,
    onCategoryChange,
    onIsSellableChange,
    onIsPurchasableChange,
}: ProductBasicInfoCardProps) {
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        async function fetchCategories() {
            try {
                const res = await fetch('/api/categories');
                if (res.ok) {
                    const data = await res.json();
                    const flatten = (cats: any[], level = 0): any[] =>
                        cats.reduce((acc: any[], cat: any) => {
                            acc.push({ ...cat, level });
                            if (cat.children?.length > 0) acc.push(...flatten(cat.children, level + 1));
                            return acc;
                        }, []);
                    setCategories(flatten(data));
                }
            } catch (error) {
                console.error('Failed to fetch categories:', error);
            }
        }
        fetchCategories();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="space-y-1.5">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        placeholder="e.g., Cotton T-Shirt"
                        required
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        placeholder="Product description..."
                        rows={3}
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>Product Image</Label>
                    <ImageUpload
                        value={imageUrl || undefined}
                        onChange={(url) => onImageChange(url)}
                        type="product"
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="category">Category (Optional)</Label>
                    <Select value={categoryId} onValueChange={onCategoryChange} disabled={disabled}>
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
                <div className="space-y-1.5">
                    <Label htmlFor="minStock">Minimum Stock Threshold</Label>
                    <Input
                        id="minStock"
                        type="number"
                        value={minStock}
                        onChange={(e) => onMinStockChange(parseInt(e.target.value) || 0)}
                        min={0}
                        disabled={disabled}
                    />
                    <p className="text-xs text-muted-foreground">
                        You&apos;ll be alerted when stock falls below this level
                    </p>
                </div>
                <div className="border-t pt-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <Label className="text-sm">Sellable (POS)</Label>
                            <p className="text-xs text-muted-foreground">Show this product on the Point of Sale</p>
                        </div>
                        <Switch
                            checked={isSellable}
                            onCheckedChange={onIsSellableChange}
                            disabled={disabled || !onIsSellableChange}
                        />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <Label className="text-sm">Purchasable (PO / Supplier)</Label>
                            <p className="text-xs text-muted-foreground">Allow this product in purchase orders and supplier assignment</p>
                        </div>
                        <Switch
                            checked={isPurchasable}
                            onCheckedChange={onIsPurchasableChange}
                            disabled={disabled || !onIsPurchasableChange}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
