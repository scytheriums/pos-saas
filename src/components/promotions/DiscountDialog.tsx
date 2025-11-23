"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface DiscountDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    discount?: any;
}

export function DiscountDialog({ open, onClose, onSuccess, discount }: DiscountDialogProps) {
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [type, setType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
    const [value, setValue] = useState("");
    const [minPurchase, setMinPurchase] = useState("");
    const [maxDiscount, setMaxDiscount] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [active, setActive] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (discount) {
            setName(discount.name || "");
            setCode(discount.code || "");
            setType(discount.type || "PERCENTAGE");
            setValue(discount.value?.toString() || "");
            setMinPurchase(discount.minPurchase?.toString() || "");
            setMaxDiscount(discount.maxDiscount?.toString() || "");
            setStartDate(discount.startDate ? new Date(discount.startDate).toISOString().split('T')[0] : "");
            setEndDate(discount.endDate ? new Date(discount.endDate).toISOString().split('T')[0] : "");
            setActive(discount.active ?? true);
        } else {
            resetForm();
        }
    }, [discount, open]);

    const resetForm = () => {
        setName("");
        setCode("");
        setType("PERCENTAGE");
        setValue("");
        setMinPurchase("");
        setMaxDiscount("");
        setStartDate("");
        setEndDate("");
        setActive(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !value) return;

        setSubmitting(true);
        try {
            const url = discount ? `/api/discounts/${discount.id}` : '/api/discounts';
            const method = discount ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    code: code || null,
                    type,
                    value: parseFloat(value),
                    minPurchase: minPurchase ? parseFloat(minPurchase) : null,
                    maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
                    startDate: startDate || null,
                    endDate: endDate || null,
                    active,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to save discount');
            }

            onClose();
            resetForm();
            onSuccess();
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Failed to save discount');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{discount ? 'Edit Discount' : 'Create New Discount'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input
                                placeholder="e.g., Summer Sale"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Code</Label>
                            <Input
                                placeholder="e.g., SUMMER10"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                            />
                            <p className="text-xs text-muted-foreground">Optional coupon code</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type *</Label>
                            <Select value={type} onValueChange={(v: any) => setType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                    <SelectItem value="FIXED_AMOUNT">Fixed Amount ($)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Value *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder={type === 'PERCENTAGE' ? '10' : '5.00'}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                {type === 'PERCENTAGE' ? 'Percentage (0-100)' : 'Amount in dollars'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Minimum Purchase</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="50.00"
                                value={minPurchase}
                                onChange={(e) => setMinPurchase(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">Optional minimum purchase required</p>
                        </div>

                        {type === 'PERCENTAGE' && (
                            <div className="space-y-2">
                                <Label>Max Discount</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="10.00"
                                    value={maxDiscount}
                                    onChange={(e) => setMaxDiscount(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Cap for percentage discounts</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch checked={active} onCheckedChange={setActive} />
                        <Label>Active</Label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" type="button" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting || !name || !value}>
                            {submitting ? "Saving..." : discount ? "Update" : "Create"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
