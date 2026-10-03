import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { processSyncQueue, retryAllFailed, recoverInterruptedSyncs, getFailedSales, discardFailedSale, FailedSale } from '@/lib/sync';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const RETRY_INTERVAL_MS = 30_000;

export function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [failedSales, setFailedSales] = useState<FailedSale[]>([]);
    const [confirmDiscard, setConfirmDiscard] = useState<number | null>(null);

    // Live counts from sync queue
    const pendingCount = useLiveQuery(() => db.syncQueue.where('status').equals('pending').count(), [], 0);
    const syncingCount = useLiveQuery(() => db.syncQueue.where('status').equals('syncing').count(), [], 0);
    const failedCount = useLiveQuery(() => db.syncQueue.where('status').equals('failed').count(), [], 0);
    const unsyncedCount = (pendingCount ?? 0) + (syncingCount ?? 0) + (failedCount ?? 0);

    // A tab closed mid-sync leaves items "syncing": queue them again
    useEffect(() => {
        recoverInterruptedSyncs().catch(() => {});
    }, []);

    // Keep retrying pending sales in the background while online
    useEffect(() => {
        if (!isOnline || (pendingCount ?? 0) === 0) return;
        const timer = setInterval(() => {
            if (!navigator.onLine) return;
            processSyncQueue().catch(err => console.warn('Background sync failed', err));
        }, RETRY_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [isOnline, pendingCount]);

    const openReview = async () => {
        setFailedSales(await getFailedSales());
        setConfirmDiscard(null);
        setReviewOpen(true);
    };

    const retryOne = async () => {
        setReviewOpen(false);
        await handleSync();
    };

    const discard = async (queueId: number) => {
        await discardFailedSale(queueId);
        const remaining = await getFailedSales();
        setFailedSales(remaining);
        setConfirmDiscard(null);
        if (remaining.length === 0) setReviewOpen(false);
    };

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
            {hasFailed && (
                <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 bg-white/60 hover:bg-white/90 border-0 text-xs font-semibold"
                    onClick={openReview}
                >
                    Review
                </Button>
            )}

            <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Sales that didn&apos;t sync</DialogTitle>
                        <DialogDescription>
                            These sales were completed at the till but the server didn&apos;t record them.
                            Fix the cause (for example, restock the item), then retry. Remove a sale only after
                            you&apos;ve recorded it another way.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {failedSales.map(sale => (
                            <div key={sale.queueId} className="border rounded-md p-3 space-y-1 text-sm">
                                <div className="flex justify-between gap-2 font-medium">
                                    <span>{sale.order ? new Date(sale.order.timestamp).toLocaleString('id-ID') : 'Sale'}</span>
                                    <span>Rp {Number(sale.order?.total ?? 0).toLocaleString('id-ID')}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {sale.order?.items.length ?? 0} item(s)
                                </div>
                                <p className="text-xs text-red-700">{sale.error}</p>
                                <div className="flex justify-end gap-2 pt-1">
                                    {confirmDiscard === sale.queueId ? (
                                        <>
                                            <span className="text-xs self-center">Remove this sale from this device?</span>
                                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirmDiscard(null)}>Keep</Button>
                                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => discard(sale.queueId)}>Remove</Button>
                                        </>
                                    ) : (
                                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmDiscard(sale.queueId)}>Remove…</Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end">
                        <Button size="sm" onClick={retryOne} disabled={!isOnline || isSyncing}>
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            Retry all
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

