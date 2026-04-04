"use client";
import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/analytics/MetricCard';
import { SalesChart } from '@/components/analytics/SalesChart';
import { LowStockTable } from '@/components/analytics/LowStockTable';
import { TopProductsTable } from '@/components/analytics/TopProductsTable';
import { CategoryPieChart } from '@/components/analytics/CategoryPieChart';
import { DollarSign, ShoppingCart, TrendingUp, CreditCard, Download, SlidersHorizontal } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCurrencyWithSettings } from '@/lib/format';
import { useTenantSettings } from '@/contexts/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays, startOfDay, endOfDay, startOfMonth, format } from 'date-fns';

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

function getDateRange(preset: string) {
    const now = new Date();
    switch (preset) {
        case 'today': return { from: startOfDay(now), to: endOfDay(now) };
        case '7d':    return { from: addDays(now, -7), to: now };
        case '90d':   return { from: addDays(now, -90), to: now };
        case 'month': return { from: startOfMonth(now), to: now };
        case '1y':    return { from: addDays(now, -365), to: now };
        default:      return { from: addDays(now, -30), to: now }; // '30d'
    }
}

export default function AnalyticsPage() {
    const settings = useTenantSettings();
    const [datePreset, setDatePreset] = useState('30d');
    const [filterOpen, setFilterOpen] = useState(false);
    const [pendingPreset, setPendingPreset] = useState('30d');

    const handleFilterOpen = (open: boolean) => {
        if (open) setPendingPreset(datePreset);
        setFilterOpen(open);
    };

    const applyFilter = () => {
        setDatePreset(pendingPreset);
        setFilterOpen(false);
    };

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
                const range = getDateRange(datePreset);
                if (range.from) queryParams.append('startDate', range.from.toISOString());
                if (range.to) queryParams.append('endDate', range.to.toISOString());

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
    }, [datePreset]);

    const handleExport = () => {
        if (!summary || !topProducts || !categories) return;

        const range = getDateRange(datePreset);
        const csvContent = [
            ['Analytics Report'],
            [`Date Range: ${format(range.from, 'yyyy-MM-dd')} to ${format(range.to, 'yyyy-MM-dd')}`],
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
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                        <Skeleton className="h-7 w-28" />
                        <Skeleton className="h-3 w-44" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-9 w-[120px]" />
                        <Skeleton className="h-9 w-9" />
                    </div>
                </div>
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                </div>
                <div className="grid gap-4 md:grid-cols-7">
                    <Skeleton className="h-[300px] md:col-span-4" />
                    <Skeleton className="h-[280px] md:col-span-3" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <h1 className="text-xl font-bold mb-3">Analytics</h1>
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold">Analytics</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Business performance overview</p>
                </div>
                <Popover open={filterOpen} onOpenChange={handleFilterOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-1.5 relative">
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            <span>Filter</span>
                            {datePreset !== '30d' && (
                                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-52 p-4 space-y-4">
                        <div className="space-y-1.5">
                            <p className="text-xs font-semibold">Date Range</p>
                            <Select value={pendingPreset} onValueChange={setPendingPreset}>
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="7d">Last 7 days</SelectItem>
                                    <SelectItem value="30d">Last 30 days</SelectItem>
                                    <SelectItem value="90d">Last 90 days</SelectItem>
                                    <SelectItem value="month">This month</SelectItem>
                                    <SelectItem value="1y">This year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" className="flex-1 h-8" onClick={applyFilter}>
                                Apply
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 px-2" onClick={handleExport} title="Export CSV">
                                <Download className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Metric Cards — 2 cols on mobile, 4 on desktop */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    className="gap-0 py-3 lg:py-6"
                    title="Revenue"
                    value={formatCurrencyWithSettings(summary?.totalRevenue || 0, settings)}
                    icon={DollarSign}
                    description="Gross revenue"
                />
                <MetricCard
                    className="gap-0 py-3 lg:py-6"
                    title="Profit"
                    value={formatCurrencyWithSettings(summary?.totalProfit || 0, settings)}
                    icon={TrendingUp}
                    description={`Margin: ${summary?.margin.toFixed(1)}%`}
                />
                <MetricCard
                    className="gap-0 py-3 lg:py-6"
                    title="Orders"
                    value={summary?.totalOrders || 0}
                    icon={ShoppingCart}
                    description="Completed"
                />
                <MetricCard
                    className="gap-0 py-3 lg:py-6"
                    title="Avg Order"
                    value={formatCurrencyWithSettings(summary?.averageOrderValue || 0, settings)}
                    icon={CreditCard}
                    description="Per order"
                />
            </div>

            {/* Charts — stacked on mobile, side-by-side on md+ */}
            <div className="grid gap-4 md:grid-cols-7">
                <div className="md:col-span-4">
                    {salesTrends && (
                        <SalesChart data={salesTrends.data} title="Revenue Trend (Last 7 Days)" />
                    )}
                </div>
                <div className="md:col-span-3">
                    <CategoryPieChart data={categories} />
                </div>
            </div>

            {/* Bottom tables */}
            <div className="grid gap-4 md:grid-cols-2">
                <TopProductsTable data={topProducts} />
                {lowStock && (
                    <div className="h-full">
                        <LowStockTable items={lowStock.items} threshold={lowStock.threshold} />
                    </div>
                )}
            </div>
        </div>
    );
}
