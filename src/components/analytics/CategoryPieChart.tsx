"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyWithSettings } from "@/lib/format";
import { useTenantSettings } from "@/contexts/SettingsContext";

interface CategoryStat {
    name: string;
    value: number;
    [key: string]: any;
}

interface CategoryPieChartProps {
    data: CategoryStat[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
    const settings = useTenantSettings();
    const total = data.reduce((sum, d) => sum + d.value, 0);

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">Sales by Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {data.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No category data available</p>
                ) : (
                    data.map((item, i) => {
                        const pct = total > 0 ? (item.value / total) * 100 : 0;
                        const color = COLORS[i % COLORS.length];
                        return (
                            <div key={item.name} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                                        <span className="truncate text-foreground">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 ml-2">
                                        <span className="text-muted-foreground">{formatCurrencyWithSettings(item.value, settings)}</span>
                                        <span className="font-semibold w-10 text-right">{pct.toFixed(1)}%</span>
                                    </div>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${pct}%`, background: color }}
                                    />
                                </div>
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
