'use client';

import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Rocket, Plus, UserPlus } from 'lucide-react';
import { useState } from 'react';

interface Step5Props {
    form: UseFormReturn<any>;
}

export function Step5InitialSetup({ form }: Step5Props) {
    const [showCategoryInput, setShowCategoryInput] = useState(false);
    const [showProductInput, setShowProductInput] = useState(false);
    const [showTeamInput, setShowTeamInput] = useState(false);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-primary" />
                    <CardTitle>Initial Setup</CardTitle>
                </div>
                <CardDescription>
                    Optional: Get a head start with your first items (you can skip this)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* First Category */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-medium">Create First Product Category</h4>
                            <p className="text-xs text-muted-foreground">
                                Organize your products from the start
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant={showCategoryInput ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => setShowCategoryInput(!showCategoryInput)}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            {showCategoryInput ? 'Cancel' : 'Add'}
                        </Button>
                    </div>
                    {showCategoryInput && (
                        <FormField
                            control={form.control}
                            name="firstCategory"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input placeholder="e.g., Electronics, Clothing, Food" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>

                {/* Sample Product */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-medium">Add Sample Product</h4>
                            <p className="text-xs text-muted-foreground">
                                Create your first product to test the system
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant={showProductInput ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => setShowProductInput(!showProductInput)}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            {showProductInput ? 'Cancel' : 'Add'}
                        </Button>
                    </div>
                    {showProductInput && (
                        <div className="space-y-3">
                            <FormField
                                control={form.control}
                                name="sampleProductName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input placeholder="Product name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="sampleProductPrice"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="Price"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="sampleProductStock"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="Stock"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Team Member Invite */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-medium">Invite Team Member</h4>
                            <p className="text-xs text-muted-foreground">
                                Add your first cashier or manager
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant={showTeamInput ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => setShowTeamInput(!showTeamInput)}
                        >
                            <UserPlus className="h-4 w-4 mr-1" />
                            {showTeamInput ? 'Cancel' : 'Invite'}
                        </Button>
                    </div>
                    {showTeamInput && (
                        <FormField
                            control={form.control}
                            name="teamMemberEmail"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input type="email" placeholder="team@example.com" {...field} />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                        We'll send them an invitation email
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>

                <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground text-center">
                        Don't worry, you can add all of these later from your dashboard
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
