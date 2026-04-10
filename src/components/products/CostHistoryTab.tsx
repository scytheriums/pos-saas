"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Package } from "lucide-react";
import { format } from "date-fns";

interface VariantSummary {
    id: string;
    sku: string;
    cost: number;
    price: number;
    margin: number;
}

interface CostPeriod {
    cost: number;
    variantSku: string;
    firstSeenDate: string;
    lastSeenDate: string;
    orderCount: number;
    totalQuantity: number;
    averagePrice: number;
    margin: number;
}

interface POUpdate {
    date: string;
    poId: string;
    variantSku: string | null;
    unitCost: number;
    receivedQuantity: number;
}

interface CostHistoryData {
    productId: string;
    productName: string;
    variantsCount: number;
    variants: VariantSummary[];
    history: CostPeriod[];
    poUpdates: POUpdate[];
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

    if (!data || (data.history.length === 0 && data.poUpdates.length === 0)) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Cost History</CardTitle>
                    <CardDescription>No cost history available yet. History appears after products are sold or costs are updated via purchase orders.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const firstVariant = data.variants[0];

    return (
        <div className="space-y-4">
            {/* Current Cost Summary */}
            {data.variantsCount === 1 && firstVariant ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Current Cost</CardDescription>
                            <CardTitle className="text-base font-bold">Rp {firstVariant.cost.toLocaleString()}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Current Price</CardDescription>
                            <CardTitle className="text-base font-bold">Rp {firstVariant.price.toLocaleString()}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Current Margin</CardDescription>
                            <CardTitle className="text-base font-bold">{firstVariant.margin.toFixed(1)}%</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            ) : (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Current Costs by Variant</CardTitle>
                        <CardDescription>{data.variantsCount} variant{data.variantsCount !== 1 ? 's' : ''}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Cost</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Margin</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.variants.map(v => (
                                    <TableRow key={v.id}>
                                        <TableCell className="font-mono text-xs">{v.sku}</TableCell>
                                        <TableCell>Rp {v.cost.toLocaleString()}</TableCell>
                                        <TableCell>Rp {v.price.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge variant={v.margin > 30 ? "default" : v.margin > 15 ? "secondary" : "destructive"}>
                                                {v.margin.toFixed(1)}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Cost History Table */}
            {data.history.length > 0 && (
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
                                <TableHead>Variant</TableHead>
                                <TableHead>Cost</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Orders</TableHead>
                                <TableHead>Qty Sold</TableHead>
                                <TableHead>Avg Price</TableHead>
                                <TableHead>Margin</TableHead>
                                <TableHead>Trend</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.history.map((period, index) => {
                                const previousPeriodForVariant = data.history
                                    .slice(index + 1)
                                    .find(p => p.variantSku === period.variantSku);
                                const trend = previousPeriodForVariant
                                    ? getCostTrend(period.cost, previousPeriodForVariant.cost)
                                    : { icon: Minus, color: "text-gray-500", label: "Initial" };
                                const TrendIcon = trend.icon;

                                return (
                                    <TableRow key={index}>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{period.variantSku}</TableCell>
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
            )}

            {/* PO Cost Update Events */}
            {data.poUpdates.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Cost Updates from Purchase Orders
                    </CardTitle>
                    <CardDescription>
                        Cost changes applied when purchase orders were received ({data.poUpdates.length} update{data.poUpdates.length !== 1 ? 's' : ''})
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Unit Cost</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Variant SKU</TableHead>
                                <TableHead>Qty Received</TableHead>
                                <TableHead>PO Reference</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.poUpdates.map((update, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">
                                        Rp {update.unitCost.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(update.date), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {update.variantSku ?? '—'}
                                    </TableCell>
                                    <TableCell>{update.receivedQuantity}</TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        #{update.poId.slice(-8).toUpperCase()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            )}
        </div>
    );
}
