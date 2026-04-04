"use client";

import { usePathname } from "next/navigation";
import { Store } from "lucide-react";
import { useTenantSettings } from "@/contexts/SettingsContext";

// Map path segments to readable page titles
const PAGE_TITLES: Record<string, string> = {
    analytics: "Dashboard",
    products: "Products",
    categories: "Categories",
    orders: "Orders",
    returns: "Returns",
    promotions: "Promotions",
    customers: "Customers",
    users: "Team",
    "audit-logs": "Audit Log",
    inventory: "Inventory",
    adjustments: "Adjustments",
    settings: "Settings",
    business: "Business Profile",
    receipt: "Receipt Settings",
    pos: "POS Settings",
    sku: "SKU Settings",
    localization: "Localization",
    roles: "Roles & Permissions",
};

function getPageTitle(pathname: string): string {
    const segments = pathname.split("/").filter(Boolean);
    // Walk from deepest segment upward to find a known title
    for (let i = segments.length - 1; i >= 0; i--) {
        const title = PAGE_TITLES[segments[i]];
        if (title) return title;
    }
    return "Dashboard";
}

export function MobileDashboardHeader() {
    const pathname = usePathname();
    const settings = useTenantSettings();
    const pageTitle = getPageTitle(pathname);

    return (
        <header className="lg:hidden print:hidden shrink-0 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 leading-none truncate">
                        {(settings as any)?.storeName || "Awan POS"}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                        {pageTitle}
                    </p>
                </div>
            </div>
        </header>
    );
}
