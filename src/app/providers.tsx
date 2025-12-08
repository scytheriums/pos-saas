'use client';

import { ClerkProvider } from "@clerk/nextjs";
import { PrinterProvider } from "@/contexts/PrinterContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ClerkProvider
            signInFallbackRedirectUrl="/dashboard/analytics"
            signUpFallbackRedirectUrl="/onboarding"
            afterSignOutUrl="/sign-in"
            publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
        >
            <LanguageProvider>
                <SettingsProvider>
                    <PrinterProvider>
                        {children}
                    </PrinterProvider>
                </SettingsProvider>
            </LanguageProvider>
        </ClerkProvider>
    );
}
