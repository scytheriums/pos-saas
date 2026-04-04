import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { MobileDashboardHeader } from "@/components/dashboard/MobileDashboardHeader";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen w-full bg-background overflow-hidden">
            {/* Sidebar: desktop only */}
            <div className="print:hidden hidden lg:block">
                <Sidebar />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Top bar: mobile/tablet only */}
                <MobileDashboardHeader />
                <main className="flex-1 overflow-y-auto bg-muted/10 print:w-full print:bg-white print:overflow-visible pb-16 lg:pb-0">
                    <div className="container mx-auto p-4 lg:p-6 print:p-0 print:w-full print:max-w-none">
                        {children}
                    </div>
                </main>
            </div>
            {/* Bottom nav: mobile/tablet only (lg:hidden inside component) */}
            <MobileBottomNav />
        </div>
    );
}
