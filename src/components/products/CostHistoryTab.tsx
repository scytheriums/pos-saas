"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";

interface CostPeriod {
    cost: number;
    firstSeenDate: string;
    lastSeenDate: string;
    orderCount: number;
    totalQuantity: number;
    averagePrice: number;
    margin: number;
    variantsCount: number;
}

interface CostHistoryData {
    productId: string;
    productName: string;
    currentCost: number;
    currentPrice: number;
    currentMargin: number;
    variantsCount: number;
    history: CostPeriod[];
}

export default function CostHistoryTab({ productId }: { productId: string }) {
    const [data, setData] = useState<CostHistoryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCostHistory();
    }, [productId]);

    const fetchCostHistory = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/products/${productId}/cost-history`);
            if (!response.ok) {
                throw new Error("Failed to fetch cost history");
            }
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const getCostTrend = (currentCost: number, previousCost: number) => {
        if (currentCost > previousCost) {
            return { icon: TrendingUp, color: "text-red-500", label: "Increased" };
        } else if (currentCost < previousCost) {
            return { icon: TrendingDown, color: "text-green-500", label: "Decreased" };
        }
        return { icon: Minus, color: "text-gray-500", label: "No Change" };
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Cost History</CardTitle>
                    <CardDescription>Loading cost history...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Cost History</CardTitle>
                    <CardDescription className="text-destructive">{error}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!data || data.history.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Cost History</CardTitle>
                    <CardDescription>No sales history available yet. Cost history will appear after products are sold.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Current Cost Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Current Cost</CardDescription>
                        <CardTitle className="text-2xl">Rp {data.currentCost.toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Current Price</CardDescription>
                        <CardTitle className="text-2xl">Rp {data.currentPrice.toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Current Margin</CardDescription>
                        <CardTitle className="text-2xl">{data.currentMargin.toFixed(1)}%</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Cost History Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Cost History</CardTitle>
                    <CardDescription>
                        Historical cost data from completed sales ({data.history.length} cost period{data.history.length !== 1 ? 's' : ''})
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cost</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Orders</TableHead>
                                <TableHead>Quantity Sold</TableHead>
                                <TableHead>Avg Price</TableHead>
                                <TableHead>Margin</TableHead>
                                <TableHead>Trend</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.history.map((period, index) => {
                                const previousPeriod = data.history[index + 1];
                                const trend = previousPeriod
                                    ? getCostTrend(period.cost, previousPeriod.cost)
                                    : { icon: Minus, color: "text-gray-500", label: "Initial" };
                                const TrendIcon = trend.icon;

                                return (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">
                                            Rp {period.cost.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div>{format(new Date(period.firstSeenDate), "MMM d, yyyy")}</div>
                                                {period.firstSeenDate !== period.lastSeenDate && (
                                                    <div className="text-muted-foreground">
                                                        to {format(new Date(period.lastSeenDate), "MMM d, yyyy")}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{period.orderCount}</TableCell>
                                        <TableCell>{period.totalQuantity}</TableCell>
                                        <TableCell>Rp {period.averagePrice.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge variant={period.margin > 30 ? "default" : period.margin > 15 ? "secondary" : "destructive"}>
                                                {period.margin.toFixed(1)}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className={`flex items-center gap-1 ${trend.color}`}>
                                                <TrendIcon className="h-4 w-4" />
                                                <span className="text-xs">{trend.label}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
