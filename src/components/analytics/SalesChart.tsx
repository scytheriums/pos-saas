'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
    // Format currency for tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <p className="text-sm font-medium mb-1">{payload[0].payload.date}</p>
                    <p className="text-sm text-purple-600">
                        Revenue: {formatCurrencyWithSettings(payload[0].value, settings)}
                    </p>
                    <p className="text-sm text-blue-600">
                        Orders: {payload[1].value}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="date"
                            className="text-xs"
                            tickFormatter={(value) => {
                                return formatDateWithSettings(value, settings);
                            }}
                        />
                        <YAxis yAxisId="left" className="text-xs" />
                        <YAxis yAxisId="right" orientation="right" className="text-xs" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="revenue"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            name="Revenue"
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="orders"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            name="Orders"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
