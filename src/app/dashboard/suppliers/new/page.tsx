'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const PAYMENT_TERMS = ['Net 30', 'Net 60', 'Net 90', 'COD', 'Prepaid', 'Other'];

export default function NewSupplierPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        paymentTerms: '',
        notes: '',
    });

    const set = (field: string, value: string) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { setError('Supplier name is required'); return; }

        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Failed to create supplier');
            router.push('/dashboard/suppliers');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4 max-w-lg">
            <div className="flex items-center gap-3">
                <Link href="/dashboard/suppliers">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold">New Supplier</h1>
                    <p className="text-xs text-muted-foreground">Add a new supplier to your catalog</p>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Supplier Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-destructive/10 border border-destructive text-destructive px-3 py-2 rounded text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="name">Supplier Name <span className="text-destructive">*</span></Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={e => set('name', e.target.value)}
                                placeholder="e.g. ABC Distributors"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="contactName">Contact Name</Label>
                            <Input
                                id="contactName"
                                value={form.contactName}
                                onChange={e => set('contactName', e.target.value)}
                                placeholder="e.g. John Smith"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={form.phone}
                                    onChange={e => set('phone', e.target.value)}
                                    placeholder="+1 555 000 0000"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.email}
                                    onChange={e => set('email', e.target.value)}
                                    placeholder="orders@supplier.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="paymentTerms">Payment Terms</Label>
                            <Select value={form.paymentTerms} onValueChange={val => set('paymentTerms', val)}>
                                <SelectTrigger id="paymentTerms">
                                    <SelectValue placeholder="Select terms..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_TERMS.map(t => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="address">Address</Label>
                            <Textarea
                                id="address"
                                value={form.address}
                                onChange={e => set('address', e.target.value)}
                                placeholder="Street, City, Country..."
                                rows={2}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={form.notes}
                                onChange={e => set('notes', e.target.value)}
                                placeholder="Any additional notes..."
                                rows={2}
                            />
                        </div>

                        <div className="flex gap-2 pt-1">
                            <Button type="submit" disabled={saving} className="flex-1">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {saving ? 'Creating...' : 'Create Supplier'}
                            </Button>
                            <Link href="/dashboard/suppliers">
                                <Button type="button" variant="outline">Cancel</Button>
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
