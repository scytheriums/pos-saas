'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTenantSettings } from '@/contexts/SettingsContext';
import { formatCurrencyWithSettings, formatDateWithSettings } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Receipt, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const EXPENSE_CATEGORIES = [
    { value: 'RENT', label: 'Rent' },
    { value: 'UTILITIES', label: 'Utilities' },
    { value: 'SALARIES', label: 'Salaries' },
    { value: 'SUPPLIES', label: 'Supplies' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'TRANSPORT', label: 'Transport' },
    { value: 'FOOD', label: 'Food & Beverage' },
    { value: 'TAX', label: 'Tax' },
    { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
    { value: 'PETTY_CASH', label: 'Petty Cash' },
    { value: 'OTHER', label: 'Other' },
];

const CATEGORY_COLORS: Record<string, string> = {
    RENT: 'bg-red-100 text-red-700',
    UTILITIES: 'bg-yellow-100 text-yellow-700',
    SALARIES: 'bg-blue-100 text-blue-700',
    SUPPLIES: 'bg-purple-100 text-purple-700',
    MARKETING: 'bg-pink-100 text-pink-700',
    MAINTENANCE: 'bg-orange-100 text-orange-700',
    TRANSPORT: 'bg-cyan-100 text-cyan-700',
    FOOD: 'bg-green-100 text-green-700',
    TAX: 'bg-gray-100 text-gray-700',
    PURCHASE_ORDER: 'bg-indigo-100 text-indigo-700',
    PETTY_CASH: 'bg-teal-100 text-teal-700',
    OTHER: 'bg-slate-100 text-slate-700',
};

interface Expense {
    id: string;
    amount: number;
    category: string;
    date: string;
    notes: string | null;
    referenceType: string | null;
    referenceId: string | null;
    user?: { id: string; name: string } | null;
    createdAt: string;
}

interface ExpenseFormData {
    amount: string;
    category: string;
    date: string;
    notes: string;
}

const emptyForm = (): ExpenseFormData => ({
    amount: '',
    category: 'OTHER',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
});

export default function ExpensesPage() {
    const settings = useTenantSettings();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalAmount, setTotalAmount] = useState(0);

    // Filters
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Filter popup state
    const [filterOpen, setFilterOpen] = useState(false);
    const [pendingCategory, setPendingCategory] = useState('ALL');
    const [pendingFrom, setPendingFrom] = useState('');
    const [pendingTo, setPendingTo] = useState('');
    const activeFilterCount = [categoryFilter !== 'ALL', !!dateFrom, !!dateTo].filter(Boolean).length;

    const handleFilterOpen = (open: boolean) => {
        if (open) {
            setPendingCategory(categoryFilter);
            setPendingFrom(dateFrom);
            setPendingTo(dateTo);
        }
        setFilterOpen(open);
    };

    const applyFilters = () => {
        setCategoryFilter(pendingCategory);
        setDateFrom(pendingFrom);
        setDateTo(pendingTo);
        setFilterOpen(false);
    };

    const resetFilters = () => {
        setPendingCategory('ALL');
        setPendingFrom('');
        setPendingTo('');
    };

    // Pagination
    const [cursor, setCursor] = useState<string | null>(null);
    const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const page = cursorHistory.length + 1;

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [form, setForm] = useState<ExpenseFormData>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
    const [deleting, setDeleting] = useState(false);

    const buildParams = useCallback((cur: string | null) => {
        const p = new URLSearchParams({ limit: '20' });
        if (cur) p.set('cursor', cur);
        if (categoryFilter !== 'ALL') p.set('category', categoryFilter);
        if (dateFrom) p.set('from', dateFrom);
        if (dateTo) p.set('to', dateTo);
        return p;
    }, [categoryFilter, dateFrom, dateTo]);

    const fetchExpenses = useCallback(async (cur: string | null) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/expenses?${buildParams(cur)}`);
            if (res.ok) {
                const data = await res.json();
                setExpenses(data.data ?? []);
                setHasMore(data.hasMore ?? false);
                setCursor(data.nextCursor ?? null);
                setTotalAmount(data.totalAmount ?? 0);
            }
        } catch (e) {
            console.error('Failed to fetch expenses', e);
        } finally {
            setLoading(false);
        }
    }, [buildParams]);

    useEffect(() => {
        setCursorHistory([]);
        fetchExpenses(null);
    }, [categoryFilter, dateFrom, dateTo, fetchExpenses]);

    const goNext = () => {
        if (!cursor) return;
        setCursorHistory(prev => [...prev, cursor]);
        fetchExpenses(cursor);
    };

    const goPrev = () => {
        const history = [...cursorHistory];
        history.pop();
        const prevCursor = history.length > 0 ? history[history.length - 1] : null;
        setCursorHistory(history);
        fetchExpenses(prevCursor);
    };

    const openAddModal = () => {
        setEditingExpense(null);
        setForm(emptyForm());
        setFormError('');
        setModalOpen(true);
    };

    const openEditModal = (expense: Expense) => {
        if (expense.referenceType) return; // auto-generated — read-only
        setEditingExpense(expense);
        setForm({
            amount: String(expense.amount),
            category: expense.category,
            date: expense.date.slice(0, 10),
            notes: expense.notes ?? '',
        });
        setFormError('');
        setModalOpen(true);
    };

    const handleSave = async () => {
        const amt = parseFloat(form.amount);
        if (isNaN(amt) || amt <= 0) {
            setFormError('Amount must be a positive number.');
            return;
        }
        setSaving(true);
        setFormError('');
        try {
            const payload = {
                amount: amt,
                category: form.category,
                date: form.date,
                notes: form.notes || null,
            };
            const res = editingExpense
                ? await fetch(`/api/expenses/${editingExpense.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
                : await fetch('/api/expenses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

            if (!res.ok) {
                const data = await res.json();
                setFormError(data.error || 'Failed to save expense.');
                return;
            }
            setModalOpen(false);
            setCursorHistory([]);
            fetchExpenses(null);
        } catch {
            setFormError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await fetch(`/api/expenses/${deleteTarget.id}`, { method: 'DELETE' });
            setDeleteTarget(null);
            setCursorHistory([]);
            fetchExpenses(null);
        } catch {
            // continue
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold">Expenses</h1>
                    <p className="text-xs text-muted-foreground">Track business costs and outgoings</p>
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
                                <p className="text-xs font-medium text-muted-foreground">Category</p>
                                <Select value={pendingCategory} onValueChange={setPendingCategory}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Categories</SelectItem>
                                        {EXPENSE_CATEGORIES.map(c => (
                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground">From</p>
                                    <Input type="date" className="h-8 text-sm" value={pendingFrom} onChange={e => setPendingFrom(e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground">To</p>
                                    <Input type="date" className="h-8 text-sm" value={pendingTo} onChange={e => setPendingTo(e.target.value)} />
                                </div>
                            </div>
                            <Button size="sm" className="w-full h-8" onClick={applyFilters}>Apply</Button>
                        </PopoverContent>
                    </Popover>
                    <Button size="sm" className="h-9 gap-1.5" onClick={openAddModal}>
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Total summary */}
            {!loading && (
                <div className="text-sm text-muted-foreground">
                    Total:{' '}
                    <span className="font-semibold text-foreground">
                        {formatCurrencyWithSettings(totalAmount, settings)}
                    </span>
                </div>
            )}

            <Card>
                <CardContent className="p-0">
                    {/* ── Mobile card list (hidden on md+) ── */}
                    <div className="md:hidden divide-y">
                        {loading ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
                        ) : expenses.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">No expenses found.</div>
                        ) : (
                            expenses.map((expense) => (
                                <div key={expense.id} className="p-4 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[expense.category] ?? 'bg-gray-100 text-gray-700'}`}>
                                                {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label ?? expense.category}
                                            </span>
                                            {expense.referenceType && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border">
                                                    Auto
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-semibold text-sm">{formatCurrencyWithSettings(Number(expense.amount), settings)}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatDateWithSettings(new Date(expense.date), settings)}
                                        {expense.user?.name && <span className="ml-2">· {expense.user.name}</span>}
                                    </div>
                                    {expense.notes && (
                                        <p className="text-xs text-muted-foreground truncate">{expense.notes}</p>
                                    )}
                                    <div className="flex justify-end gap-1 pt-1">
                                        {!expense.referenceType && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(expense)}>
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(expense)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* ── Desktop table (hidden on mobile) ── */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead>Recorded by</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="w-20" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                            No expenses found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    expenses.map((expense) => (
                                        <TableRow key={expense.id}>
                                            <TableCell className="text-sm whitespace-nowrap">
                                                {formatDateWithSettings(new Date(expense.date), settings)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[expense.category] ?? 'bg-gray-100 text-gray-700'}`}>
                                                        {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label ?? expense.category}
                                                    </span>
                                                    {expense.referenceType && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border">
                                                            Auto
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                                {expense.notes ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {expense.user?.name ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {formatCurrencyWithSettings(Number(expense.amount), settings)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    {!expense.referenceType && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(expense)}>
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(expense)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {/* end desktop table */}

                    {/* Pagination */}
                    {(page > 1 || hasMore) && (
                        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                            <span>Page {page}</span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={goPrev} disabled={page === 1}>
                                    <ChevronLeft className="w-4 h-4" /> Previous
                                </Button>
                                <Button variant="outline" size="sm" onClick={goNext} disabled={!hasMore}>
                                    Next <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add / Edit modal */}
            <Dialog open={modalOpen} onOpenChange={(v) => { if (!v && !saving) setModalOpen(false); }}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="exp-amount">Amount (Rp)</Label>
                            <Input
                                id="exp-amount"
                                type="number"
                                min="0"
                                placeholder="0"
                                value={form.amount}
                                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="exp-category">Category</Label>
                            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                                <SelectTrigger id="exp-category">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EXPENSE_CATEGORIES.map(c => (
                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="exp-date">Date</Label>
                            <Input
                                id="exp-date"
                                type="date"
                                value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="exp-notes">Notes (optional)</Label>
                            <Textarea
                                id="exp-notes"
                                placeholder="Description of this expense..."
                                rows={2}
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            />
                        </div>
                        {formError && <p className="text-sm text-destructive">{formError}</p>}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving || !form.amount}>
                            {saving ? 'Saving...' : editingExpense ? 'Save Changes' : 'Add Expense'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the expense of{' '}
                            <strong>{deleteTarget ? formatCurrencyWithSettings(Number(deleteTarget.amount), settings) : ''}</strong>.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                            {deleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
