import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: number;
        label?: string;
        positive?: boolean;
        isPositive?: boolean; // Support both for backward compatibility
    };
    className?: string;
}

export function MetricCard({ title, value, icon: Icon, description, trend, className }: MetricCardProps) {
    const isPositive = trend?.positive ?? trend?.isPositive;

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0 pb-3">
                <div className="text-lg md:text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
                {trend && (
                    <p className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'} mt-1`}>
                        {isPositive ? '+' : ''}{trend.value.toFixed(1)}% {trend.label || 'from last period'}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
