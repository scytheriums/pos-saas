'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { formatCurrencyWithSettings, formatDateWithSettings, formatTimeWithSettings } from '@/lib/format';
import { TenantSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';

const localizationFormSchema = z.object({
    language: z.string().default("en"),
    currency: z.string().default("IDR"),
    timezone: z.string().default("Asia/Jakarta"),
    dateFormat: z.string().default("DD/MM/YYYY"),
    timeFormat: z.string().default("24h"),
});

type LocalizationFormValues = z.infer<typeof localizationFormSchema>;

export default function LocalizationSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const form = useForm<LocalizationFormValues>({
        resolver: zodResolver(localizationFormSchema) as any,
        defaultValues: {
            language: "en",
            currency: "IDR",
            timezone: "Asia/Jakarta",
            dateFormat: "DD/MM/YYYY",
            timeFormat: "24h",
        },
    });

    // Watch form values for live preview
    const watchedValues = form.watch();

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings/tenant');
            if (res.ok) {
                const data = await res.json();
                form.reset({
                    language: data.language || "en",
                    currency: data.currency || "IDR",
                    timezone: data.timezone || "Asia/Jakarta",
                    dateFormat: data.dateFormat || "DD/MM/YYYY",
                    timeFormat: data.timeFormat || "24h",
                });
            }
        } catch (error) {
            toast.error("Failed to fetch settings.");
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: LocalizationFormValues) => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings/tenant', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                toast.success("Localization settings saved successfully!");
            } else {
                toast.error("Failed to save settings.");
            }
        } catch (error) {
            toast.error("An error occurred while saving.");
        } finally {
            setSaving(false);
        }
    };

    // Construct settings object for preview
    const previewSettings: TenantSettings = {
        ...watchedValues,
        name: 'Preview',
        address: null,
        phone: null,
        taxRate: 0.11,
        receiptHeader: null,
        receiptFooter: null,
        showLogo: true,
        autoPrintReceipt: false,
        soundEffects: false,
        enableStockManagement: true,
        pointsPerCurrency: 0,
        pointRedemptionRate: 0,
        minimumRedeemPoints: 0,
    };

    // Helper function to format date based on selected format
    const formatDatePreview = () => {
        return formatDateWithSettings(new Date(), previewSettings);
    };

    // Helper function to format time based on selected format
    const formatTimePreview = () => {
        return formatTimeWithSettings(new Date(), previewSettings);
    };

    // Helper function to format currency
    const formatCurrencyPreview = () => {
        const amount = 1234567.89;
        return formatCurrencyWithSettings(amount, previewSettings);
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
                <h1 className="text-xl font-bold">Localization Settings</h1>
                <p className="text-xs text-muted-foreground">
                    Configure regional preferences and formats.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-2 space-y-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Language & Region</CardTitle>
                                    <CardDescription>
                                        Set your preferred language and regional settings
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="language"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Language</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select language" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="en">English</SelectItem>
                                                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Interface language (currently English only)
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="timezone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Timezone</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select timezone" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB, GMT+7)</SelectItem>
                                                        <SelectItem value="Asia/Makassar">Asia/Makassar (WITA, GMT+8)</SelectItem>
                                                        <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT, GMT+9)</SelectItem>
                                                        <SelectItem value="Asia/Singapore">Asia/Singapore (GMT+8)</SelectItem>
                                                        <SelectItem value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur (GMT+8)</SelectItem>
                                                        <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Timezone for timestamps and reports
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Currency</CardTitle>
                                    <CardDescription>
                                        Set your business currency
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="currency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Currency</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select currency" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="IDR">Indonesian Rupiah (IDR)</SelectItem>
                                                        <SelectItem value="USD">US Dollar (USD)</SelectItem>
                                                        <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                                        <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                                                        <SelectItem value="JPY">Japanese Yen (JPY)</SelectItem>
                                                        <SelectItem value="SGD">Singapore Dollar (SGD)</SelectItem>
                                                        <SelectItem value="MYR">Malaysian Ringgit (MYR)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Currency used for all transactions
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Date & Time Formats</CardTitle>
                                    <CardDescription>
                                        Customize how dates and times are displayed
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="dateFormat"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Date Format</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select date format" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (23/11/2025)</SelectItem>
                                                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (11/23/2025)</SelectItem>
                                                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2025-11-23)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Format for displaying dates
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="timeFormat"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Time Format</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select time format" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="24h">24-hour (14:30)</SelectItem>
                                                        <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Format for displaying times
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
                </div>

                {/* Preview Section */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Live Preview</h4>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Format Preview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Date</p>
                                <p className="font-mono text-sm font-medium">{formatDatePreview()}</p>
                            </div>
                            <Separator />
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Time</p>
                                <p className="font-mono text-sm font-medium">{formatTimePreview()}</p>
                            </div>
                            <Separator />
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Currency</p>
                                <p className="font-mono text-sm font-medium">{formatCurrencyPreview()}</p>
                            </div>
                            <Separator />
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Language</p>
                                <p className="font-mono text-sm font-medium">
                                    {watchedValues.language === 'en' ? 'English' : 'Bahasa Indonesia'}
                                </p>
                            </div>
                            <Separator />
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Timezone</p>
                                <p className="font-mono text-sm font-medium">{watchedValues.timezone}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
