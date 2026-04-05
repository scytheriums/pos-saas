"use client";

import { useState, useEffect } from "react";
import { AdjustmentDialog } from "@/components/inventory/AdjustmentDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { formatDateTimeWithSettings } from "@/lib/format";
import { useTenantSettings } from "@/contexts/SettingsContext";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export default function StockAdjustmentsPage() {
    const settings = useTenantSettings();
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
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold">Stock Adjustments</h1>
                    <p className="text-xs text-muted-foreground">Manage and track inventory corrections</p>
                </div>
                <AdjustmentDialog onAdjustmentCreated={fetchAdjustments} />
            </div>

            <Card>
                <CardContent className="p-0">
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : adjustments.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">No adjustments found.</div>
                        ) : adjustments.map((adj) => (
                            <div key={adj.id} className="p-4 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm">{adj.variant.product.name}</span>
                                    <span className={`font-bold text-sm ${adj.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                                        {adj.quantity > 0 ? "+" : ""}{adj.quantity}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={getReasonColor(adj.reason) as any}>{adj.reason.replace("_", " ")}</Badge>
                                    <span className="text-xs text-muted-foreground">{adj.variant.sku}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {formatDateTimeWithSettings(adj.createdAt, settings)}
                                </div>
                                {adj.notes && (
                                    <div className="text-xs text-muted-foreground truncate">{adj.notes}</div>
                                )}
                            </div>
                        ))}
                        {/* Mobile pagination */}
                        {!loading && adjustments.length > 0 && (
                            <div className="flex items-center justify-between p-4">
                                <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
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
                                            <TableCell>{formatDateTimeWithSettings(adj.createdAt, settings)}</TableCell>
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
                    </div>{/* end desktop */}

                    {/* Desktop pagination */}
                    <div className="hidden md:flex items-center justify-end space-x-2 py-4 px-4">
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
