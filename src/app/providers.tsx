'use client';

import { ClerkProvider } from "@clerk/nextjs";
import { PrinterProvider } from "@/contexts/PrinterContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ClerkProvider>
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
