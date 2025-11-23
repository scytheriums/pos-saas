export default function POSLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-screen w-full bg-background overflow-hidden">
            {children}
        </div>
    );
}
