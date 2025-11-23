import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen w-full bg-background overflow-hidden">
            <div className="print:hidden">
                <Sidebar />
            </div>
            <main className="flex-1 overflow-y-auto bg-muted/10 print:w-full print:bg-white print:overflow-visible">
                <div className="container mx-auto p-6 print:p-0 print:w-full print:max-w-none">
                    {children}
                </div>
            </main>
        </div>
    );
}
