"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, ChevronLeft, ChevronRight, UserPlus, Eye, SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

    // Filter popup state
    const [filterOpen, setFilterOpen] = useState(false);
    const [pendingSearch, setPendingSearch] = useState('');
    const activeFilterCount = [search !== ''].filter(Boolean).length;

    const handleFilterOpen = (open: boolean) => {
        if (open) setPendingSearch(search);
        setFilterOpen(open);
    };

    const applyFilters = () => {
        setSearch(pendingSearch);
        setCursor(null);
        setCursorHistory([]);
        setFilterOpen(false);
    };

    const resetFilters = () => {
        setPendingSearch('');
    };

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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold">Customers</h1>
                    <p className="text-xs text-muted-foreground">Manage your customer database</p>
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
                        <PopoverContent align="end" className="w-60 p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold">Filters</p>
                                <button onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground">Reset</button>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">Search</p>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Name, phone, email..."
                                        value={pendingSearch}
                                        onChange={(e) => setPendingSearch(e.target.value)}
                                        className="pl-7 h-8 text-sm"
                                    />
                                </div>
                            </div>
                            <Button size="sm" className="w-full h-8" onClick={applyFilters}>Apply</Button>
                        </PopoverContent>
                    </Popover>
                    <Button size="sm" className="h-9 gap-1.5" onClick={() => setDialogOpen(true)}>
                        <UserPlus className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            ) : customers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No customers found.</div>
            ) : (
                <>
                    {/* ── Mobile card list ── */}
                    <div className="md:hidden space-y-2">
                        {customers.map((customer) => (
                            <div key={customer.id} className="bg-card border rounded-lg p-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{customer.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{customer.phone || customer.email || '—'}</p>
                                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                        <span>{customer._count.orders} orders</span>
                                        {customer.points > 0 && <span>⭐ {customer.points} pts</span>}
                                    </div>
                                </div>
                                <Link href={`/dashboard/customers/${customer.id}`} className="shrink-0">
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                </Link>
                            </div>
                        ))}
                    </div>

                    {/* ── Desktop table ── */}
                    <Card className="hidden md:block">
                        <CardHeader>
                            <CardTitle>All Customers</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                        </CardContent>
                    </Card>

                    {/* Pagination */}
                    <div className="flex items-center justify-end space-x-2 py-2">
                        <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={cursorHistory.length === 0 || loading}>
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <div className="text-sm text-muted-foreground">Page {page}</div>
                        <Button variant="outline" size="sm" onClick={goToNextPage} disabled={!hasMore || loading}>
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </>
            )}

            <CustomerDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSuccess={fetchCustomers}
            />
        </div>
    );
}
