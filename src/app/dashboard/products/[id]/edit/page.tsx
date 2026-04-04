'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { ProductBasicInfoCard } from '@/components/products/ProductBasicInfoCard';
import { VariantMatrixEditor } from '@/components/products/VariantMatrixEditor';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CostHistoryTab from "@/components/products/CostHistoryTab";

interface VariantState {
    id: string;
    optionValueIds: string[];
    sku: string;
    price: number;
    cost: number;
    stock: number;
    imageUrl?: string | null;
}

interface OptionState {
    id: string;
    name: string;
    values: { id: string; value: string }[];
}

interface Product {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    minStock: number;
    categoryId: string | null;
    hasVariants: boolean;
    options: OptionState[];
    variants: Array<{
        id: string;
        sku: string;
        price: number;
        cost: number;
        stock: number;
        imageUrl?: string | null;
        optionValues: Array<{ id: string; value: string }>;
    }>;
}

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [product, setProduct] = useState<Product | null>(null);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [minStock, setMinStock] = useState(10);
    const [categoryId, setCategoryId] = useState<string>('');

    // Variant state (mirrors VariantMatrixEditor format)
    const [options, setOptions] = useState<OptionState[]>([]);
    const [variants, setVariants] = useState<VariantState[]>([]);

    useEffect(() => {
        fetchProduct();
    }, [productId]);

    const fetchProduct = async () => {
        try {
            const response = await fetch(`/api/products/${productId}`);
            if (!response.ok) {
                throw new Error('Product not found');
            }
            const data = await response.json();
            setProduct(data);
            setName(data.name);
            setDescription(data.description || '');
            setImageUrl(data.imageUrl || null);
            setMinStock(data.minStock);
            setCategoryId(data.categoryId || '__none__');

            // Map API options to VariantMatrixEditor format
            setOptions((data.options ?? []).map((opt: any) => ({
                id: opt.id,
                name: opt.name,
                values: (opt.values ?? []).map((v: any) => ({ id: v.id, value: v.value }))
            })));

            // Map API variants to VariantMatrixEditor format
            setVariants((data.variants ?? []).map((v: any) => ({
                id: v.id,
                optionValueIds: (v.optionValues ?? []).map((ov: any) => ov.id),
                sku: v.sku,
                price: Number(v.price),
                cost: Number(v.cost),
                stock: v.stock,
                imageUrl: v.imageUrl ?? null
            })));
        } catch (err: any) {
            setError(err.message || 'Failed to load product');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            // 1. Save base product info
            const productRes = await fetch(`/api/products/${productId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    imageUrl,
                    minStock,
                    categoryId: categoryId === '__none__' ? null : categoryId
                })
            });

            if (!productRes.ok) {
                const data = await productRes.json();
                throw new Error(data.error || 'Failed to update product');
            }

            // 2. Save each variant
            for (const variant of variants) {
                const variantRes = await fetch(`/api/products/${productId}/variants/${variant.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sku: variant.sku,
                        price: variant.price,
                        cost: variant.cost,
                        stock: variant.stock,
                        imageUrl: variant.imageUrl
                    })
                });

                if (!variantRes.ok) {
                    const data = await variantRes.json();
                    throw new Error(data.error || `Failed to update variant ${variant.sku}`);
                }
            }

            router.push('/dashboard/products');
        } catch (err: any) {
            setError(err.message || 'Failed to update product');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        setError(null);

        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete product');
            }

            router.push('/dashboard/products');
        } catch (err: any) {
            setError(err.message || 'Failed to delete product');
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-80" />
            </div>
        );
    }

    if (error && !product) {
        return (
            <div className="space-y-3">
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded text-sm">
                    {error}
                </div>
                <Link href="/dashboard/products" className="inline-block">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                        Back to Products
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold">Edit Product</h1>
                    <p className="text-xs text-muted-foreground">Update product information</p>
                </div>
                <div className="flex items-center gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground" disabled={deleting}>
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete &quot;{product?.name}&quot; and all its variants.
                                    This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Link href="/dashboard/products">
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back
                        </Button>
                    </Link>
                </div>
            </div>

            <Tabs defaultValue="details" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="details">Product Details</TabsTrigger>
                    <TabsTrigger value="cost-history">Cost History</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Basic Information */}
                        <ProductBasicInfoCard
                            name={name}
                            description={description}
                            imageUrl={imageUrl}
                            minStock={minStock}
                            categoryId={categoryId}
                            disabled={saving}
                            onNameChange={setName}
                            onDescriptionChange={setDescription}
                            onImageChange={setImageUrl}
                            onMinStockChange={setMinStock}
                            onCategoryChange={setCategoryId}
                        />

                        {/* Variants */}
                        {variants.length > 0 && (
                            <VariantMatrixEditor
                                options={options}
                                variants={variants}
                                onOptionsChange={setOptions}
                                onVariantsChange={setVariants}
                                hideOptions
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
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </TabsContent>

                <TabsContent value="cost-history">
                    <CostHistoryTab productId={productId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
