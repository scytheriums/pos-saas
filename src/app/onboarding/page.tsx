'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
    const { user } = useUser();
    const { user: clerkUser } = useClerk();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [businessName, setBusinessName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // If user already has a tenant, redirect to dashboard
        if (user?.publicMetadata?.tenantId) {
            router.push('/dashboard');
        }
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Create tenant in database
            const response = await fetch('/api/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessName }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create tenant');
            }

            const { tenantId } = await response.json();

            // Update user metadata with tenantId and role
            await user?.update({
                publicMetadata: {
                    tenantId,
                    tenantName: businessName,
                    role: 'owner',
                },
            } as any);

            // Redirect to dashboard
            router.push('/dashboard');
        } catch (err: any) {
            console.error('Onboarding error:', err);
            setError(err.message || 'Failed to complete onboarding');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                        <Store className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl">Welcome to Nexus POS!</CardTitle>
                    <CardDescription>
                        Let's set up your business account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="businessName">Business Name</Label>
                            <Input
                                id="businessName"
                                placeholder="My Awesome Store"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading || !businessName.trim()}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating your account...
                                </>
                            ) : (
                                'Complete Setup'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
