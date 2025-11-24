"use client";
import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/analytics/MetricCard';
import { SalesChart } from '@/components/analytics/SalesChart';
import { LowStockTable } from '@/components/analytics/LowStockTable';
import { TopProductsTable } from '@/components/analytics/TopProductsTable';
import { CategoryPieChart } from '@/components/analytics/CategoryPieChart';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DollarSign, ShoppingCart, TrendingUp, CreditCard, Download } from 'lucide-react';
import { formatCurrencyWithSettings, formatDateTimeWithSettings } from '@/lib/format';
import { useTenantSettings } from '@/contexts/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker';
import { addDays, startOfDay, endOfDay, format } from 'date-fns';

interface SummaryData {
    totalRevenue: number;
    totalProfit: number;
    totalOrders: number;
    averageOrderValue: number;
    margin: number;
}

interface ProductStat {
    id: string;
    name: string;
    revenue: number;
    profit: number;
    sales: number;
}

interface CategoryStat {
    name: string;
    value: number;
}

interface PaymentStat {
    name: string;
    value: number;
    count: number;
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
    const settings = useTenantSettings();
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: addDays(new Date(), -30),
        to: new Date(),
    });

    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [topProducts, setTopProducts] = useState<ProductStat[]>([]);
    const [categories, setCategories] = useState<CategoryStat[]>([]);
    const [payments, setPayments] = useState<PaymentStat[]>([]);
    const [salesTrends, setSalesTrends] = useState<SalesTrendsData | null>(null);
    const [lowStock, setLowStock] = useState<LowStockData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAnalytics() {
            setLoading(true);
            try {
                const queryParams = new URLSearchParams();
                if (dateRange?.from) queryParams.append('startDate', dateRange.from.toISOString());
                if (dateRange?.to) queryParams.append('endDate', dateRange.to.toISOString());

                const queryString = queryParams.toString();

                const [summaryRes, productsRes, categoriesRes, paymentsRes, trendsRes, stockRes] = await Promise.all([
                    fetch(`/api/analytics/summary?${queryString}`),
                    fetch(`/api/analytics/products?${queryString}&limit=5`),
                    fetch(`/api/analytics/categories?${queryString}`),
                    fetch(`/api/analytics/payments?${queryString}`),
                    fetch(`/api/analytics/sales-trends?period=week`), // Keep trends fixed for now or update API to accept range
                    fetch('/api/analytics/low-stock'),
                ]);

                if (!summaryRes.ok || !productsRes.ok || !categoriesRes.ok || !paymentsRes.ok) {
                    throw new Error('Failed to fetch analytics data');
                }

                const [summaryData, productsData, categoriesData, paymentsData, trendsData, stockData] = await Promise.all([
                    summaryRes.json(),
                    productsRes.json(),
                    categoriesRes.json(),
                    paymentsRes.json(),
                    trendsRes.json(),
                    stockRes.json(),
                ]);

                setSummary(summaryData);
                setTopProducts(productsData);
                setCategories(categoriesData);
                setPayments(paymentsData);
                setSalesTrends(trendsData);
                setLowStock(stockData);
            } catch (err) {
                console.error('Error fetching analytics:', err);
                setError('Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();
    }, [dateRange]);

    const handleExport = () => {
        if (!summary || !topProducts || !categories) return;

        const csvContent = [
            ['Analytics Report'],
            [`Date Range: ${dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''} to ${dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}`],
            [],
            ['Summary'],
            ['Total Revenue', 'Total Profit', 'Total Orders', 'Avg Order Value', 'Margin'],
            [summary.totalRevenue, summary.totalProfit, summary.totalOrders, summary.averageOrderValue, `${summary.margin.toFixed(2)}%`],
            [],
            ['Top Products'],
            ['Name', 'Sales', 'Revenue', 'Profit'],
            ...topProducts.map(p => [p.name, p.sales, p.revenue, p.profit]),
            [],
            ['Category Sales'],
            ['Category', 'Revenue'],
            ...categories.map(c => [c.name, c.value]),
        ].map(e => e.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `analytics_report_${format(new Date(), 'yyyyMMdd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading && !summary) {
        return (
            <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                    <Skeleton className="h-10 w-[300px]" />
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-96" />
                    <Skeleton className="h-96" />
                </div>
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Overview of your business performance
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total Revenue"
                    value={formatCurrencyWithSettings(summary?.totalRevenue || 0, settings)}
                    icon={DollarSign}
                    description="Gross revenue in period"
                />
                <MetricCard
                    title="Total Profit"
                    value={formatCurrencyWithSettings(summary?.totalProfit || 0, settings)}
                    icon={TrendingUp}
                    description={`Margin: ${summary?.margin.toFixed(1)}%`}
                    trend={{ value: summary?.margin || 0, label: "margin", positive: (summary?.margin || 0) > 20 }}
                />
                <MetricCard
                    title="Total Orders"
                    value={summary?.totalOrders || 0}
                    icon={ShoppingCart}
                    description="Completed orders"
                />
                <MetricCard
                    title="Avg Order Value"
                    value={formatCurrencyWithSettings(summary?.averageOrderValue || 0, settings)}
                    icon={CreditCard}
                    description="Revenue per order"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                {/* Sales Chart */}
                <div className="md:col-span-4">
                    {salesTrends && (
                        <SalesChart data={salesTrends.data} title="Revenue Trend (Last 7 Days)" />
                    )}
                </div>

                {/* Category Chart */}
                <div className="md:col-span-3">
                    <CategoryPieChart data={categories} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Top Products */}
                <TopProductsTable data={topProducts} />

                {/* Low Stock Alerts */}
                {lowStock && (
                    <div className="h-full">
                        <LowStockTable items={lowStock.items} threshold={lowStock.threshold} />
                    </div>
                )}
            </div>
        </div>
    );
}
