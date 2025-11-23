'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function OnboardingPage() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && user?.publicMetadata?.tenantId) {
            router.push('/dashboard/analytics');
        }
    }, [isLoaded, user, router]);

    return (
        <div className="relative">
            {/* Logout button in top-right corner */}
            <div className="absolute top-4 right-4 z-50">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => signOut({ redirectUrl: '/sign-in' })}
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </Button>
            </div>
            <OnboardingWizard />
        </div>
    );
}
