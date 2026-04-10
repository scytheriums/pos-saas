/**
 * Offline Sync Service — 3.3 Offline Sync Conflict Resolution
 *
 * Handles syncing offline orders to the server with:
 * - Exponential backoff retry queue
 * - Server-wins conflict resolution via offlineClientId deduplication
 * - Sync status tracking per order
 */

import { db, SyncQueueItem } from './db';

const BASE_RETRY_DELAY_MS = 2000; // 2s base
const MAX_ATTEMPTS = 5;

/**
 * Add an offline order to the sync queue.
 * Called immediately after saving an order to Dexie while offline.
 */
export async function enqueueSyncOrder(offlineOrderId: number): Promise<void> {
    const existing = await db.syncQueue
        .where('offlineOrderId')
        .equals(offlineOrderId)
        .first();

    if (existing) return; // Already queued

    await db.syncQueue.add({
        offlineOrderId,
        attempts: 0,
        nextRetryAt: Date.now(),
        status: 'pending',
        createdAt: Date.now(),
    });
}

/**
 * Calculate next retry delay using exponential backoff with jitter.
 * Delay = BASE * 2^attempts + random jitter (0–1000ms)
 */
function nextRetryDelay(attempts: number): number {
    const exponential = BASE_RETRY_DELAY_MS * Math.pow(2, attempts);
    const jitter = Math.floor(Math.random() * 1000);
    return Math.min(exponential + jitter, 60_000); // Cap at 60s
}

/**
 * Process all pending sync queue items that are ready to retry.
 * Should be called when the device comes back online.
 *
 * Returns: { synced: number, failed: number }
 */
export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
    const now = Date.now();
    const pendingItems = await db.syncQueue
        .where('status')
        .anyOf(['pending', 'failed'])
        .toArray();

    const ready = pendingItems.filter(item => item.nextRetryAt <= now);

    let synced = 0;
    let failed = 0;

    for (const item of ready) {
        if (!item.id) continue;

        // Mark as syncing
        await db.syncQueue.update(item.id, { status: 'syncing' });

        const order = await db.orders.get(item.offlineOrderId);
        if (!order) {
            // Order was deleted locally — remove from queue
            await db.syncQueue.delete(item.id);
            continue;
        }

        if (order.synced) {
            // Already synced by another path — clean up queue
            await db.syncQueue.update(item.id, { status: 'done' });
            synced++;
            continue;
        }

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: order.items,
                    total: order.total,
                    tenantId: order.tenantId,
                    paymentMethod: order.paymentMethod,
                    cashTendered: order.cashTendered,
                    change: order.change,
                    customerName: order.customerName,
                    customerId: order.customerId,
                    discountId: order.discountId,
                    discountAmount: order.discountAmount,
                    offlineClientId: order.offlineClientId,
                    clientLastModifiedAt: order.lastModifiedAt,
                }),
            });

            if (res.ok) {
                // Mark order as synced in Dexie
                await db.orders.update(item.offlineOrderId, { synced: true });
                await db.syncQueue.update(item.id, { status: 'done' });
                synced++;
            } else if (res.status === 409) {
                // Server-wins: server has a newer version — treat as done, keep server version
                await db.orders.update(item.offlineOrderId, { synced: true });
                await db.syncQueue.update(item.id, { status: 'done' });
                synced++;
            } else {
                const errorText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }
        } catch (error) {
            const newAttempts = item.attempts + 1;
            const errorMsg = error instanceof Error ? error.message : String(error);

            if (newAttempts >= MAX_ATTEMPTS) {
                // Give up — mark as permanently failed
                await db.syncQueue.update(item.id, {
                    attempts: newAttempts,
                    status: 'failed',
                    lastError: errorMsg,
                    nextRetryAt: Infinity,
                });
            } else {
                // Schedule retry with exponential backoff
                await db.syncQueue.update(item.id, {
                    attempts: newAttempts,
                    status: 'failed',
                    lastError: errorMsg,
                    nextRetryAt: Date.now() + nextRetryDelay(newAttempts),
                });
            }
            failed++;
        }
    }

    return { synced, failed };
}

/**
 * Count orders in each sync state for the status indicator.
 */
export async function getSyncStats(): Promise<{
    pending: number;
    syncing: number;
    failed: number;
}> {
    const [pending, syncing, failed] = await Promise.all([
        db.syncQueue.where('status').equals('pending').count(),
        db.syncQueue.where('status').equals('syncing').count(),
        db.syncQueue.where('status').equals('failed').count(),
    ]);
    return { pending, syncing, failed };
}

/**
 * Force retry all permanently-failed queue items.
 * Resets attempts and nextRetryAt so they will be retried immediately.
 */
export async function retryAllFailed(): Promise<void> {
    const failedItems = await db.syncQueue.where('status').equals('failed').toArray();
    await Promise.all(
        failedItems
            .filter(item => item.id !== undefined)
            .map(item =>
                db.syncQueue.update(item.id!, {
                    attempts: 0,
                    status: 'pending',
                    nextRetryAt: Date.now(),
                    lastError: undefined,
                })
            )
    );
}
