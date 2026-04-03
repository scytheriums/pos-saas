'use client';

import { authClient, type AuthUser } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function OnboardingPage() {
    const { data: session, isPending } = authClient.useSession();
    const user = session?.user as AuthUser | undefined;
    const router = useRouter();

    useEffect(() => {
        if (!isPending && user?.tenantId) {
            router.push('/dashboard/analytics');
        }
    }, [isPending, user, router]);

    return (
        <div className="relative">
            {/* Logout button in top-right corner */}
            <div className="absolute top-4 right-4 z-50">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        authClient.signOut({
                            fetchOptions: { onSuccess: () => router.push('/sign-in') },
                        })
                    }
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </Button>
            </div>
            <OnboardingWizard />
        </div>
    );
}
