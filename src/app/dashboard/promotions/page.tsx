"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, ChevronLeft, ChevronRight, Plus, Edit, Trash2 } from "lucide-react";
import { DiscountDialog } from "@/components/promotions/DiscountDialog";
import { formatCurrency } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PromotionsPage() {
    const [discounts, setDiscounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchDiscounts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/discounts?page=${page}&limit=20`);
            if (res.ok) {
                const data = await res.json();
                setDiscounts(data.discounts);
                setTotalPages(data.pagination.pages);
            }
        } catch (error) {
            console.error("Failed to fetch discounts", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/discounts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !currentStatus }),
            });

            if (res.ok) {
                fetchDiscounts();
            }
        } catch (error) {
            console.error("Failed to toggle discount", error);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const res = await fetch(`/api/discounts/${deleteId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                fetchDiscounts();
            } else {
                alert('Failed to delete discount');
            }
        } catch (error) {
            console.error("Failed to delete discount", error);
            alert('Failed to delete discount');
        } finally {
            setDeleteId(null);
        }
    };

    const handleEdit = (discount: any) => {
        setEditingDiscount(discount);
        setDialogOpen(true);
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setEditingDiscount(null);
    };

    useEffect(() => {
        fetchDiscounts();
    }, [page]);

    const getDiscountValue = (discount: any) => {
        if (discount.type === 'PERCENTAGE') {
            return `${discount.value}%`;
        }
        return formatCurrency(discount.value);
    };

    const isExpired = (discount: any) => {
        if (!discount.endDate) return false;
        return new Date(discount.endDate) < new Date();
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Promotions & Discounts</h1>
                    <p className="text-muted-foreground">Manage your store's promotions and discount codes.</p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Discount
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Discounts</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : discounts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No discounts found. Create one to get started!
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Used</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Active</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {discounts.map((discount) => (
                                        <TableRow key={discount.id}>
                                            <TableCell className="font-medium">{discount.name}</TableCell>
                                            <TableCell>
                                                {discount.code ? (
                                                    <code className="px-2 py-1 bg-gray-100 rounded text-sm">{discount.code}</code>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{discount.type}</Badge>
                                            </TableCell>
                                            <TableCell>{getDiscountValue(discount)}</TableCell>
                                            <TableCell>{discount._count.orders}</TableCell>
                                            <TableCell>
                                                {isExpired(discount) ? (
                                                    <Badge variant="destructive">Expired</Badge>
                                                ) : discount.active ? (
                                                    <Badge>Active</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Inactive</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={discount.active}
                                                    onCheckedChange={() => toggleActive(discount.id, discount.active)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(discount)}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(discount.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
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

            <DiscountDialog
                open={dialogOpen}
                onClose={handleDialogClose}
                onSuccess={fetchDiscounts}
                discount={editingDiscount}
            />

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the discount.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
