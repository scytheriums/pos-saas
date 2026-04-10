'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const posFormSchema = z.object({
    autoPrintReceipt: z.boolean().optional().default(true),
    soundEffects: z.boolean().optional().default(true),
    barcodeScanner: z.string().optional(),
    enableStockManagement: z.boolean().default(true),
});

type PosFormValues = z.infer<typeof posFormSchema>;

export default function PosSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [forcesyncing, setForcesyncing] = useState(false);

    const form = useForm<PosFormValues>({
        resolver: zodResolver(posFormSchema) as any,
        defaultValues: {
            autoPrintReceipt: true,
            soundEffects: true,
            barcodeScanner: "none",
            enableStockManagement: true,
        },
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings/tenant');
            if (res.ok) {
                const data = await res.json();
                form.reset({
                    autoPrintReceipt: data.autoPrintReceipt !== false,
                    soundEffects: data.soundEffects !== false,
                    barcodeScanner: data.barcodeScanner || "none",
                    enableStockManagement: data.enableStockManagement !== false,
                });
            }
        } catch (error) {
            toast.error("Failed to fetch settings.");
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: PosFormValues) => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings/tenant', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                toast.success("POS settings saved successfully!");
            } else {
                toast.error("Failed to save settings.");
            }
        } catch (error) {
            toast.error("An error occurred while saving.");
        } finally {
            setSaving(false);
        }
    };

    const handleForceSync = async () => {
        if (forcesyncing) return;
        setForcesyncing(true);
        try {
            // Dynamically import sync functions (client-only, Dexie-based)
            const { retryAllFailed, processSyncQueue } = await import('@/lib/sync');
            await retryAllFailed();
            const result = await processSyncQueue();
            if (result.synced > 0 || result.failed === 0) {
                toast.success(`Sync complete — ${result.synced} order(s) uploaded.`);
            } else {
                toast.error(`Sync finished with ${result.failed} failed order(s). Check network and retry.`);
            }
        } catch (error) {
            toast.error("Force sync failed. Please try again.");
        } finally {
            setForcesyncing(false);
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
                <h1 className="text-xl font-bold">POS Settings</h1>
                <p className="text-xs text-muted-foreground">
                    Configure point of sale behavior and preferences.
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
                    <Card>
                        <CardHeader>
                            <CardTitle>Receipt Printing</CardTitle>
                            <CardDescription>
                                Control automatic receipt printing behavior
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="autoPrintReceipt"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                        <div className="space-y-0.5">
                                            <FormLabel>Auto-Print Receipt</FormLabel>
                                            <FormDescription>
                                                Automatically print receipt after completing a sale
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
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>User Experience</CardTitle>
                            <CardDescription>
                                Customize the POS interface behavior
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="soundEffects"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                        <div className="space-y-0.5">
                                            <FormLabel>Sound Effects</FormLabel>
                                            <FormDescription>
                                                Play sound effects for actions (scan, add to cart, checkout)
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
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Inventory</CardTitle>
                            <CardDescription>
                                Control whether the POS tracks and enforces stock levels
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="enableStockManagement"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                        <div className="space-y-0.5">
                                            <FormLabel>Stock Management</FormLabel>
                                            <FormDescription>
                                                When enabled, the POS checks stock availability, blocks overselling, and decrements stock after each sale. Disable for service-based or non-inventory businesses.
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
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Hardware Configuration</CardTitle>
                            <CardDescription>
                                Configure connected hardware devices
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="barcodeScanner"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Barcode Scanner</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select scanner type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">None (Keyboard Input)</SelectItem>
                                                <SelectItem value="usb">USB Barcode Scanner</SelectItem>
                                                <SelectItem value="bluetooth">Bluetooth Scanner</SelectItem>
                                                <SelectItem value="camera">Camera Scanner</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Select the type of barcode scanner connected to this device
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Form>

            {/* Offline Sync — outside the form */}
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Offline Sync</CardTitle>
                    <CardDescription>
                        Manually push any offline orders that are waiting to sync to the server.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="outline"
                        onClick={handleForceSync}
                        disabled={forcesyncing}
                    >
                        {forcesyncing
                            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            : <RefreshCw className="mr-2 h-4 w-4" />
                        }
                        {forcesyncing ? 'Syncing…' : 'Force Sync Now'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
