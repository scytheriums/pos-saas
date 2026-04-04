'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Banknote, CreditCard, Smartphone, Building2 } from 'lucide-react';

interface PaymentMethodSelectorProps {
    open: boolean;
    onClose: () => void;
    total: number;
    onConfirm: (paymentMethod: string, cashTendered?: number, customerName?: string) => void;
    selectedCustomer?: { id: string; name: string; email?: string } | null;
}

export function PaymentMethodSelector({ open, onClose, total, onConfirm, selectedCustomer }: PaymentMethodSelectorProps) {
    const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
    const [cashTendered, setCashTendered] = useState<string>('');
    const [customerName, setCustomerName] = useState<string>('');

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const cashAmount = parseFloat(cashTendered) || 0;
    const change = cashAmount - total;

    const handleConfirm = () => {
        if (paymentMethod === 'CASH') {
            if (cashAmount < total) {
                alert('Cash tendered must be greater than or equal to total');
                return;
            }
            onConfirm(paymentMethod, cashAmount, selectedCustomer?.name);
        } else {
            onConfirm(paymentMethod, undefined, selectedCustomer?.name);
        }
    };

    const paymentMethods = [
        { value: 'CASH', label: 'Cash', icon: Banknote, description: 'Pay with cash' },
        { value: 'CARD', label: 'Card', icon: CreditCard, description: 'Credit/Debit card' },
        { value: 'E_WALLET', label: 'E-Wallet', icon: Smartphone, description: 'GoPay, OVO, Dana, etc.' },
        { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2, description: 'Bank transfer' },
    ];

    const quickCashAmounts = [
        Math.ceil(total / 1000) * 1000, // Round up to nearest 1000
        Math.ceil(total / 5000) * 5000, // Round up to nearest 5000
        Math.ceil(total / 10000) * 10000, // Round up to nearest 10000
        Math.ceil(total / 50000) * 50000, // Round up to nearest 50000
    ].filter((amount, index, self) => self.indexOf(amount) === index); // Remove duplicates

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[500px] max-w-[calc(100%-1rem)] max-h-[85dvh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader className="pb-1">
                    <DialogTitle className="text-base sm:text-lg">Select Payment Method</DialogTitle>
                    <DialogDescription>
                        Total: <span className="font-bold text-base sm:text-lg text-foreground">{formatCurrency(total)}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 sm:space-y-4">
                    {/* Customer Info (Read-only if selected) */}
                    {selectedCustomer && (
                        <div className="space-y-1">
                            <Label className="text-xs">Customer</Label>
                            <div className="px-2.5 py-1.5 border rounded-md bg-muted/50">
                                <div className="font-medium text-sm">{selectedCustomer.name}</div>
                                {selectedCustomer.email && (
                                    <div className="text-xs text-muted-foreground">{selectedCustomer.email}</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Payment Method Selection - 2x2 grid on mobile */}
                    <div className="space-y-2">
                        <Label className="text-xs sm:text-sm">Payment Method</Label>
                        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 sm:gap-2">
                            {paymentMethods.map((method) => (
                                <div key={method.value} className="flex items-center gap-2 border rounded-lg p-2 sm:p-3 hover:bg-muted/50 cursor-pointer">
                                    <RadioGroupItem value={method.value} id={method.value} className="shrink-0" />
                                    <Label htmlFor={method.value} className="flex items-center gap-1.5 sm:gap-3 cursor-pointer flex-1 min-w-0">
                                        <method.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-medium text-xs sm:text-sm truncate">{method.label}</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{method.description}</p>
                                        </div>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Cash Calculator */}
                    {paymentMethod === 'CASH' && (
                        <div className="space-y-2.5 p-2.5 sm:p-4 border rounded-lg bg-muted/20">
                            <div className="space-y-1">
                                <Label htmlFor="cashTendered" className="text-xs sm:text-sm">Cash Tendered</Label>
                                <Input
                                    id="cashTendered"
                                    type="number"
                                    inputMode="numeric"
                                    placeholder="Enter amount"
                                    value={cashTendered}
                                    onChange={(e) => setCashTendered(e.target.value)}
                                    className="text-base h-10"
                                />
                            </div>

                            {/* Quick Cash Buttons */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                {quickCashAmounts.map((amount) => (
                                    <Button
                                        key={amount}
                                        variant="outline"
                                        size="sm"
                                        className="text-[11px] sm:text-xs h-8 px-1.5"
                                        onClick={() => setCashTendered(amount.toString())}
                                    >
                                        {formatCurrency(amount)}
                                    </Button>
                                ))}
                            </div>

                            {/* Change Display */}
                            {cashAmount > 0 && (
                                <div className="pt-2 border-t">
                                    <div className="flex justify-between text-xs sm:text-sm mb-0.5">
                                        <span className="text-muted-foreground">Total:</span>
                                        <span>{formatCurrency(total)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                                        <span className="text-muted-foreground">Cash:</span>
                                        <span>{formatCurrency(cashAmount)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-sm sm:text-lg">
                                        <span>Change:</span>
                                        <span className={change < 0 ? 'text-destructive' : 'text-green-600'}>
                                            {formatCurrency(Math.max(0, change))}
                                        </span>
                                    </div>
                                    {change < 0 && (
                                        <p className="text-[11px] sm:text-sm text-destructive mt-1">
                                            Insufficient! Need {formatCurrency(Math.abs(change))} more.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-1">
                        <Button variant="outline" onClick={onClose} className="flex-1 h-10 text-sm">
                            Cancel
                        </Button>
                        <Button onClick={handleConfirm} className="flex-1 h-10 text-sm font-semibold">
                            Confirm Payment
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
