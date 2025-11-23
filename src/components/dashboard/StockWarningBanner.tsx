'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface LowStockItem {
    id: string;
    productName: string;
    sku: string;
    currentStock: number;
    minStock: number;
    urgency: string;
}

export function StockWarningBanner() {
    const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLowStock() {
            try {
                const response = await fetch('/api/analytics/low-stock?threshold=10');
                if (response.ok) {
                    const data = await response.json();
                    setLowStockItems(data.items || []);
                }
            } catch (error) {
                console.error('Error fetching low stock:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchLowStock();
        // Refresh every 5 minutes
        const interval = setInterval(fetchLowStock, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading || dismissed || lowStockItems.length === 0) {
        return null;
    }

    const criticalItems = lowStockItems.filter(item => item.urgency === 'critical');
    const highItems = lowStockItems.filter(item => item.urgency === 'high');

    return (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 mb-6">
            <div className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                                Low Stock Alert
                            </h3>
                            <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                                {criticalItems.length > 0 && (
                                    <span className="font-medium">
                                        {criticalItems.length} product{criticalItems.length !== 1 ? 's' : ''} out of stock
                                    </span>
                                )}
                                {criticalItems.length > 0 && highItems.length > 0 && ' and '}
                                {highItems.length > 0 && (
                                    <span>
                                        {highItems.length} product{highItems.length !== 1 ? 's' : ''} running low
                                    </span>
                                )}
                            </p>
                            <div className="mt-3 flex gap-2">
                                <Link href="/dashboard/analytics">
                                    <Button size="sm" variant="outline" className="border-orange-300 hover:bg-orange-100 dark:border-orange-700 dark:hover:bg-orange-900">
                                        View Details
                                    </Button>
                                </Link>
                                <Link href="/dashboard/products">
                                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                                        Manage Stock
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDismissed(true)}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </Card>
    );
}
