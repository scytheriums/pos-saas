"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useClerk } from "@clerk/nextjs";
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    Settings,
    LogOut,
    Store,
    BarChart3,
    UserCog,
    FolderTree,
    ChevronLeft,
    ChevronRight,
    FileText,
    ClipboardList,
    Percent,
    Globe,
    Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";

type MenuItem = {
    icon: any;
    label: string;
    href?: string;
    children?: { label: string; href: string; icon: any }[];
};

export function Sidebar() {
    const pathname = usePathname();
    const { t } = useLanguage();
    const { signOut } = useClerk();
    const [selectedModule, setSelectedModule] = useState<string | null>(null);
    const [isSecondaryCollapsed, setIsSecondaryCollapsed] = useState(false);

    const menuItems: MenuItem[] = [
        { icon: LayoutDashboard, label: t.sidebar.dashboard, href: "/dashboard/analytics" },
        { icon: ShoppingCart, label: t.sidebar.pos, href: "/pos" },
        {
            icon: Package,
            label: t.sidebar.products,
            children: [
                { label: "All Products", href: "/dashboard/products", icon: Package },
                { label: "Categories", href: "/dashboard/categories", icon: FolderTree },
                { label: "Adjustments", href: "/dashboard/inventory/adjustments", icon: ClipboardList },
            ]
        },
        { icon: Store, label: t.sidebar.orders, href: "/dashboard/orders" },
        { icon: Percent, label: "Promotions", href: "/dashboard/promotions" },
        {
            icon: Settings,
            label: t.sidebar.settings,
            children: [
                { label: "Business Profile", href: "/dashboard/settings/business", icon: Store },
                { label: "Receipt Settings", href: "/dashboard/settings/receipt", icon: FileText },
                { label: "POS Settings", href: "/dashboard/settings/pos", icon: Settings },
                { label: "Localization", href: "/dashboard/settings/localization", icon: Globe },
                { label: t.sidebar.customers, href: "/dashboard/customers", icon: Users },
                { label: t.sidebar.team, href: "/dashboard/users", icon: UserCog },
                { label: "Roles & Permissions", href: "/dashboard/settings/roles", icon: Shield },
                { label: "Audit Logs", href: "/dashboard/audit-logs", icon: FileText },
            ]
        },
    ];

    // Auto-select module based on current path
    useEffect(() => {
        for (const item of menuItems) {
            if (item.children) {
                const isInModule = item.children.some(child =>
                    pathname === child.href || pathname.startsWith(child.href + "/")
                );
                if (isInModule) {
                    setSelectedModule(item.label);
                    return;
                }
            }
        }
    }, [pathname]);

    const selectedMenuItem = menuItems.find(item => item.label === selectedModule);
    const hasChildren = selectedMenuItem?.children && selectedMenuItem.children.length > 0;

    return (
        <div className="flex h-full">
            {/* Icon Sidebar */}
            <div className="w-16 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-4 gap-2">
                <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center mb-4">
                    <Store className="h-6 w-6 text-primary-foreground" />
                </div>
                {menuItems.map((item) => {
                    const isActive = selectedModule === item.label ||
                        (item.href && (pathname === item.href || pathname.startsWith(item.href + "/")));

                    return (
                        <div key={item.label} className="relative group">
                            <button
                                onClick={() => {
                                    if (item.children) {
                                        setSelectedModule(item.label);
                                        setIsSecondaryCollapsed(false);
                                    } else if (item.href) {
                                        window.location.href = item.href;
                                    }
                                }}
                                className={cn(
                                    "w-10 h-10 rounded-md flex items-center justify-center transition-colors",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                            </button>
                            {/* Tooltip */}
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                {item.label}
                            </div>
                        </div>
                    );
                })}

                {/* Logout Button */}
                <div className="relative group mt-auto">
                    <button
                        onClick={() => {
                            signOut({ redirectUrl: '/sign-in' });
                        }}
                        className="w-10 h-10 rounded-md flex items-center justify-center transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                    {/* Tooltip */}
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        {t.sidebar.logout}
                    </div>
                </div>
            </div>

            {/* Submenu Sidebar - Only shows when a module with children is selected */}
            {hasChildren && !isSecondaryCollapsed && (
                <div className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col">
                    {/* Header with collapse button */}
                    <div className="h-16 px-4 border-b border-sidebar-border flex items-center justify-between">
                        <h1 className="text-base font-semibold text-sidebar-foreground">
                            {selectedMenuItem?.label}
                        </h1>
                        <button
                            onClick={() => setIsSecondaryCollapsed(true)}
                            className="p-1 hover:bg-sidebar-accent rounded-md transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4 text-sidebar-foreground/60" />
                        </button>
                    </div>

                    {/* Navigation - Child items with icons */}
                    <nav className="flex-1 overflow-y-auto py-4">
                        <div className="px-3 space-y-0.5">
                            {selectedMenuItem?.children?.map((child) => {
                                const isActive = pathname === child.href || pathname.startsWith(child.href + "/");
                                return (
                                    <Link key={child.href} href={child.href}>
                                        <div
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                                                isActive
                                                    ? "bg-primary text-primary-foreground font-medium"
                                                    : "text-sidebar-foreground hover:text-sidebar-foreground/80"
                                            )}
                                        >
                                            <child.icon className="h-4 w-4 flex-shrink-0" />
                                            <span>{child.label}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Footer - User Info Only */}
                    <div className="border-t border-sidebar-border p-4">
                        <div className="bg-sidebar-accent/50 rounded-md p-3">
                            <p className="text-xs font-medium text-sidebar-foreground/70">{t.sidebar.loggedInAs}</p>
                            <p className="text-sm font-semibold truncate">Admin User</p>
                            <p className="text-xs text-sidebar-foreground/50 truncate">admin@example.com</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Collapsed state - show icons with tooltips */}
            {hasChildren && isSecondaryCollapsed && (
                <div className="w-16 bg-sidebar border-r border-sidebar-border flex flex-col py-4">
                    {/* Expand button */}
                    <div className="flex justify-center mb-4">
                        <button
                            onClick={() => setIsSecondaryCollapsed(false)}
                            className="p-1 hover:bg-sidebar-accent rounded-md transition-colors"
                        >
                            <ChevronRight className="h-4 w-4 text-sidebar-foreground/60" />
                        </button>
                    </div>

                    {/* Child menu items as icons */}
                    <div className="flex flex-col items-center gap-2 px-2">
                        {selectedMenuItem?.children?.map((child) => {
                            const isActive = pathname === child.href || pathname.startsWith(child.href + "/");
                            return (
                                <div key={child.href} className="relative group">
                                    <Link href={child.href}>
                                        <button
                                            className={cn(
                                                "w-10 h-10 rounded-md flex items-center justify-center transition-colors",
                                                isActive
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                                            )}
                                        >
                                            <child.icon className="h-5 w-5" />
                                        </button>
                                    </Link>
                                    {/* Tooltip */}
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                        {child.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
