"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Store,
    MoreHorizontal,
    Percent,
    Users,
    Settings,
    UserCog,
    BarChart3,
    LogOut,
    X,
    RotateCcw,
    FolderTree,
    ClipboardList,
    FileText,
    Globe,
    Shield,
    Timer,
    Receipt,
    Star,
} from "lucide-react";
import { useState, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { useLanguage } from "@/contexts/LanguageContext";

const PRIMARY_TABS = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard/analytics" },
    { icon: ShoppingCart, label: "POS", href: "/pos" },
    { icon: Package, label: "Products", href: "/dashboard/products" },
    { icon: Store, label: "Orders", href: "/dashboard/orders" },
];

const MORE_SECTIONS = [
    {
        title: "Catalog",
        items: [
            { icon: FolderTree, label: "Categories", href: "/dashboard/categories" },
            { icon: ClipboardList, label: "Adjustments", href: "/dashboard/inventory/adjustments" },
            { icon: Percent, label: "Promotions", href: "/dashboard/promotions" },
            { icon: RotateCcw, label: "Returns", href: "/dashboard/returns" },
        ],
    },
    {
        title: "Manage",
        items: [
            { icon: Users, label: "Customers", href: "/dashboard/customers" },
            { icon: Timer, label: "Shifts", href: "/dashboard/shifts" },
            { icon: Receipt, label: "Expenses", href: "/dashboard/expenses" },
            { icon: UserCog, label: "Team", href: "/dashboard/users" },
            { icon: BarChart3, label: "Audit Log", href: "/dashboard/audit-logs" },
        ],
    },
    {
        title: "Settings",
        items: [
            { icon: Store, label: "Business", href: "/dashboard/settings/business" },
            { icon: FileText, label: "Receipt", href: "/dashboard/settings/receipt" },
            { icon: Settings, label: "POS", href: "/dashboard/settings/pos" },
            { icon: Globe, label: "Localization", href: "/dashboard/settings/localization" },
            { icon: Star, label: "Loyalty", href: "/dashboard/settings/loyalty" },
            { icon: Shield, label: "Roles", href: "/dashboard/settings/roles" },
        ],
    },
];

export function MobileBottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useLanguage();
    const [sheetMounted, setSheetMounted] = useState(false);
    const [sheetVisible, setSheetVisible] = useState(false);
    const sheetRef = useRef<HTMLDivElement>(null);
    const sheetScrollRef = useRef<HTMLDivElement>(null);
    const touchStartY = useRef(0);

    const openSheet = () => {
        setSheetMounted(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setSheetVisible(true)));
    };

    const closeSheet = () => {
        setSheetVisible(false);
        setTimeout(() => setSheetMounted(false), 350);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
        if (sheetRef.current) sheetRef.current.style.transition = 'none';
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const delta = e.touches[0].clientY - touchStartY.current;
        const scrollTop = sheetScrollRef.current?.scrollTop ?? 0;
        if (delta > 0 && scrollTop === 0 && sheetRef.current) {
            sheetRef.current.style.transform = `translateY(${delta}px)`;
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const delta = e.changedTouches[0].clientY - touchStartY.current;
        if (sheetRef.current) {
            sheetRef.current.style.transition = '';
            sheetRef.current.style.transform = '';
        }
        if (delta > 80 && (sheetScrollRef.current?.scrollTop ?? 0) === 0) closeSheet();
    };

    // Hide on POS page — it has its own full-screen layout
    if (pathname === "/pos" || pathname.startsWith("/pos/")) return null;

    const isActive = (href: string) =>
        pathname === href || pathname.startsWith(href + "/");

    const anyMoreActive = MORE_SECTIONS.flatMap((s) => s.items).some((i) =>
        isActive(i.href)
    );

    return (
        <>
            {/* ── Bottom Tab Bar ── */}
            <nav className="print:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 lg:hidden"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
                <div className="flex items-stretch">
                    {PRIMARY_TABS.map((tab) => {
                        const active = isActive(tab.href);
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={cn(
                                    "relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors min-h-14",
                                    active ? "text-primary" : "text-gray-400"
                                )}
                            >
                                {active && (
                                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />
                                )}
                                <tab.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                                <span>{tab.label}</span>
                            </Link>
                        );
                    })}

                    {/* More */}
                    <button
                        className={cn(
                            "relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors min-h-14",
                            sheetMounted || anyMoreActive ? "text-primary" : "text-gray-400"
                        )}
                        onClick={openSheet}
                    >
                        {(sheetMounted || anyMoreActive) && (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />
                        )}
                        <MoreHorizontal className={cn("w-5 h-5", (sheetMounted || anyMoreActive) && "stroke-[2.5]")} />
                        <span>More</span>
                    </button>
                </div>
            </nav>

            {/* ── More Sheet ── */}
            {sheetMounted && (
                <div
                    className="fixed inset-0 z-50 lg:hidden"
                    onClick={closeSheet}
                >
                    <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${sheetVisible ? 'opacity-100' : 'opacity-0'}`} />
                    <div
                        ref={sheetRef}
                        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-xl max-h-[80dvh] flex flex-col transition-transform duration-300 ease-out will-change-transform ${sheetVisible ? 'translate-y-0' : 'translate-y-full'}`}
                        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1 shrink-0">
                            <div className="w-10 h-1 bg-gray-300 rounded-full" />
                        </div>

                        {/* Title row */}
                        <div className="flex items-center justify-between px-5 py-2 shrink-0">
                            <h2 className="font-semibold text-gray-900 text-base">Menu</h2>
                            <button
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                onClick={closeSheet}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Scrollable sections */}
                        <div ref={sheetScrollRef} className="overflow-y-auto overscroll-contain flex-1 px-4 pb-4 space-y-4">
                            {MORE_SECTIONS.map((section) => (
                                <div key={section.title}>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
                                        {section.title}
                                    </p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {section.items.map((item) => {
                                            const active = isActive(item.href);
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    onClick={closeSheet}
                                                    className={cn(
                                                        "flex flex-col items-center gap-1.5 p-3 rounded-2xl text-[11px] font-medium transition-colors text-center",
                                                        active
                                                            ? "bg-primary/10 text-primary"
                                                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                                                    )}
                                                >
                                                    <item.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                                                    <span className="leading-tight">{item.label}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* Logout row */}
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
                                    Account
                                </p>
                                <button
                                    className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100 transition-colors"
                                    onClick={() =>
                                        authClient.signOut({
                                            fetchOptions: {
                                                onSuccess: () => router.push("/sign-in"),
                                            },
                                        })
                                    }
                                >
                                    <LogOut className="w-4 h-4" />
                                    {t.sidebar.logout}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
