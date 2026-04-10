import Dexie, { Table } from 'dexie';

export interface OfflineProduct {
    id: string;
    name: string;
    price: number;
    category: string;
    variants: any[]; // Storing variants as JSON structure
    updatedAt: number;
}

export interface OfflineOrder {
    id?: number; // Auto-incremented by Dexie
    items: any[];
    total: number;
    timestamp: number;
    synced: boolean;
    tenantId: string;
    paymentMethod?: string;
    cashTendered?: number;
    change?: number;
    customerName?: string;
    customerId?: string;
    discountId?: string;
    discountAmount?: number;
    lastModifiedAt?: number; // Client-side last modified timestamp (ms)
    offlineClientId?: string; // UUID for server-side deduplication
}

export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'done';

export interface SyncQueueItem {
    id?: number; // Auto-incremented
    offlineOrderId: number; // References OfflineOrder.id
    attempts: number;
    nextRetryAt: number; // Unix ms timestamp — when to next attempt
    lastError?: string;
    status: SyncStatus;
    createdAt: number;
}

export class POSDatabase extends Dexie {
    products!: Table<OfflineProduct>;
    orders!: Table<OfflineOrder>;
    syncQueue!: Table<SyncQueueItem>;

    constructor() {
        super('NexusPOS_DB');
        this.version(1).stores({
            products: 'id, category',
            orders: '++id, timestamp, synced'
        });
        this.version(2).stores({
            products: 'id, category',
            orders: '++id, timestamp, synced'
        });
        this.version(3).stores({
            products: 'id, category',
            orders: '++id, timestamp, synced, lastModifiedAt',
            syncQueue: '++id, offlineOrderId, status, nextRetryAt'
        });
    }
}

export const db = new POSDatabase();
