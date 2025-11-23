'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types for tenant settings
export interface TenantSettings {
    // Business Info
    name: string;
    address?: string | null;
    phone?: string | null;
    taxRate: number;

    // Receipt Settings
    receiptHeader?: string | null;
    receiptFooter?: string | null;
    showLogo: boolean;
    logoUrl?: string | null;

    // POS Settings
    autoPrintReceipt: boolean;
    soundEffects: boolean;
    barcodeScanner?: string | null;

    // Localization Settings
    language: string;
    currency: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
}

interface SettingsContextType {
    settings: TenantSettings | null;
    loading: boolean;
    error: string | null;
    refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultSettings: TenantSettings = {
    name: 'POS Store',
    taxRate: 0.11,
    showLogo: true,
    autoPrintReceipt: true,
    soundEffects: true,
    language: 'en',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
};

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<TenantSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/settings/tenant');

            if (!response.ok) {
                throw new Error('Failed to fetch settings');
            }

            const data = await response.json();

            // Merge with defaults to ensure all fields are present
            setSettings({
                ...defaultSettings,
                ...data,
            });
        } catch (err) {
            console.error('Error fetching tenant settings:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            // Use defaults on error
            setSettings(defaultSettings);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const value: SettingsContextType = {
        settings,
        loading,
        error,
        refreshSettings: fetchSettings,
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);

    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }

    return context;
}

// Convenience hook to get settings directly (with fallback to defaults)
export function useTenantSettings(): TenantSettings {
    const { settings } = useSettings();
    return settings || defaultSettings;
}
