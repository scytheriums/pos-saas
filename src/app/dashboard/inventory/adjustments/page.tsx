"use client";

import { useState, useEffect } from "react";
import { AdjustmentDialog } from "@/components/inventory/AdjustmentDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export default function StockAdjustmentsPage() {
    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchAdjustments = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/inventory/adjustments?page=${page}&limit=20`);
            if (res.ok) {
                const data = await res.json();
                setAdjustments(data.adjustments);
                setTotalPages(data.pagination.pages);
            }
        } catch (error) {
            console.error("Failed to fetch adjustments", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdjustments();
    }, [page]);

    const getReasonColor = (reason: string) => {
        switch (reason) {
            case "DAMAGED": return "destructive";
            case "LOST": return "destructive";
            case "FOUND": return "default"; // or success color if available
            case "SUPPLIER_RETURN": return "secondary";
            case "MANUAL_COUNT": return "outline";
            default: return "secondary";
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Stock Adjustments</h1>
                    <p className="text-muted-foreground">Manage and track inventory corrections.</p>
                </div>
                <AdjustmentDialog onAdjustmentCreated={fetchAdjustments} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Adjustment History</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : adjustments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No adjustments found.
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {adjustments.map((adj) => (
                                        <TableRow key={adj.id}>
                                            <TableCell>{new Date(adj.createdAt).toLocaleString()}</TableCell>
                                            <TableCell className="font-medium">{adj.variant.product.name}</TableCell>
                                            <TableCell>{adj.variant.sku}</TableCell>
                                            <TableCell>
                                                <Badge variant={getReasonColor(adj.reason) as any}>
                                                    {adj.reason.replace("_", " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`text-right font-bold ${adj.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                                                {adj.quantity > 0 ? "+" : ""}{adj.quantity}
                                            </TableCell>
                                            <TableCell>{adj.userId}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={adj.notes || ""}>
                                                {adj.notes || "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="flex items-center justify-end space-x-2 py-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <div className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
