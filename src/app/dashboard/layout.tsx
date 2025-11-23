import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen w-full bg-background overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-muted/10">
                <div className="container mx-auto p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
