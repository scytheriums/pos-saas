'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { ReceiptTemplate } from '@/components/pos/ReceiptTemplate';
import { ImageUpload } from '@/components/ui/image-upload';
import { toast } from 'sonner';

const receiptFormSchema = z.object({
    receiptHeader: z.string().optional(),
    receiptFooter: z.string().optional(),
    showLogo: z.boolean().default(true),
    logoUrl: z.string().optional(),
});

type ReceiptFormValues = z.infer<typeof receiptFormSchema>;

export default function ReceiptSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [businessInfo, setBusinessInfo] = useState<any>({});
    const receiptRef = useRef<HTMLDivElement>(null);

    const form = useForm<ReceiptFormValues>({
        resolver: zodResolver(receiptFormSchema) as any,
        defaultValues: {
            receiptHeader: "",
            receiptFooter: "",
            showLogo: true,
            logoUrl: "",
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
                setBusinessInfo({
                    name: data.name,
                    address: data.address,
                    phone: data.phone,
                    email: data.email,
                    website: data.website,
                });
                form.reset({
                    receiptHeader: data.receiptHeader || "",
                    receiptFooter: data.receiptFooter || "",
                    showLogo: data.showLogo !== false,
                    logoUrl: data.logoUrl || "",
                });
            }
        } catch (error) {
            toast.error("Failed to fetch settings.");
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: ReceiptFormValues) => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings/tenant', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                toast.success("Receipt settings saved successfully!");
            } else {
                toast.error("Failed to save settings.");
            }
        } catch (error) {
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

    // Mock data for preview
    const previewItems = [
        { name: "Sample Product A", quantity: 2, price: 50000, variantName: "Size M / Black" },
        { name: "Sample Product B", quantity: 1, price: 75000 },
    ];

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold">Receipt Settings</h1>
                <p className="text-xs text-muted-foreground">
                    Customize how your receipts look. Changes are reflected in the preview.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
                {/* Form Section */}
                <div className="space-y-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Content Customization</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="showLogo"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Show Logo</FormLabel>
                                                    <FormDescription>
                                                        Display your business logo on the receipt.
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
                                    <FormField
                                        control={form.control}
                                        name="logoUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Business Logo</FormLabel>
                                                <FormControl>
                                                    <ImageUpload
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        type="logo"
                                                        disabled={saving}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Upload your business logo to display on receipts.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="receiptHeader"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Header Text</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Welcome to our store!"
                                                        className="resize-none"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Text displayed at the top of the receipt, below the business info.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="receiptFooter"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Footer Text</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Thank you for shopping with us!"
                                                        className="resize-none"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Text displayed at the bottom of the receipt.
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
                    <div className="border rounded-lg p-4 bg-gray-100 flex justify-center overflow-hidden">
                        <div className="bg-white shadow-sm origin-top scale-90">
                            <ReceiptTemplate
                                ref={receiptRef}
                                storeName={businessInfo.name || "Business Name"}
                                storeAddress={businessInfo.address || "Business Address"}
                                storePhone={businessInfo.phone || "Phone Number"}
                                orderId="ORD-PREVIEW"
                                date={new Date()}
                                cashierName="Cashier Name"
                                items={previewItems}
                                subtotal={175000}
                                tax={19250}
                                total={194250}
                                discountAmount={0}
                                headerText={watchedValues.receiptHeader}
                                footerText={watchedValues.receiptFooter}
                                showLogo={watchedValues.showLogo}
                                logoUrl={watchedValues.logoUrl}
                                isPreview={true}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
