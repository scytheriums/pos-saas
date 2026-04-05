'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Star } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const loyaltyFormSchema = z.object({
    enabled: z.boolean().default(false),
    // "Points earned per Rp 1,000 spent" — stored as earnPer1000 = pointsPerCurrency * 1000
    earnPer1000: z.coerce.number().min(0).max(1000).default(0),
    // "Rp discount per 1 point redeemed" — stored directly as pointRedemptionRate
    redeemRupiahPerPoint: z.coerce.number().min(0).default(0),
    minimumRedeemPoints: z.coerce.number().int().min(0).default(0),
});

type LoyaltyFormValues = z.infer<typeof loyaltyFormSchema>;

export default function LoyaltySettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const form = useForm<LoyaltyFormValues>({
        resolver: zodResolver(loyaltyFormSchema) as any,
        defaultValues: {
            enabled: false,
            earnPer1000: 0,
            redeemRupiahPerPoint: 0,
            minimumRedeemPoints: 0,
        },
    });

    const enabled = form.watch('enabled');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings/tenant');
            if (res.ok) {
                const data = await res.json();
                const ppc = Number(data.pointsPerCurrency ?? 0);
                const rpr = Number(data.pointRedemptionRate ?? 0);
                const mrp = Number(data.minimumRedeemPoints ?? 0);
                form.reset({
                    enabled: ppc > 0,
                    earnPer1000: ppc > 0 ? Math.round(ppc * 1000) : 1,
                    redeemRupiahPerPoint: rpr,
                    minimumRedeemPoints: mrp,
                });
            }
        } catch (error) {
            console.error("Failed to fetch loyalty settings:", error);
            toast.error("Failed to load loyalty settings");
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (values: LoyaltyFormValues) => {
        setSaving(true);
        try {
            const pointsPerCurrency = values.enabled && values.earnPer1000 > 0
                ? values.earnPer1000 / 1000
                : 0;
            const pointRedemptionRate = values.enabled ? values.redeemRupiahPerPoint : 0;
            const minimumRedeemPoints = values.enabled ? values.minimumRedeemPoints : 0;

            const res = await fetch('/api/settings/tenant', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pointsPerCurrency, pointRedemptionRate, minimumRedeemPoints }),
            });

            if (res.ok) {
                toast.success("Loyalty settings saved!");
            } else {
                toast.error("Failed to save loyalty settings.");
            }
        } catch (error) {
            console.error("Error saving loyalty settings:", error);
            toast.error("An error occurred while saving.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold">Loyalty Program</h1>
                <p className="text-xs text-muted-foreground">
                    Reward customers with points for every purchase. Points can be redeemed for discounts.
                </p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Star className="h-5 w-5 text-yellow-500" />
                                Loyalty Program Settings
                            </CardTitle>
                            <CardDescription>
                                Configure how customers earn and redeem loyalty points at your store.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Enable toggle */}
                            <FormField
                                control={form.control}
                                name="enabled"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Enable Loyalty Program</FormLabel>
                                            <FormDescription>
                                                When enabled, customers earn points on every purchase.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {enabled && (
                                <>
                                    <Separator />

                                    {/* Earn rate */}
                                    <FormField
                                        control={form.control}
                                        name="earnPer1000"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Points Earned per Rp 1,000 Spent</FormLabel>
                                                <FormControl>
                                                    <div className="flex items-center gap-3">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max="1000"
                                                            step="1"
                                                            className="max-w-32"
                                                            {...field}
                                                        />
                                                        <span className="text-sm text-muted-foreground">
                                                            points per Rp 1,000
                                                        </span>
                                                    </div>
                                                </FormControl>
                                                <FormDescription>
                                                    Example: enter <strong>1</strong> to give 1 point for every Rp 1,000 spent.
                                                    A Rp 50,000 purchase earns {(form.watch('earnPer1000') || 0) * 50} points.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Redemption rate */}
                                    <FormField
                                        control={form.control}
                                        name="redeemRupiahPerPoint"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Rupiah Discount per Point Redeemed</FormLabel>
                                                <FormControl>
                                                    <div className="flex items-center gap-3">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            className="max-w-32"
                                                            {...field}
                                                        />
                                                        <span className="text-sm text-muted-foreground">
                                                            Rp per point
                                                        </span>
                                                    </div>
                                                </FormControl>
                                                <FormDescription>
                                                    Example: enter <strong>10</strong> so 100 points = Rp 1,000 discount.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Minimum points to redeem */}
                                    <FormField
                                        control={form.control}
                                        name="minimumRedeemPoints"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Minimum Points to Redeem</FormLabel>
                                                <FormControl>
                                                    <div className="flex items-center gap-3">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            className="max-w-32"
                                                            {...field}
                                                        />
                                                        <span className="text-sm text-muted-foreground">
                                                            points minimum
                                                        </span>
                                                    </div>
                                                </FormControl>
                                                <FormDescription>
                                                    The minimum number of points a customer must have before they can redeem. Set to 0 for no minimum.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Summary */}
                                    {form.watch('earnPer1000') > 0 && form.watch('redeemRupiahPerPoint') > 0 && (
                                        <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-4 text-sm space-y-1">
                                            <p className="font-medium text-yellow-800 flex items-center gap-1.5">
                                                <Star className="h-4 w-4 text-yellow-500" />
                                                Program Summary
                                            </p>
                                            <ul className="text-yellow-700 space-y-0.5 list-disc list-inside">
                                                <li>Customers earn <strong>{form.watch('earnPer1000')}</strong> point{form.watch('earnPer1000') !== 1 ? 's' : ''} per Rp 1,000 spent</li>
                                                <li>Each point is worth <strong>Rp {form.watch('redeemRupiahPerPoint').toLocaleString()}</strong> in discount</li>
                                                {form.watch('minimumRedeemPoints') > 0 && (
                                                    <li>Minimum <strong>{form.watch('minimumRedeemPoints').toLocaleString()}</strong> points required to redeem</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Button type="submit" disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Loyalty Settings"
                        )}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
