"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";

interface Return {
    id: string;
    orderId: string;
    reason: string;
    reasonNote: string | null;
    refundMethod: string;
    refundAmount: number;
    status: string;
    createdAt: string;
    processedAt: string | null;
    processedByName: string;
    order: {
        id: string;
        total: number;
        customerName: string | null;
        createdAt: string;
    };
    customer: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
    } | null;
    items: any[];
}

export default function ReturnsPage() {
    const [returns, setReturns] = useState<Return[]>([]);
    const [loading, setLoading] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);
    const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const page = cursorHistory.length + 1;

    // Filters
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Filter popup state
    const [filterOpen, setFilterOpen] = useState(false);
    const [pendingStatus, setPendingStatus] = useState("all");
    const [pendingSearch, setPendingSearch] = useState("");
    const activeFilterCount = [statusFilter !== 'all', searchQuery !== ''].filter(Boolean).length;

    const handleFilterOpen = (open: boolean) => {
        if (open) {
            setPendingStatus(statusFilter);
            setPendingSearch(searchQuery);
        }
        setFilterOpen(open);
    };

    const applyFilters = () => {
        setStatusFilter(pendingStatus);
        setSearchQuery(pendingSearch);
        setCursor(null);
        setCursorHistory([]);
        setFilterOpen(false);
    };

    const resetFilters = () => {
        setPendingStatus("all");
        setPendingSearch("");
    };

    useEffect(() => {
        // Reset cursor when filter changes
        setCursor(null);
        setCursorHistory([]);
    }, [statusFilter]);

    useEffect(() => {
        fetchReturns();
    }, [cursor, statusFilter]);

    const fetchReturns = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ limit: "20" });
            if (cursor) params.append("cursor", cursor);
            if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

            const response = await fetch(`/api/returns?${params}`);
            if (!response.ok) throw new Error("Failed to fetch returns");

            const data = await response.json();
            setReturns(data.returns);
            setHasMore(data.hasMore);
        } catch (error) {
            console.error("Error fetching returns:", error);
        } finally {
            setLoading(false);
        }
    };

    const goToNextPage = () => {
        const lastId = returns[returns.length - 1]?.id;
        if (lastId && hasMore) {
            setCursorHistory(h => [...h, cursor]);
            setCursor(lastId);
        }
    };

    const goToPrevPage = () => {
        if (cursorHistory.length === 0) return;
        const prev = cursorHistory[cursorHistory.length - 1];
        setCursorHistory(h => h.slice(0, -1));
        setCursor(prev);
    };

    const handleApprove = async (returnId: string) => {
        if (!confirm("Are you sure you want to approve this return? Stock will be restocked automatically.")) {
            return;
        }

        try {
            const response = await fetch(`/api/returns/${returnId}/approve`, {
                method: "PATCH"
            });

            if (!response.ok) {
                const error = await response.json();
                alert(error.error || "Failed to approve return");
                return;
            }

            toast.success("Return approved successfully!");
            fetchReturns();
        } catch (error) {
            console.error("Error approving return:", error);
            toast.error("Failed to approve return");
        }
    };

    const handleReject = async (returnId: string) => {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;

        try {
            const response = await fetch(`/api/returns/${returnId}/reject`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rejectionReason: reason })
            });

            if (!response.ok) {
                const error = await response.json();
                toast.error(error.error || "Failed to reject return");
                return;
            }

            toast.success("Return rejected successfully!");
            fetchReturns();
        } catch (error) {
            console.error("Error rejecting return:", error);
            toast.error("Failed to reject return");
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            PENDING: "outline",
            APPROVED: "secondary",
            COMPLETED: "default",
            REJECTED: "destructive"
        };
        return <Badge variant={variants[status] || "default"}>{status}</Badge>;
    };

    const getReasonLabel = (reason: string) => {
        const labels: Record<string, string> = {
            DEFECTIVE: "Defective",
            WRONG_ITEM: "Wrong Item",
            NOT_AS_DESCRIBED: "Not as Described",
            CHANGED_MIND: "Changed Mind",
            DUPLICATE_ORDER: "Duplicate Order",
            OTHER: "Other"
        };
        return labels[reason] || reason;
    };

    const filteredReturns = returns.filter(ret => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            ret.orderId.toLowerCase().includes(query) ||
            ret.order.customerName?.toLowerCase().includes(query) ||
            ret.customer?.name.toLowerCase().includes(query)
        );
    });

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold">Returns & Refunds</h1>
                    <p className="text-xs text-muted-foreground">Manage customer returns and process refunds</p>
                </div>
                <div className="flex items-center gap-2">
                    <Popover open={filterOpen} onOpenChange={handleFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1.5 relative">
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold">Filters</p>
                                <button onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground">Reset</button>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">Status</p>
                                <Select value={pendingStatus} onValueChange={setPendingStatus}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="APPROVED">Approved</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                        <SelectItem value="REJECTED">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">Search</p>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Order ID or customer..."
                                        value={pendingSearch}
                                        onChange={(e) => setPendingSearch(e.target.value)}
                                        className="pl-7 h-8 text-sm"
                                    />
                                </div>
                            </div>
                            <Button size="sm" className="w-full h-8" onClick={applyFilters}>Apply</Button>
                        </PopoverContent>
                    </Popover>
                    <Link href="/dashboard/returns/new">
                        <Button size="sm" className="h-9 gap-1.5">
                            <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Returns Table */}
            <Card>
                <CardContent className="p-0">
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y">
                        {loading ? (
                            <div className="text-center py-10 text-muted-foreground">Loading...</div>
                        ) : filteredReturns.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">No returns found</div>
                        ) : filteredReturns.map((ret) => (
                            <div key={ret.id} className="p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm">
                                        {ret.customer?.name || ret.order.customerName || "Guest"}
                                    </span>
                                    {getStatusBadge(ret.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {format(new Date(ret.createdAt), "MMM d, yyyy")}
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{getReasonLabel(ret.reason)}</span>
                                    <span className="font-semibold">Rp {Number(ret.refundAmount).toLocaleString()}</span>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <Link href={`/dashboard/returns/${ret.id}`}>
                                        <Button variant="outline" size="sm">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    {ret.status === "PENDING" && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleApprove(ret.id)}
                                                className="text-green-600"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleReject(ret.id)}
                                                className="text-red-600"
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : filteredReturns.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No returns found</div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Items</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Refund Amount</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredReturns.map((ret) => (
                                        <TableRow key={ret.id}>
                                            <TableCell className="text-sm">
                                                {format(new Date(ret.createdAt), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                <Link
                                                    href={`/dashboard/orders/${ret.orderId}`}
                                                    className="text-blue-600 hover:underline font-mono text-sm"
                                                >
                                                    {ret.orderId.substring(0, 8)}...
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">
                                                        {ret.customer?.name || ret.order.customerName || "Guest"}
                                                    </div>
                                                    {ret.customer?.phone && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {ret.customer.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{ret.items.length}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{getReasonLabel(ret.reason)}</div>
                                                    {ret.reasonNote && (
                                                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                            {ret.reasonNote}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                Rp {Number(ret.refundAmount).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {ret.refundMethod.replace("_", " ")}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(ret.status)}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Link href={`/dashboard/returns/${ret.id}`}>
                                                        <Button variant="outline" size="sm">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    {ret.status === "PENDING" && (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleApprove(ret.id)}
                                                                className="text-green-600"
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleReject(ret.id)}
                                                                className="text-red-600"
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-muted-foreground">
                                    Page {page}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={goToPrevPage}
                                        disabled={cursorHistory.length === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={goToNextPage}
                                        disabled={!hasMore}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                    </div>{/* end desktop */}
                </CardContent>
            </Card>
        </div>
    );
}
