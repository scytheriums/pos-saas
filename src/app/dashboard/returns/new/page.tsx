"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function CreateReturnPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [orderId, setOrderId] = useState("");
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Return details
    const [selectedItems, setSelectedItems] = useState<Record<string, { quantity: number; refundAmount: number }>>({});
    const [reason, setReason] = useState("");
    const [reasonNote, setReasonNote] = useState("");
    const [refundMethod, setRefundMethod] = useState("");

    const searchOrder = async () => {
        if (!orderId.trim()) {
            setError("Please enter an order ID");
            return;
        }

        try {
            setLoading(true);
            setError("");
            const response = await fetch(`/api/orders/${orderId}`);

            if (!response.ok) {
                setError("Order not found");
                return;
            }

            const data = await response.json();
            setOrder(data);
            setStep(2);
        } catch (err) {
            setError("Failed to fetch order");
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = (itemId: string, item: any) => {
        if (selectedItems[itemId]) {
            const { [itemId]: removed, ...rest } = selectedItems;
            setSelectedItems(rest);
        } else {
            setSelectedItems({
                ...selectedItems,
                [itemId]: {
                    quantity: item.quantity,
                    refundAmount: Number(item.price) * item.quantity
                }
            });
        }
    };

    const updateItemQuantity = (itemId: string, quantity: number, maxQuantity: number) => {
        if (quantity < 1 || quantity > maxQuantity) return;

        const item = order.items.find((i: any) => i.id === itemId);
        setSelectedItems({
            ...selectedItems,
            [itemId]: {
                quantity,
                refundAmount: Number(item.price) * quantity
            }
        });
    };

    const updateRefundAmount = (itemId: string, amount: number) => {
        setSelectedItems({
            ...selectedItems,
            [itemId]: {
                ...selectedItems[itemId],
                refundAmount: amount
            }
        });
    };

    const calculateTotalRefund = () => {
        return Object.values(selectedItems).reduce((sum, item) => sum + item.refundAmount, 0);
    };

    const handleSubmit = async () => {
        if (Object.keys(selectedItems).length === 0) {
            setError("Please select at least one item to return");
            return;
        }

        if (!reason) {
            setError("Please select a return reason");
            return;
        }

        if (!refundMethod) {
            setError("Please select a refund method");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const items = Object.entries(selectedItems).map(([itemId, data]) => {
                const orderItem = order.items.find((i: any) => i.id === itemId);
                return {
                    orderItemId: itemId,
                    variantId: orderItem.variantId,
                    quantity: data.quantity,
                    price: Number(orderItem.price),
                    refundAmount: data.refundAmount
                };
            });

            const response = await fetch("/api/returns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderId: order.id,
                    items,
                    reason,
                    reasonNote,
                    refundMethod
                })
            });

            if (!response.ok) {
                const error = await response.json();
                setError(error.error || "Failed to create return");
                return;
            }

            const returnData = await response.json();
            toast.success("Return created successfully!");
            router.push(`/dashboard/returns/${returnData.id}`);
        } catch (err) {
            setError("Failed to create return");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Create Return</h1>
                    <p className="text-muted-foreground">Process a customer return and refund</p>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            )}

            {/* Step 1: Search Order */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Step 1: Find Order</CardTitle>
                        <CardDescription>Enter the order ID to process a return</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Order ID</Label>
                            <div className="flex gap-2 mt-2">
                                <Input
                                    placeholder="Enter order ID..."
                                    value={orderId}
                                    onChange={(e) => setOrderId(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && searchOrder()}
                                />
                                <Button onClick={searchOrder} disabled={loading}>
                                    <Search className="h-4 w-4 mr-2" />
                                    {loading ? "Searching..." : "Search"}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Select Items */}
            {step === 2 && order && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Information</CardTitle>
                            <CardDescription>Order ID: {order.id}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Customer</Label>
                                    <div className="font-medium">{order.customerName || "Guest"}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Total</Label>
                                    <div className="font-medium">Rp {Number(order.total).toLocaleString()}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Items</Label>
                                    <div className="font-medium">{order.items.length}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Payment</Label>
                                    <div className="font-medium">{order.paymentMethod || "N/A"}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Step 2: Select Items to Return</CardTitle>
                            <CardDescription>Choose which items the customer is returning</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Ordered Qty</TableHead>
                                        <TableHead>Return Qty</TableHead>
                                        <TableHead>Refund Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.items.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={!!selectedItems[item.id]}
                                                    onCheckedChange={() => toggleItem(item.id, item)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {item.variant?.product?.name || "Unknown Product"}
                                            </TableCell>
                                            <TableCell>Rp {Number(item.price).toLocaleString()}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>
                                                {selectedItems[item.id] ? (
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        max={item.quantity}
                                                        value={selectedItems[item.id].quantity}
                                                        onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value), item.quantity)}
                                                        className="w-20"
                                                    />
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {selectedItems[item.id] ? (
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={selectedItems[item.id].refundAmount}
                                                        onChange={(e) => updateRefundAmount(item.id, parseFloat(e.target.value))}
                                                        className="w-32"
                                                    />
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="mt-4 flex justify-between items-center">
                                <div className="text-sm text-muted-foreground">
                                    {Object.keys(selectedItems).length} item(s) selected
                                </div>
                                <div className="text-xl font-bold">
                                    Total Refund: Rp {calculateTotalRefund().toLocaleString()}
                                </div>
                            </div>

                            <div className="mt-6 flex gap-2">
                                <Button variant="outline" onClick={() => setStep(1)}>
                                    Back
                                </Button>
                                <Button onClick={() => setStep(3)} disabled={Object.keys(selectedItems).length === 0}>
                                    Continue
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Step 3: Return Details */}
            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Step 3: Return Details</CardTitle>
                        <CardDescription>Provide reason and refund method</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Return Reason *</Label>
                            <Select value={reason} onValueChange={setReason}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DEFECTIVE">Defective</SelectItem>
                                    <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                                    <SelectItem value="NOT_AS_DESCRIBED">Not as Described</SelectItem>
                                    <SelectItem value="CHANGED_MIND">Changed Mind</SelectItem>
                                    <SelectItem value="DUPLICATE_ORDER">Duplicate Order</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Additional Notes</Label>
                            <Textarea
                                placeholder="Add any additional details..."
                                value={reasonNote}
                                onChange={(e) => setReasonNote(e.target.value)}
                                className="mt-2"
                                rows={3}
                            />
                        </div>

                        <div>
                            <Label>Refund Method *</Label>
                            <Select value={refundMethod} onValueChange={setRefundMethod}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Select refund method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="STORE_CREDIT">Store Credit</SelectItem>
                                    <SelectItem value="ORIGINAL_PAYMENT">Original Payment Method</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="pt-4 border-t">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-medium">Total Refund Amount:</span>
                                <span className="text-2xl font-bold">Rp {calculateTotalRefund().toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep(2)}>
                                Back
                            </Button>
                            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                                {loading ? "Creating..." : "Create Return"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
