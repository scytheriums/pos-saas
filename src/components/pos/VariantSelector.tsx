import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { PackageOpen } from "lucide-react";
import Image from "next/image";

type Option = {
    id: string;
    name: string;
    values: { id: string; value: string }[];
};

type Variant = {
    id: string;
    sku: string;
    price: number;
    stock: number;
    optionValues: any[];
    imageUrl?: string | null;
};

interface VariantSelectorProps {
    open: boolean;
    onClose: () => void;
    product: {
        id: string;
        name: string;
        options: Option[];
        variants: Variant[];
    } | null;
    onAddToCart: (variant: Variant) => void;
}

export function VariantSelector({ open, onClose, product, onAddToCart }: VariantSelectorProps) {
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

    // Early return if product is null
    if (!product) {
        return null;
    }

    // Check if product has options with values
    const hasOptions = product.options && product.options.length > 0 &&
        product.options.every(opt => opt.values && opt.values.length > 0);

    const handleSelect = (optionId: string, valueId: string) => {
        setSelectedOptions((prev) => ({ ...prev, [optionId]: valueId }));
    };

    const getSelectedVariant = () => {
        // If using direct variant selection
        if (selectedVariantId) {
            return product.variants.find(v => v.id === selectedVariantId);
        }

        // If using option-based selection
        if (Object.keys(selectedOptions).length !== product.options.length) {
            return null;
        }

        const selectedValueIds = Object.values(selectedOptions);

        return product.variants.find((v) => {
            const variantValueIds = v.optionValues?.map(ov => ov.id) || [];
            return variantValueIds.length === selectedValueIds.length &&
                variantValueIds.every(id => selectedValueIds.includes(id));
        });
    };

    const selectedVariant = getSelectedVariant();

    // Auto-select first variant when dialog opens
    useEffect(() => {
        if (open && product) {
            if (hasOptions) {
                // Auto-select first value for each option
                const initialOptions: Record<string, string> = {};
                product.options.forEach(option => {
                    if (option.values && option.values.length > 0) {
                        initialOptions[option.id] = option.values[0].id;
                    }
                });
                setSelectedOptions(initialOptions);
            } else if (product.variants && product.variants.length > 0) {
                // Auto-select first variant for direct selection
                setSelectedVariantId(product.variants[0].id);
            }
        } else if (!open) {
            // Reset when dialog closes
            setSelectedOptions({});
            setSelectedVariantId(null);
        }
    }, [open, product, hasOptions]);

    const handleConfirm = () => {
        if (selectedVariant) {
            onAddToCart(selectedVariant);
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Select Options for {product.name}</DialogTitle>
                    <DialogDescription>
                        Choose your preferred options for this product
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {hasOptions ? (
                        // Option-based selection
                        product.options.map((option) => (
                            <div key={option.id} className="space-y-2">
                                <h4 className="font-medium text-sm">{option.name}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {option.values.map((val) => (
                                        <Button
                                            key={val.id}
                                            variant={selectedOptions[option.id] === val.id ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => handleSelect(option.id, val.id)}
                                        >
                                            {val.value}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        // Direct variant selection (fallback for products without option values)
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Select Variant</h4>
                            <div className="space-y-2">
                                {product.variants.map((variant) => (
                                    <Button
                                        key={variant.id}
                                        variant={selectedVariantId === variant.id ? "default" : "outline"}
                                        className="w-full justify-between"
                                        onClick={() => setSelectedVariantId(variant.id)}
                                    >
                                        <span>{variant.sku}</span>
                                        <span>{formatCurrency(variant.price)}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedVariant && (
                        <div className="mt-4 p-4 bg-muted rounded-lg flex gap-4">
                            <div className="w-20 h-20 bg-white rounded-md border overflow-hidden shrink-0 flex items-center justify-center relative">
                                {selectedVariant.imageUrl ? (
                                    <Image
                                        src={selectedVariant.imageUrl}
                                        alt={selectedVariant.sku}
                                        fill
                                        className="object-cover"
                                        sizes="80px"
                                    />
                                ) : (
                                    <PackageOpen className="w-8 h-8 text-gray-300" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Price:</span>
                                    <span className="text-xl font-bold text-primary">{formatCurrency(selectedVariant.price)}</span>
                                </div>
                                <div className="flex justify-between items-center mt-2 text-sm">
                                    <span className="text-muted-foreground">Stock:</span>
                                    <span className={selectedVariant.stock > 0 ? "text-green-600" : "text-red-600"}>
                                        {selectedVariant.stock} units
                                    </span>
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                    SKU: {selectedVariant.sku}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={!selectedVariant || (selectedVariant.stock <= 0)}>
                        Add to Cart
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

