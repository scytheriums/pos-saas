'use client';

import { PrinterProvider } from "@/contexts/PrinterContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <LanguageProvider>
            <SettingsProvider>
                <PrinterProvider>
                    {children}
                </PrinterProvider>
            </SettingsProvider>
        </LanguageProvider>
    );
}
