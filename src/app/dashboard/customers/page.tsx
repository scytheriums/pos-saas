"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, ChevronLeft, ChevronRight, UserPlus, Eye } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
import { formatCurrency } from "@/lib/utils";

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);
    const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const page = cursorHistory.length + 1;

    const debouncedSearch = useDebounce(search, 500);

    const fetchCustomers = async (overrideCursor?: string | null) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '20' });
            const activeCursor = overrideCursor !== undefined ? overrideCursor : cursor;
            if (activeCursor) params.append('cursor', activeCursor);
            if (debouncedSearch) params.append('search', debouncedSearch);

            const res = await fetch(`/api/customers?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.customers);
                setHasMore(data.hasMore);
            }
        } catch (error) {
            console.error("Failed to fetch customers", error);
        } finally {
            setLoading(false);
        }
    };

    // Reset to first page when search changes
    useEffect(() => {
        setCursor(null);
        setCursorHistory([]);
    }, [debouncedSearch]);

    useEffect(() => {
        fetchCustomers();
    }, [cursor, debouncedSearch]);

    const goToNextPage = () => {
        const lastId = customers[customers.length - 1]?.id;
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

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
                    <p className="text-muted-foreground">Manage your customer database.</p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Customer
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>All Customers</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                className="pl-9"
                                placeholder="Search by name, phone, email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No customers found.
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="text-right">Orders</TableHead>
                                        <TableHead className="text-right">Points</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customers.map((customer) => (
                                        <TableRow key={customer.id}>
                                            <TableCell className="font-medium">{customer.name}</TableCell>
                                            <TableCell>{customer.phone || "-"}</TableCell>
                                            <TableCell>{customer.email || "-"}</TableCell>
                                            <TableCell className="text-right">{customer._count.orders}</TableCell>
                                            <TableCell className="text-right">{customer.points}</TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/dashboard/customers/${customer.id}`}>
                                                    <Button variant="ghost" size="sm">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </Link>
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
                            onClick={goToPrevPage}
                            disabled={cursorHistory.length === 0 || loading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <div className="text-sm text-muted-foreground">
                            Page {page}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToNextPage}
                            disabled={!hasMore || loading}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <CustomerDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSuccess={fetchCustomers}
            />
        </div>
    );
}
