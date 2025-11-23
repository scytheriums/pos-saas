'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/analytics/MetricCard';
import { SalesChart } from '@/components/analytics/SalesChart';
import { LowStockTable } from '@/components/analytics/LowStockTable';
import { DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface DailyIncomeData {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    topSellingProducts: any[];
}

interface SalesTrendsData {
    data: Array<{
        date: string;
        revenue: number;
        orders: number;
    }>;
}

interface LowStockData {
    items: Array<{
        id: string;
        productName: string;
        sku: string;
        currentStock: number;
        minStock: number;
        urgency: string;
    }>;
    threshold: number;
}

export default function AnalyticsPage() {
    const [dailyIncome, setDailyIncome] = useState<DailyIncomeData | null>(null);
    const [salesTrends, setSalesTrends] = useState<SalesTrendsData | null>(null);
    const [lowStock, setLowStock] = useState<LowStockData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const [incomeRes, trendsRes, stockRes] = await Promise.all([
                    fetch('/api/analytics/daily-income'),
                    fetch('/api/analytics/sales-trends?period=week'),
                    fetch('/api/analytics/low-stock')
                ]);

                if (!incomeRes.ok || !trendsRes.ok || !stockRes.ok) {
                    throw new Error('Failed to fetch analytics data');
                }

                const [income, trends, stock] = await Promise.all([
                    incomeRes.json(),
                    trendsRes.json(),
                    stockRes.json()
                ]);

                setDailyIncome(income);
                setSalesTrends(trends);
                setLowStock(stock);
            } catch (err) {
                console.error('Error fetching analytics:', err);
                setError('Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="p-8 space-y-6">
                <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
                <Skeleton className="h-96" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <h1 className="text-3xl font-bold mb-4">Analytics Dashboard</h1>
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                    Last updated: {new Date().toLocaleString()}
                </p>
            </div>

            {/* Metric Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                    title="Total Revenue (Today)"
                    value={formatCurrency(dailyIncome?.totalRevenue || 0)}
                    icon={DollarSign}
                />
                <MetricCard
                    title="Orders (Today)"
                    value={dailyIncome?.totalOrders || 0}
                    icon={ShoppingCart}
                />
                <MetricCard
                    title="Average Order Value"
                    value={formatCurrency(dailyIncome?.averageOrderValue || 0)}
                    icon={TrendingUp}
                />
            </div>

            {/* Sales Trends Chart */}
            {salesTrends && (
                <SalesChart
                    data={salesTrends.data}
                    title="Sales Trends (Last 7 Days)"
                />
            )}

            {/* Low Stock Alerts */}
            {lowStock && (
                <LowStockTable
                    items={lowStock.items}
                    threshold={lowStock.threshold}
                />
            )}
        </div>
    );
}
