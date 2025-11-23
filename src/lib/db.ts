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
}

export class POSDatabase extends Dexie {
    products!: Table<OfflineProduct>;
    orders!: Table<OfflineOrder>;

    constructor() {
        super('NexusPOS_DB');
        this.version(2).stores({
            products: 'id, category', // Primary key and indexed props
            orders: '++id, timestamp, synced' // Auto-increment primary key
        }).upgrade(tx => {
            // Upgrade logic if needed, but adding optional fields usually doesn't require data migration for existing rows
        });
        this.version(1).stores({
            products: 'id, category',
            orders: '++id, timestamp, synced'
        });
    }
}

export const db = new POSDatabase();
