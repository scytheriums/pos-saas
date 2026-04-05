'use client';

import { useState, useEffect } from 'react';
import { useTenantSettings } from '@/contexts/SettingsContext';
import { formatCurrencyWithSettings, formatDateTimeWithSettings } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Timer, ChevronLeft, ChevronRight } from 'lucide-react';

interface ShiftRow {
    id: string;
    status: 'OPEN' | 'CLOSED';
    openedAt: string;
    closedAt: string | null;
    openingFloat: number;
    expectedCash: number | null;
    actualCash: number | null;
    difference: number | null;
    notes: string | null;
    cashSales?: number;
    totalRevenue?: number;
    totalPayouts?: number;
    orderCount?: number;
    user?: { name: string; email?: string } | null;
}

export default function ShiftsPage() {
    const settings = useTenantSettings();
    const [shifts, setShifts] = useState<ShiftRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);
    const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const page = cursorHistory.length + 1;

    const fetchShifts = async (cur: string | null) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '20' });
            if (cur) params.set('cursor', cur);
            const res = await fetch(`/api/shifts?${params}`);
            if (res.ok) {
                const data = await res.json();
                setShifts(data.data ?? []);
                setHasMore(data.hasMore ?? false);
                setCursor(data.nextCursor ?? null);
            }
        } catch (e) {
            console.error('Failed to fetch shifts', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShifts(null);
    }, []);

    const goNext = () => {
        if (!cursor) return;
        setCursorHistory(prev => [...prev, cursor]);
        fetchShifts(cursor);
    };

    const goPrev = () => {
        const history = [...cursorHistory];
        history.pop();
        const prevCursor = history.length > 0 ? history[history.length - 1] : null;
        setCursorHistory(history);
        fetchShifts(prevCursor);
    };

    const differenceColor = (diff: number | null) => {
        if (diff === null) return '';
        if (diff === 0) return 'text-green-600';
        if (diff > 0) return 'text-blue-600';
        return 'text-destructive';
    };

    return (
        <div className="p-4 md:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                        <Timer className="w-5 h-5" />
                        Shifts
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Cash drawer sessions and reconciliation
                    </p>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cashier</TableHead>
                                    <TableHead>Opened</TableHead>
                                    <TableHead>Closed</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Float</TableHead>
                                    <TableHead className="text-right">Cash Sales</TableHead>
                                    <TableHead className="text-right">Payouts</TableHead>
                                    <TableHead className="text-right">Expected</TableHead>
                                    <TableHead className="text-right">Actual</TableHead>
                                    <TableHead className="text-right">Difference</TableHead>
                                    <TableHead className="text-right">Orders</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="text-center py-10 text-muted-foreground">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : shifts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="text-center py-10 text-muted-foreground">
                                            No shifts found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    shifts.map((shift) => (
                                        <TableRow key={shift.id}>
                                            <TableCell className="font-medium">
                                                {shift.user?.name ?? 'Unknown'}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                {formatDateTimeWithSettings(new Date(shift.openedAt), settings)}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                {shift.closedAt
                                                    ? formatDateTimeWithSettings(new Date(shift.closedAt), settings)
                                                    : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={shift.status === 'OPEN' ? 'default' : 'secondary'}>
                                                    {shift.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrencyWithSettings(shift.openingFloat, settings)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {shift.cashSales != null
                                                    ? formatCurrencyWithSettings(shift.cashSales, settings)
                                                    : '—'}
                                            </TableCell>
                                            <TableCell className="text-right text-orange-600">
                                                {shift.totalPayouts != null && shift.totalPayouts > 0
                                                    ? `- ${formatCurrencyWithSettings(shift.totalPayouts, settings)}`
                                                    : '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {shift.expectedCash != null
                                                    ? formatCurrencyWithSettings(shift.expectedCash, settings)
                                                    : '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {shift.actualCash != null
                                                    ? formatCurrencyWithSettings(shift.actualCash, settings)
                                                    : '—'}
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${differenceColor(shift.difference)}`}>
                                                {shift.difference != null
                                                    ? `${shift.difference >= 0 ? '+' : ''}${formatCurrencyWithSettings(shift.difference, settings)}`
                                                    : '—'}
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {shift.orderCount ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {shift.totalRevenue != null
                                                    ? formatCurrencyWithSettings(shift.totalRevenue, settings)
                                                    : '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {(page > 1 || hasMore) && (
                        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                            <span>Page {page}</span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={goPrev} disabled={page === 1}>
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </Button>
                                <Button variant="outline" size="sm" onClick={goNext} disabled={!hasMore}>
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
