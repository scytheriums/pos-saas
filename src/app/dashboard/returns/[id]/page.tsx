"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CheckCircle, XCircle, Package } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";

export default function ReturnDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const returnId = params.id as string;

    const [returnData, setReturnData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReturnDetails();
    }, [returnId]);

    const fetchReturnDetails = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/returns/${returnId}`);
            if (!response.ok) throw new Error("Failed to fetch return");

            const data = await response.json();
            setReturnData(data);
        } catch (error) {
            toast.error("Failed to fetch return");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
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
            fetchReturnDetails();
        } catch (error) {
            toast.error("Failed to approve return");
        }
    };

    const handleReject = async () => {
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

            toast.success("Return rejected successfully!");
            fetchReturnDetails();
        } catch (error) {
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

    if (loading) {
        return <div className="text-center py-8">Loading...</div>;
    }

    if (!returnData) {
        return <div className="text-center py-8">Return not found</div>;
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                    <Button variant="outline" size="icon" className="shrink-0" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold">Return Details</h1>
                        <p className="text-xs text-muted-foreground">Return ID: {returnId.substring(0, 12)}...</p>
                    </div>
                </div>
                <div className="flex gap-2 shrink-0">
                    {returnData.status === "PENDING" && (
                        <>
                            <Button size="sm" onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="h-4 w-4" />
                                <span className="hidden sm:inline ml-1.5">Approve</span>
                            </Button>
                            <Button size="sm" onClick={handleReject} variant="destructive">
                                <XCircle className="h-4 w-4" />
                                <span className="hidden sm:inline ml-1.5">Reject</span>
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Return Information */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Return Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <div className="mt-1">{getStatusBadge(returnData.status)}</div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                                <div className="mt-1">{format(new Date(returnData.createdAt), "MMM d, yyyy h:mm a")}</div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Reason</label>
                                <div className="mt-1 font-medium">{getReasonLabel(returnData.reason)}</div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Refund Method</label>
                                <div className="mt-1">{returnData.refundMethod.replace("_", " ")}</div>
                            </div>
                            <div className="col-span-2">
                                <label className="text-sm font-medium text-muted-foreground">Additional Notes</label>
                                <div className="mt-1">{returnData.reasonNote || "None"}</div>
                            </div>
                            {returnData.processedAt && (
                                <>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Processed Date</label>
                                        <div className="mt-1">{format(new Date(returnData.processedAt), "MMM d, yyyy h:mm a")}</div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Processed By</label>
                                        <div className="mt-1">{returnData.processedByName}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Refund Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle>Refund Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Total Refund</label>
                                <div className="text-base font-bold mt-1">
                                    Rp {Number(returnData.refundAmount).toLocaleString()}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Items Returned</label>
                                <div className="text-sm font-semibold mt-1">{returnData.items.length}</div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Refund Method</label>
                                <div className="mt-1">{returnData.refundMethod.replace("_", " ")}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Original Order */}
            <Card>
                <CardHeader>
                    <CardTitle>Original Order</CardTitle>
                    <CardDescription>Order placed on {format(new Date(returnData.order.createdAt), "MMM d, yyyy")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Order ID</label>
                            <div className="mt-1">
                                <Link
                                    href={`/dashboard/orders/${returnData.orderId}`}
                                    className="text-blue-600 hover:underline font-mono"
                                >
                                    {returnData.orderId.substring(0, 12)}...
                                </Link>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Customer</label>
                            <div className="mt-1 font-medium">
                                {returnData.customer?.name || returnData.order.customerName || "Guest"}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Original Total</label>
                            <div className="mt-1 font-medium">
                                Rp {Number(returnData.order.total).toLocaleString()}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Items in Order</label>
                            <div className="mt-1">{returnData.order.items.length}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Return Items */}
            <Card>
                <CardHeader>
                    <CardTitle>Returned Items</CardTitle>
                    <CardDescription>{returnData.items.length} items being returned</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Variant</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Original Price</TableHead>
                                <TableHead>Refund Amount</TableHead>
                                <TableHead>Restocked</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {returnData.items.map((item: any) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                        {item.variant.product.name}
                                    </TableCell>
                                    <TableCell>
                                        {item.variant.optionValues.length > 0 ? (
                                            <div className="text-sm">
                                                {item.variant.optionValues.map((ov: any) => ov.value).join(", ")}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">Standard</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>Rp {Number(item.price).toLocaleString()}</TableCell>
                                    <TableCell className="font-medium">
                                        Rp {Number(item.refundAmount).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        {item.restocked ? (
                                            <Badge variant="default">
                                                <Package className="h-3 w-3 mr-1" />
                                                Yes
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">No</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
