'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface LowStockItem {
    id: string;
    productName: string;
    sku: string;
    currentStock: number;
    minStock: number;
    urgency: string;
}

interface LowStockTableProps {
    items: LowStockItem[];
    threshold: number;
}

export function LowStockTable({ items, threshold }: LowStockTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Low Stock Alerts ({items.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No low stock items. All products are well stocked! 🎉
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="hidden sm:table-cell">SKU</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.productName}</TableCell>
                                        <TableCell className="font-mono text-sm hidden sm:table-cell">{item.sku}</TableCell>
                                        <TableCell className="text-right">
                                            <span className={item.currentStock === 0 ? 'text-red-600 font-bold' : ''}>
                                                {item.currentStock}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={item.urgency === 'critical' ? 'destructive' : 'secondary'}>
                                                {item.urgency === 'critical' ? 'Critical' : item.urgency === 'high' ? 'High' : 'Low'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
