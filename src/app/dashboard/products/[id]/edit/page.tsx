'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { ProductForm, ProductFormValues } from '@/components/products/ProductForm';
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

interface ApiProduct {
    name: string;
    description: string | null;
    imageUrl: string | null;
    minStock: number;
    categoryId: string | null;
    isSellable?: boolean;
    isPurchasable?: boolean;
    options?: { id: string; name: string; values?: { id: string; value: string }[] }[];
    variants?: {
        id: string;
        sku: string;
        price: string | number;
        cost: string | number;
        stock: number;
        imageUrl?: string | null;
        optionValues?: { id: string }[];
    }[];
}

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [initialValues, setInitialValues] = useState<ProductFormValues | null>(null);

    useEffect(() => {
        fetchProduct();
    }, [productId]);

    const fetchProduct = async () => {
        try {
            const response = await fetch(`/api/products/${productId}`);
            if (!response.ok) {
                throw new Error('Product not found');
            }
            const data: ApiProduct = await response.json();
            const options = (data.options ?? []).map(opt => ({
                id: opt.id,
                name: opt.name,
                values: (opt.values ?? []).map(v => ({ id: v.id, value: v.value }))
            }));

            setInitialValues({
                name: data.name,
                description: data.description || '',
                imageUrl: data.imageUrl || null,
                minStock: data.minStock,
                categoryId: data.categoryId || '__none__',
                isSellable: data.isSellable ?? true,
                isPurchasable: data.isPurchasable ?? true,
                hasVariants: options.length > 0,
                options,
                variants: (data.variants ?? []).map(v => ({
                    id: v.id,
                    optionValueIds: (v.optionValues ?? []).map(ov => ov.id),
                    sku: v.sku,
                    price: Number(v.price),
                    cost: Number(v.cost),
                    stock: v.stock,
                    imageUrl: v.imageUrl ?? null
                }))
            });
        } catch (err) {
            setError((err instanceof Error && err.message) || 'Failed to load product');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values: ProductFormValues) => {
        // Saves base info and syncs options/variants (add, update, remove) in one request
        const response = await fetch(`/api/products/${productId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values)
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to update product');
        }

        router.push('/dashboard/products');
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
        } catch (err) {
            setError((err instanceof Error && err.message) || 'Failed to delete product');
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

    if (!initialValues) {
        return (
            <div className="space-y-3">
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded text-sm">
                    {error || 'Failed to load product'}
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
                                    This will permanently delete &quot;{initialValues.name}&quot; and all its variants.
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

                {/* Kept mounted so unsaved form edits survive switching tabs */}
                <TabsContent value="details" forceMount className="space-y-4 data-[state=inactive]:hidden">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded text-sm">
                            {error}
                        </div>
                    )}
                    <ProductForm mode="edit" initialValues={initialValues} onSubmit={handleSubmit} />
                </TabsContent>

                <TabsContent value="cost-history">
                    <CostHistoryTab productId={productId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
