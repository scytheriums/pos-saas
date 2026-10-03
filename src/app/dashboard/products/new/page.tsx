'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProductForm, ProductFormValues } from '@/components/products/ProductForm';

export default function NewProductPage() {
    const router = useRouter();

    const handleSubmit = async (values: ProductFormValues) => {
        const payload = {
            ...values,
            // Create API matches variants to option combinations by value name and order
            options: values.options.map(opt => ({
                name: opt.name,
                values: opt.values.map(v => v.value)
            })),
            variants: values.variants.map(v => ({
                optionValueIds: v.optionValueIds,
                sku: v.sku,
                price: v.price,
                cost: v.cost,
                stock: v.stock,
                imageUrl: v.imageUrl,
                unitId: v.unitId ?? null,
                conversionFactor: v.conversionFactor ?? 1
            }))
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

            <ProductForm mode="create" onSubmit={handleSubmit} />
        </div>
    );
}
