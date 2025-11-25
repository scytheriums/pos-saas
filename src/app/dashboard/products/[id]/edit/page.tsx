'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Trash2, Edit, Check, X } from 'lucide-react';
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
import { ImageUpload } from '@/components/ui/image-upload';

interface Variant {
    id: string;
    sku: string;
    price: number;
    cost: number;
    stock: number;
    imageUrl?: string | null;
}

// Variant Edit Row Component
function VariantEditRow({ variant, productId, onUpdate }: { variant: Variant; productId: string; onUpdate: () => void }) {
    const [editing, setEditing] = useState(false);
    const [sku, setSku] = useState(variant.sku);
    const [price, setPrice] = useState(variant.price);
    const [cost, setCost] = useState(variant.cost);
    const [stock, setStock] = useState(variant.stock);
    const [imageUrl, setImageUrl] = useState(variant.imageUrl);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(`/api/products/${productId}/variants/${variant.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sku, price, cost, stock, imageUrl })
            });

            if (!response.ok) {
                throw new Error('Failed to update variant');
            }

            setEditing(false);
            onUpdate();
        } catch (error) {
            console.error('Error updating variant:', error);
            alert('Failed to update variant');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setSku(variant.sku);
        setPrice(variant.price);
        setCost(variant.cost);
        setStock(variant.stock);
        setImageUrl(variant.imageUrl);
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="SKU"
                    className="flex-1"
                />
                <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value))}
                    placeholder="Price"
                    className="w-28"
                />
                <Input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(parseFloat(e.target.value))}
                    placeholder="Cost"
                    className="w-28"
                />
                <Input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(parseInt(e.target.value))}
                    placeholder="Stock"
                    className="w-24"
                />
                <div className="w-10 h-10 shrink-0">
                    <ImageUpload
                        value={imageUrl || undefined}
                        onChange={(url) => setImageUrl(url)}
                        type="product"
                        disabled={saving}
                        minimal
                    />
                </div>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex-1">
                <p className="font-medium">{variant.sku}</p>
                <p className="text-sm text-muted-foreground">
                    Stock: {variant.stock} units | Cost: Rp {variant.cost.toLocaleString()}
                </p>
            </div>
            <div className="flex items-center gap-3">
                <p className="font-semibold">Rp {variant.price.toLocaleString()}</p>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                    <Edit className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

interface Product {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    minStock: number;
    variants: Array<{
        id: string;
        sku: string;
        price: number;
        cost: number;
        stock: number;
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

    // Categories
    const [categories, setCategories] = useState<any[]>([]);

    // Fetch categories
    useEffect(() => {
        async function fetchCategories() {
            try {
                const res = await fetch('/api/categories');
                if (res.ok) {
                    const data = await res.json();
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
            const response = await fetch(`/api/products/${productId}`, {
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

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update product');
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
            <div className="p-8 space-y-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (error && !product) {
        return (
            <div className="p-8">
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
                    {error}
                </div>
                <Link href="/dashboard/products" className="mt-4 inline-block">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Products
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/products">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Edit Product</h1>
                        <p className="text-muted-foreground">Update product information</p>
                    </div>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={deleting}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Product
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete "{product?.name}" and all its variants.
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
            </div>

            <Tabs defaultValue="details" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="details">Product Details</TabsTrigger>
                    <TabsTrigger value="cost-history">Cost History</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
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
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Product Image</Label>
                                    <ImageUpload
                                        value={imageUrl || undefined}
                                        onChange={(url) => setImageUrl(url)}
                                        type="product"
                                        disabled={saving}
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

                        {/* Variants Information (Editable) */}
                        {product && product.variants.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Variants ({product.variants.length})</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {product.variants.map((variant, index) => (
                                            <VariantEditRow
                                                key={variant.id}
                                                variant={variant}
                                                productId={productId}
                                                onUpdate={fetchProduct}
                                            />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
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
                                <Button type="button" variant="outline" disabled={saving}>
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={saving}>
                                <Save className="mr-2 h-4 w-4" />
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
