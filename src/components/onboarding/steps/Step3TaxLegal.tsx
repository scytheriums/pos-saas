'use client';

import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText } from 'lucide-react';

interface Step3Props {
    form: UseFormReturn<any>;
}

const LEGAL_ENTITY_TYPES = [
    { value: 'pt', label: 'PT (Perseroan Terbatas)' },
    { value: 'cv', label: 'CV (Commanditaire Vennootschap)' },
    { value: 'ud', label: 'UD (Usaha Dagang)' },
    { value: 'perorangan', label: 'Perorangan (Individual)' },
    { value: 'other', label: 'Other' },
];

export function Step3TaxLegal({ form }: Step3Props) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle>Tax & Legal Information</CardTitle>
                </div>
                <CardDescription>
                    Help us comply with tax regulations
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tax ID (NPWP)</FormLabel>
                            <FormControl>
                                <Input placeholder="12.345.678.9-012.345" {...field} />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                                Your business tax identification number
                            </p>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="taxRate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tax Rate (%)</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="11"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                                Default VAT rate in Indonesia is 11%
                            </p>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="registrationNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Business Registration Number</FormLabel>
                            <FormControl>
                                <Input placeholder="NIB or other registration number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="legalEntityType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Legal Entity Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select legal entity type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {LEGAL_ENTITY_TYPES.map((type) => (
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
            </CardContent>
        </Card>
    );
}
