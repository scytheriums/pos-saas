import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { processSyncQueue, retryAllFailed } from '@/lib/sync';

export function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true);
    const [syncing, setSyncing] = useState(false);

    // Live counts from sync queue
    const pendingCount = useLiveQuery(() => db.syncQueue.where('status').equals('pending').count(), [], 0);
    const syncingCount = useLiveQuery(() => db.syncQueue.where('status').equals('syncing').count(), [], 0);
    const failedCount = useLiveQuery(() => db.syncQueue.where('status').equals('failed').count(), [], 0);
    const unsyncedCount = (pendingCount ?? 0) + (syncingCount ?? 0) + (failedCount ?? 0);

    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = async () => {
            setIsOnline(true);
            // Auto-sync when coming back online
            setSyncing(true);
            try {
                await processSyncQueue();
            } finally {
                setSyncing(false);
            }
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleSync = async () => {
        if (!isOnline || syncing) return;
        setSyncing(true);
        try {
            if ((failedCount ?? 0) > 0) {
                await retryAllFailed();
            }
            await processSyncQueue();
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    // Determine badge state
    const isSyncing = syncing || (syncingCount ?? 0) > 0;
    const hasFailed = (failedCount ?? 0) > 0 && !isSyncing;
    const hasPending = (pendingCount ?? 0) > 0 && !isSyncing;

    // Show nothing when fully online and synced
    if (isOnline && unsyncedCount === 0 && !isSyncing) return null;

    // Status label and style
    let statusLabel: string;
    let statusIcon: React.ReactNode;
    let containerClass: string;

    if (!isOnline) {
        statusLabel = 'Offline Mode';
        statusIcon = <WifiOff className="h-4 w-4" />;
        containerClass = 'bg-red-100 text-red-800 border border-red-200';
    } else if (hasFailed) {
        statusLabel = 'Sync Error';
        statusIcon = <AlertCircle className="h-4 w-4" />;
        containerClass = 'bg-red-100 text-red-800 border border-red-200';
    } else if (isSyncing) {
        statusLabel = 'Syncing…';
        statusIcon = <Loader2 className="h-4 w-4 animate-spin" />;
        containerClass = 'bg-blue-100 text-blue-800 border border-blue-200';
    } else if (hasPending) {
        statusLabel = 'Pending Sync';
        statusIcon = <Wifi className="h-4 w-4" />;
        containerClass = 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    } else {
        statusLabel = '✓ Synced';
        statusIcon = <CheckCircle className="h-4 w-4" />;
        containerClass = 'bg-green-100 text-green-800 border border-green-200';
    }

    return (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition-all text-xs font-semibold ${containerClass}`}>
            {statusIcon}
            <span>{statusLabel}</span>
            {unsyncedCount > 0 && (
                <span className="bg-current/20 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                    {unsyncedCount}
                </span>
            )}
            {isOnline && (hasPending || hasFailed) && (
                <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 ml-1 bg-white/60 hover:bg-white/90 border-0 text-xs font-semibold"
                    onClick={handleSync}
                    disabled={isSyncing}
                >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sync
                </Button>
            )}
        </div>
    );
}

