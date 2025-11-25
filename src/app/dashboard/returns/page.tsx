"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

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
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchReturns();
    }, [page, statusFilter]);

    const fetchReturns = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20"
            });

            if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

            const response = await fetch(`/api/returns?${params}`);
            if (!response.ok) throw new Error("Failed to fetch returns");

            const data = await response.json();
            setReturns(data.returns);
            setTotalPages(data.pagination.totalPages);
            setTotal(data.pagination.total);
        } catch (error) {
            console.error("Error fetching returns:", error);
        } finally {
            setLoading(false);
        }
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

            alert("Return approved successfully!");
            fetchReturns();
        } catch (error) {
            console.error("Error approving return:", error);
            alert("Failed to approve return");
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
                alert(error.error || "Failed to reject return");
                return;
            }

            alert("Return rejected successfully!");
            fetchReturns();
        } catch (error) {
            console.error("Error rejecting return:", error);
            alert("Failed to reject return");
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Returns & Refunds</h1>
                    <p className="text-muted-foreground">Manage customer returns and process refunds</p>
                </div>
                <Link href="/dashboard/returns/new">
                    <Button>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Create Return
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Filter returns by status or search</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Status</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
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

                        <div>
                            <label className="text-sm font-medium mb-2 block">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by order ID or customer..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Returns Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Returns ({total} total)</CardTitle>
                    <CardDescription>Showing {filteredReturns.length} of {returns.length} returns on this page</CardDescription>
                </CardHeader>
                <CardContent>
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
                                    Page {page} of {totalPages}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
