'use client';

import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import Image from 'next/image';

interface Step1Props {
    form: UseFormReturn<any>;
}

const BUSINESS_TYPES = [
    { value: 'retail', label: 'Retail Store' },
    { value: 'restaurant', label: 'Restaurant / Café' },
    { value: 'service', label: 'Service Business' },
    { value: 'wholesale', label: 'Wholesale' },
    { value: 'other', label: 'Other' },
];

export function Step1BusinessInfo({ form }: Step1Props) {
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
                form.setValue('logoUrl', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle>Business Information</CardTitle>
                </div>
                <CardDescription>
                    Tell us about your business to get started
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Business Name *</FormLabel>
                            <FormControl>
                                <Input placeholder="My Awesome Store" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Business Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select business type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {BUSINESS_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
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
                    name="industry"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Industry / Category</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Fashion, Electronics, Food & Beverage" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="space-y-2">
                    <FormLabel>Business Logo (Optional)</FormLabel>
                    <div className="flex items-center gap-4">
                        {logoPreview && (
                            <div className="h-20 w-20 rounded-lg border-2 border-border overflow-hidden relative">
                                <Image
                                    src={logoPreview}
                                    alt="Logo preview"
                                    fill
                                    className="object-cover"
                                    sizes="80px"
                                />
                            </div>
                        )}
                        <div className="flex-1">
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                                id="logo-upload"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('logo-upload')?.click()}
                                className="w-full"
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                {logoPreview ? 'Change Logo' : 'Upload Logo'}
                            </Button>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Recommended: Square image, at least 200x200px
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
