import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

export function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true);
    const [syncing, setSyncing] = useState(false);

    // Count unsynced orders
    // const unsyncedCount = useLiveQuery(
    //     () => db.orders.where('synced').equals(0).count()
    // );
    const unsyncedCount = 0;

    useEffect(() => {
        // Initial check
        setIsOnline(navigator.onLine);

        // Listeners
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleSync = async () => {
        if (!isOnline) return;
        setSyncing(true);
        try {
            const unsyncedOrders = await db.orders.where('synced').equals(0).toArray();

            for (const order of unsyncedOrders) {
                const res = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: order.items,
                        total: order.total,
                        tenantId: order.tenantId,
                        offlineId: order.id // Pass ID to prevent duplicates if needed
                    })
                });

                if (res.ok) {
                    await db.orders.update(order.id!, { synced: true });
                }
            }
            alert('Sync completed!');
        } catch (error) {
            console.error("Sync failed:", error);
            alert('Sync failed. Please try again.');
        } finally {
            setSyncing(false);
        }
    };

    if (isOnline && !unsyncedCount) return null;

    return (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all ${isOnline ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
            {isOnline ? (
                <Wifi className="h-5 w-5" />
            ) : (
                <WifiOff className="h-5 w-5" />
            )}

            <div className="flex flex-col text-xs">
                <span className="font-bold">{isOnline ? 'Online' : 'Offline Mode'}</span>
                {unsyncedCount ? (
                    <span>{unsyncedCount} unsynced orders</span>
                ) : (
                    <span>System ready</span>
                )}
            </div>

            {isOnline && unsyncedCount ? (
                <Button
                    size="sm"
                    variant="outline"
                    className="h-8 ml-2 bg-white/50 hover:bg-white/80 border-0"
                    onClick={handleSync}
                    disabled={syncing}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Sync
                </Button>
            ) : null}
        </div>
    );
}
