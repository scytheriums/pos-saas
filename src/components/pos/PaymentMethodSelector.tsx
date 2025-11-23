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
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Select Payment Method</DialogTitle>
                    <DialogDescription>
                        Total: <span className="font-bold text-lg text-foreground">{formatCurrency(total)}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Customer Info (Read-only if selected) */}
                    {selectedCustomer && (
                        <div className="space-y-2">
                            <Label>Customer</Label>
                            <div className="px-3 py-2 border rounded-md bg-muted/50">
                                <div className="font-medium">{selectedCustomer.name}</div>
                                {selectedCustomer.email && (
                                    <div className="text-sm text-muted-foreground">{selectedCustomer.email}</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Payment Method Selection */}
                    <div className="space-y-3">
                        <Label>Payment Method</Label>
                        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                            {paymentMethods.map((method) => (
                                <div key={method.value} className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                                    <RadioGroupItem value={method.value} id={method.value} />
                                    <Label htmlFor={method.value} className="flex items-center gap-3 cursor-pointer flex-1">
                                        <method.icon className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{method.label}</p>
                                            <p className="text-sm text-muted-foreground">{method.description}</p>
                                        </div>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Cash Calculator */}
                    {paymentMethod === 'CASH' && (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                            <div className="space-y-2">
                                <Label htmlFor="cashTendered">Cash Tendered</Label>
                                <Input
                                    id="cashTendered"
                                    type="number"
                                    placeholder="Enter amount"
                                    value={cashTendered}
                                    onChange={(e) => setCashTendered(e.target.value)}
                                    className="text-lg"
                                />
                            </div>

                            {/* Quick Cash Buttons */}
                            <div className="grid grid-cols-4 gap-2">
                                {quickCashAmounts.map((amount) => (
                                    <Button
                                        key={amount}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCashTendered(amount.toString())}
                                    >
                                        {formatCurrency(amount)}
                                    </Button>
                                ))}
                            </div>

                            {/* Change Display */}
                            {cashAmount > 0 && (
                                <div className="pt-3 border-t">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-muted-foreground">Total:</span>
                                        <span>{formatCurrency(total)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-muted-foreground">Cash:</span>
                                        <span>{formatCurrency(cashAmount)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Change:</span>
                                        <span className={change < 0 ? 'text-destructive' : 'text-green-600'}>
                                            {formatCurrency(Math.max(0, change))}
                                        </span>
                                    </div>
                                    {change < 0 && (
                                        <p className="text-sm text-destructive mt-2">
                                            Insufficient cash! Need {formatCurrency(Math.abs(change))} more.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleConfirm} className="flex-1">
                            Confirm Payment
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
