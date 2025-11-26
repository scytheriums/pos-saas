"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface AdjustmentDialogProps {
    onAdjustmentCreated: () => void;
}

export function AdjustmentDialog({ onAdjustmentCreated }: AdjustmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState<any>(null);

    const [quantity, setQuantity] = useState("");
    const [reason, setReason] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const debouncedSearch = useDebounce(search, 500);

    useEffect(() => {
        async function searchProducts() {
            if (!debouncedSearch) {
                setProducts([]);
                return;
            }

            setLoading(true);
            try {
                const res = await fetch(`/api/products?search=${debouncedSearch}&limit=5`);
                if (res.ok) {
                    const data = await res.json();
                    setProducts(data.products || []);
                }
            } catch (error) {
                toast.error("Failed to search products");
            } finally {
                setLoading(false);
            }
        }
        searchProducts();
    }, [debouncedSearch]);

    const handleSelectProduct = (product: any, variant?: any) => {
        // If product has variants, we need to select a specific one.
        // For simplicity, if no variant passed, we assume single-variant product or force user to pick.
        // But the search returns products.
        // Let's assume we select the main product if no variants, or the first variant.
        // Better: The search UI should show variants if they exist.

        const targetVariant = variant || product.variants?.[0];
        if (!targetVariant) {
            toast.error("This product has no valid variants to adjust.");
            return;
        }

        setSelectedVariant({
            id: targetVariant.id,
            name: product.name + (variant ? ` - ${variant.name}` : ""),
            sku: targetVariant.sku,
            currentStock: targetVariant.stock
        });
        setSearch("");
        setProducts([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVariant || !quantity || !reason) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/inventory/adjustments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    variantId: selectedVariant.id,
                    quantity: parseInt(quantity),
                    reason,
                    notes
                })
            });

            if (!res.ok) throw new Error("Failed to create adjustment");

            setOpen(false);
            resetForm();
            onAdjustmentCreated();
        } catch (error) {
            toast.error("Failed to create adjustment");
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setSearch("");
        setProducts([]);
        setSelectedVariant(null);
        setQuantity("");
        setReason("");
        setNotes("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button onClick={resetForm}>New Adjustment</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Stock Adjustment</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Product Search */}
                    <div className="space-y-2">
                        <Label>Product</Label>
                        {!selectedVariant ? (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by name or SKU..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                                {loading && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                    </div>
                                )}

                                {/* Search Results Dropdown */}
                                {products.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-[200px] overflow-y-auto">
                                        {products.map(product => (
                                            <div key={product.id} className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-0">
                                                <div className="font-medium text-sm">{product.name}</div>
                                                {product.variants && product.variants.length > 0 ? (
                                                    <div className="pl-2 mt-1 space-y-1">
                                                        {product.variants.map((v: any) => (
                                                            <div
                                                                key={v.id}
                                                                className="text-xs text-gray-600 p-1 hover:bg-blue-50 rounded flex justify-between"
                                                                onClick={() => handleSelectProduct(product, v)}
                                                            >
                                                                <span>{v.name || "Default"} ({v.sku})</span>
                                                                <span>Stock: {v.stock}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="text-xs text-gray-500 mt-1"
                                                        onClick={() => handleSelectProduct(product)}
                                                    >
                                                        No variants found
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-md">
                                <div>
                                    <div className="font-medium text-blue-900">{selectedVariant.name}</div>
                                    <div className="text-xs text-blue-700">SKU: {selectedVariant.sku} • Current Stock: {selectedVariant.currentStock}</div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedVariant(null)} type="button">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Reason</Label>
                            <Select value={reason} onValueChange={setReason}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                                    <SelectItem value="LOST">Lost</SelectItem>
                                    <SelectItem value="FOUND">Found</SelectItem>
                                    <SelectItem value="SUPPLIER_RETURN">Supplier Return</SelectItem>
                                    <SelectItem value="MANUAL_COUNT">Manual Count</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Quantity Adjustment</Label>
                            <Input
                                type="number"
                                placeholder="-5 or 10"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                            <p className="text-[10px] text-gray-500">Use negative for removal, positive for addition.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            placeholder="Optional notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting || !selectedVariant || !quantity || !reason}>
                            {submitting ? "Saving..." : "Save Adjustment"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
