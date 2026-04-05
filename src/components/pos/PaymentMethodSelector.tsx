'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banknote, CreditCard, Smartphone, Building2, Plus, Trash2 } from 'lucide-react';

export interface PaymentEntry {
    method: string;
    amount: number;
}

interface PaymentMethodSelectorProps {
    open: boolean;
    onClose: () => void;
    total: number;
    onConfirm: (paymentEntries: PaymentEntry[], cashTendered?: number, customerName?: string) => void;
    selectedCustomer?: { id: string; name: string; email?: string } | null;
}

const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Cash', icon: Banknote },
    { value: 'CARD', label: 'Card', icon: CreditCard },
    { value: 'E_WALLET', label: 'E-Wallet', icon: Smartphone },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
];

function getMethodIcon(method: string) {
    return PAYMENT_METHODS.find(m => m.value === method)?.icon ?? Banknote;
}

export function PaymentMethodSelector({ open, onClose, total, onConfirm, selectedCustomer }: PaymentMethodSelectorProps) {
    const [entries, setEntries] = useState<PaymentEntry[]>([{ method: 'CASH', amount: total }]);

    const fmt = (n: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

    const amountPaid = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const remaining = total - amountPaid;
    const change = amountPaid - total;
    const isValid = amountPaid >= total;

    const updateEntry = (index: number, field: keyof PaymentEntry, value: string | number) => {
        setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
    };

    const addEntry = () => {
        const leftover = Math.max(0, total - entries.reduce((s, e) => s + (Number(e.amount) || 0), 0));
        setEntries(prev => [...prev, { method: 'CASH', amount: leftover }]);
    };

    const removeEntry = (index: number) => {
        setEntries(prev => prev.filter((_, i) => i !== index));
    };

    const applyQuickAmount = (index: number, amount: number) => {
        updateEntry(index, 'amount', amount);
    };

    const quickAmounts = (base: number) => {
        const amounts = [
            Math.ceil(base / 1000) * 1000,
            Math.ceil(base / 5000) * 5000,
            Math.ceil(base / 10000) * 10000,
            Math.ceil(base / 50000) * 50000,
        ];
        return [...new Set(amounts)];
    };

    const handleConfirm = () => {
        if (!isValid) return;
        const cashEntry = entries.find(e => e.method === 'CASH');
        const cashTendered = cashEntry ? Number(cashEntry.amount) : undefined;
        onConfirm(entries.map(e => ({ method: e.method, amount: Number(e.amount) })), cashTendered);
        setEntries([{ method: 'CASH', amount: total }]);
    };

    const handleClose = () => {
        setEntries([{ method: 'CASH', amount: total }]);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={val => !val && handleClose()}>
            <DialogContent className="sm:max-w-[500px] max-w-[calc(100%-1rem)] max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader className="pb-1">
                    <DialogTitle className="text-base sm:text-lg">Payment</DialogTitle>
                    <DialogDescription>
                        Total: <span className="font-bold text-base sm:text-lg text-foreground">{fmt(total)}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    {/* Customer (read-only) */}
                    {selectedCustomer && (
                        <div className="px-2.5 py-1.5 border rounded-md bg-muted/50">
                            <div className="font-medium text-sm">{selectedCustomer.name}</div>
                            {selectedCustomer.email && <div className="text-xs text-muted-foreground">{selectedCustomer.email}</div>}
                        </div>
                    )}

                    {/* Payment entries */}
                    <div className="space-y-2">
                        {entries.map((entry, index) => {
                            const Icon = getMethodIcon(entry.method);
                            const isFirst = index === 0;
                            const entryRemaining = isFirst
                                ? total
                                : total - entries.slice(0, index).reduce((s, e) => s + (Number(e.amount) || 0), 0);

                            return (
                                <div key={index} className="border rounded-lg p-3 space-y-2.5 bg-muted/20">
                                    <div className="flex items-center gap-2">
                                        <Select value={entry.method} onValueChange={v => updateEntry(index, 'method', v)}>
                                            <SelectTrigger className="flex-1 h-9 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PAYMENT_METHODS.map(m => (
                                                    <SelectItem key={m.value} value={m.value}>
                                                        <span className="flex items-center gap-2">
                                                            <m.icon className="h-3.5 w-3.5" />
                                                            {m.label}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {entries.length > 1 && (
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => removeEntry(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">Amount</Label>
                                        <Input
                                            type="number"
                                            inputMode="numeric"
                                            value={entry.amount || ''}
                                            onChange={e => updateEntry(index, 'amount', parseFloat(e.target.value) || 0)}
                                            className="h-10 text-base"
                                            placeholder="0"
                                        />
                                    </div>

                                    {/* Quick cash buttons */}
                                    {entry.method === 'CASH' && entryRemaining > 0 && (
                                        <div className="grid grid-cols-4 gap-1">
                                            {quickAmounts(entryRemaining).map(amount => (
                                                <Button key={amount} variant="outline" size="sm" className="text-[10px] h-7 px-1" onClick={() => applyQuickAmount(index, amount)}>
                                                    {fmt(amount)}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Add payment method */}
                    {remaining > 0 && (
                        <Button variant="outline" size="sm" className="w-full h-9 text-sm gap-1.5" onClick={addEntry}>
                            <Plus className="h-3.5 w-3.5" />
                            Add Payment Method
                            <span className="text-muted-foreground text-xs">({fmt(remaining)} remaining)</span>
                        </Button>
                    )}

                    {/* Summary */}
                    <div className="rounded-lg border p-3 space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-medium">{fmt(total)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Paid</span>
                            <span className={amountPaid >= total ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>{fmt(amountPaid)}</span>
                        </div>
                        {remaining > 0 && (
                            <div className="flex justify-between font-bold text-destructive">
                                <span>Remaining</span>
                                <span>{fmt(remaining)}</span>
                            </div>
                        )}
                        {change > 0 && (
                            <div className="flex justify-between font-bold text-green-600 border-t pt-1.5">
                                <span>Change</span>
                                <span>{fmt(change)}</span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                        <Button variant="outline" onClick={handleClose} className="flex-1 h-10 text-sm">Cancel</Button>
                        <Button onClick={handleConfirm} disabled={!isValid} className="flex-1 h-10 text-sm font-semibold">
                            Confirm Payment
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
