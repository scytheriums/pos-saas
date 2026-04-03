"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
    Shield,
    RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

type MenuItem = {
    icon: any;
    label: string;
    href?: string;
    children?: { label: string; href: string; icon: any }[];
};

export function Sidebar() {
    const pathname = usePathname();
    const { t } = useLanguage();
    const router = useRouter();
    const [selectedModule, setSelectedModule] = useState<string | null>(null);
    const [isSecondaryCollapsed, setIsSecondaryCollapsed] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

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
            ],
        },
        {
            icon: Store,
            label: t.sidebar.orders,
            children: [
                { label: "All Orders", href: "/dashboard/orders", icon: Store },
                { label: "Return", href: "/dashboard/returns", icon: RotateCcw },
            ],
        },
        { icon: Percent, label: "Promotions", href: "/dashboard/promotions" },
        {
            icon: Settings,
            label: t.sidebar.settings,
            children: [
                { label: "Business Profile", href: "/dashboard/settings/business", icon: Store },
                { label: "Receipt Settings", href: "/dashboard/settings/receipt", icon: FileText },
                { label: "POS Settings", href: "/dashboard/settings/pos", icon: Settings },
                { label: "SKU Settings", href: "/dashboard/settings/sku", icon: Settings },
                { label: "Localization", href: "/dashboard/settings/localization", icon: Globe },
                { label: t.sidebar.customers, href: "/dashboard/customers", icon: Users },
                { label: t.sidebar.team, href: "/dashboard/users", icon: UserCog },
                { label: "Roles & Permissions", href: "/dashboard/settings/roles", icon: Shield },
                { label: "Audit Log", href: "/dashboard/audit-logs", icon: BarChart3 },
            ],
        },
    ];

    // Auto-select module based on current path
    useEffect(() => {
        for (const item of menuItems) {
            if (item.children) {
                const isInModule = item.children.some(
                    (child) => pathname === child.href || pathname.startsWith(child.href + "/")
                );
                if (isInModule) {
                    setSelectedModule(item.label);
                    return;
                }
            }
        }
    }, [pathname]);

    const selectedMenuItem = menuItems.find((item) => item.label === selectedModule);
    const hasChildren = selectedMenuItem?.children && selectedMenuItem.children.length > 0;

    return (
        <div className="flex h-full">
            {/* Primary Icon Sidebar */}
            <div className="w-16 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-4 gap-2">
                <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center mb-4">
                    <Store className="h-6 w-6 text-primary-foreground" />
                </div>
                {menuItems.map((item) => {
                    const isActive =
                        selectedModule === item.label ||
                        (item.href && (pathname === item.href || pathname.startsWith(item.href + "/")));
                    return (
                        <div key={item.label} className="relative group">
                            <button
                                onClick={() => {
                                    if (item.children) {
                                        if (selectedModule !== item.label) {
                                            setIsTransitioning(true);
                                            setTimeout(() => {
                                                setSelectedModule(item.label);
                                                setTimeout(() => setIsTransitioning(false), 50);
                                            }, 150);
                                        }
                                        setIsSecondaryCollapsed(false);
                                    } else if (item.href) {
                                        window.location.href = item.href;
                                    }
                                }}
                                className={cn(
                                    "w-10 h-10 rounded-md flex items-center justify-center transition-colors",
                                    isActive ? "bg-primary/10 text-primary" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                {item.label}
                            </div>
                        </div>
                    );
                })}
                {/* Logout */}
                <div className="relative group mt-auto">
                    <button
                        onClick={() => {
                            authClient.signOut({
                                fetchOptions: { onSuccess: () => router.push('/sign-in') },
                            });
                        }}
                        className="w-10 h-10 rounded-md flex items-center justify-center transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        {t.sidebar.logout}
                    </div>
                </div>
            </div>

            {/* Secondary Submenu Sidebar */}
            {hasChildren && (
                <div
                    className={cn(
                        "bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out overflow-hidden h-full",
                        isSecondaryCollapsed ? "w-0 opacity-0" : "w-56 opacity-100"
                    )}
                >
                    <div className={cn(
                        "min-w-56 transition-all duration-300 ease-in-out h-full flex flex-col",
                        isSecondaryCollapsed ? "opacity-0 -translate-x-4" : "opacity-100 translate-x-0 delay-100"
                    )}>
                        {/* Header */}
                        <div className={cn(
                            "h-16 px-4 border-b border-sidebar-border flex items-center justify-between transition-all duration-200 shrink-0",
                            isTransitioning ? "opacity-0 translate-x-2" : "opacity-100 translate-x-0"
                        )}>
                            <h1 className="text-base font-semibold text-sidebar-foreground transition-all duration-200">
                                {selectedMenuItem?.label}
                            </h1>
                            <button
                                onClick={() => setIsSecondaryCollapsed(true)}
                                className="p-1 hover:bg-sidebar-accent rounded-md transition-all duration-200 hover:scale-110"
                            >
                                <ChevronLeft className="h-4 w-4 text-sidebar-foreground/60" />
                            </button>
                        </div>
                        {/* Navigation */}
                        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4">
                            <div className={cn(
                                "px-3 space-y-0.5 transition-all duration-200",
                                isTransitioning ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
                            )}>
                                {selectedMenuItem?.children?.map((child, index) => {
                                    const isActive = pathname === child.href || pathname.startsWith(child.href + "/");
                                    return (
                                        <Link key={child.href} href={child.href}>
                                            <div
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 hover:shadow-sm",
                                                    isActive ? "bg-primary text-primary-foreground font-medium" : "text-sidebar-foreground hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                                                )}
                                                style={{
                                                    transitionDelay: isTransitioning ? '0ms' : `${index * 30}ms`
                                                }}
                                            >
                                                <child.icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                                                <span className="transition-all duration-200">{child.label}</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </nav>
                        {/* Footer */}
                        <div className="border-t border-sidebar-border p-4 transition-all duration-200 mt-auto shrink-0">
                            <div className="bg-sidebar-accent/50 rounded-md p-3 transition-all duration-200 hover:bg-sidebar-accent/70">
                                <p className="text-xs font-medium text-sidebar-foreground/70">{t.sidebar.loggedInAs}</p>
                                <p className="text-sm font-semibold truncate">Admin User</p>
                                <p className="text-xs text-sidebar-foreground/50 truncate">admin@example.com</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Collapsed icons view */}
            {hasChildren && isSecondaryCollapsed && (
                <div className="w-16 bg-sidebar border-r border-sidebar-border flex flex-col py-4 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex justify-center mb-4">
                        <button
                            onClick={() => setIsSecondaryCollapsed(false)}
                            className="p-1 hover:bg-sidebar-accent rounded-md transition-all duration-200 hover:scale-110"
                        >
                            <ChevronRight className="h-4 w-4 text-sidebar-foreground/60" />
                        </button>
                    </div>
                    <div className="flex flex-col items-center gap-2 px-2">
                        {selectedMenuItem?.children?.map((child, index) => {
                            const isActive = pathname === child.href || pathname.startsWith(child.href + "/");
                            return (
                                <div
                                    key={child.href}
                                    className="relative group transition-all duration-200"
                                    style={{
                                        animationDelay: `${index * 30}ms`
                                    }}
                                >
                                    <Link href={child.href}>
                                        <button
                                            className={cn(
                                                "w-10 h-10 rounded-md flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-md",
                                                isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                                            )}
                                        >
                                            <child.icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                                        </button>
                                    </Link>
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-0 group-hover:translate-x-1 z-50">
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
