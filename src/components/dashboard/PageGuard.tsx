'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { canAccessPath, homePath } from '@/lib/page-access';

/** Shows a clear message instead of a page full of permission errors. */
export function PageGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const permissions = usePermissions();
    const allowed = canAccessPath(pathname, permissions);

    // The default landing page is analytics; send people without access to it somewhere useful
    useEffect(() => {
        if (!allowed && pathname === '/dashboard/analytics') {
            router.replace(homePath(permissions));
        }
    }, [allowed, pathname, permissions, router]);

    if (allowed) return <>{children}</>;

    return (
        <div className="flex flex-col items-center justify-center text-center gap-3 py-24">
            <ShieldOff className="h-10 w-10 text-muted-foreground" />
            <h1 className="text-lg font-semibold">You don&apos;t have access to this page</h1>
            <p className="text-sm text-muted-foreground max-w-sm">
                Your role doesn&apos;t include this section. Ask the store owner if you need it.
            </p>
            <Link href={homePath(permissions)}>
                <Button size="sm" variant="outline">Go to my home page</Button>
            </Link>
        </div>
    );
}
