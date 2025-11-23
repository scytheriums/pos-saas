'use client';

import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';

interface Step4Props {
    form: UseFormReturn<any>;
}

const CURRENCIES = [
    { value: 'IDR', label: 'Indonesian Rupiah (IDR)', symbol: 'Rp' },
    { value: 'USD', label: 'US Dollar (USD)', symbol: '$' },
    { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
    { value: 'GBP', label: 'British Pound (GBP)', symbol: '£' },
    { value: 'SGD', label: 'Singapore Dollar (SGD)', symbol: 'S$' },
    { value: 'MYR', label: 'Malaysian Ringgit (MYR)', symbol: 'RM' },
];

const TIMEZONES = [
    { value: 'Asia/Jakarta', label: 'Jakarta (WIB)' },
    { value: 'Asia/Makassar', label: 'Makassar (WITA)' },
    { value: 'Asia/Jayapura', label: 'Jayapura (WIT)' },
    { value: 'Asia/Singapore', label: 'Singapore' },
    { value: 'UTC', label: 'UTC' },
];

const DATE_FORMATS = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (24/11/2025)' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (11/24/2025)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-11-24)' },
];

const TIME_FORMATS = [
    { value: '24h', label: '24-hour (14:30)' },
    { value: '12h', label: '12-hour (2:30 PM)' },
];

export function Step4Localization({ form }: Step4Props) {
    const currency = form.watch('currency') || 'IDR';
    const dateFormat = form.watch('dateFormat') || 'DD/MM/YYYY';
    const timeFormat = form.watch('timeFormat') || '24h';

    const previewAmount = 1234567.89;
    const previewDate = new Date();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <CardTitle>Currency & Localization</CardTitle>
                </div>
                <CardDescription>
                    Configure regional settings for your business
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {CURRENCIES.map((curr) => (
                                        <SelectItem key={curr.value} value={curr.value}>
                                            {curr.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select timezone" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {TIMEZONES.map((tz) => (
                                        <SelectItem key={tz.value} value={tz.value}>
                                            {tz.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="dateFormat"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Date Format</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select date format" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {DATE_FORMATS.map((format) => (
                                        <SelectItem key={format.value} value={format.value}>
                                            {format.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select time format" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {TIME_FORMATS.map((format) => (
                                        <SelectItem key={format.value} value={format.value}>
                                            {format.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Live Preview */}
                <div className="mt-6 rounded-lg border bg-muted/50 p-4">
                    <h4 className="text-sm font-medium mb-2">Preview</h4>
                    <div className="space-y-1 text-sm">
                        <p>
                            <span className="text-muted-foreground">Price:</span>{' '}
                            <span className="font-medium">{formatCurrency(previewAmount, currency)}</span>
                        </p>
                        <p>
                            <span className="text-muted-foreground">Date:</span>{' '}
                            <span className="font-medium">{formatDate(previewDate, dateFormat)}</span>
                        </p>
                        <p>
                            <span className="text-muted-foreground">Time:</span>{' '}
                            <span className="font-medium">{formatTime(previewDate, timeFormat)}</span>
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
