'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyWithSettings, formatDateWithSettings } from '@/lib/format';
import { useTenantSettings } from '@/contexts/SettingsContext';

interface SalesData {
    date: string;
    revenue: number;
    orders: number;
}

interface SalesChartProps {
    data: SalesData[];
    title?: string;
}

export function SalesChart({ data, title = "Sales Trends" }: SalesChartProps) {
    const settings = useTenantSettings();

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background border border-border rounded-lg p-3 shadow-md text-xs space-y-1">
                    <p className="font-semibold text-foreground">{payload[0].payload.date}</p>
                    <p className="text-[#6366f1] font-medium">
                        Revenue: {formatCurrencyWithSettings(payload[0].payload.revenue, settings)}
                    </p>
                    <p className="text-muted-foreground">
                        Orders: {payload[0].payload.orders}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="pl-0">
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => formatDateWithSettings(value, settings)}
                        />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            width={52}
                            tickFormatter={(v) => formatCurrencyWithSettings(v, settings)}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeOpacity: 0.1 }} />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fill="url(#revenueGradient)"
                            name="Revenue"
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
