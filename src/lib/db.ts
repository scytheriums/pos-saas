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
}

export class POSDatabase extends Dexie {
    products!: Table<OfflineProduct>;
    orders!: Table<OfflineOrder>;

    constructor() {
        super('NexusPOS_DB');
        this.version(1).stores({
            products: 'id, category', // Primary key and indexed props
            orders: '++id, timestamp, synced' // Auto-increment primary key
        });
    }
}

export const db = new POSDatabase();
