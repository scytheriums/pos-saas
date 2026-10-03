'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ImageUpload } from '@/components/ui/image-upload';
import { Plus, Trash2, AlertCircle, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { availableUnits, resolveFactors, splitStock, ladderDefinitions, BASE_REF } from '@/lib/stock-math';
import type { ProductFormVariant } from '@/components/products/ProductForm';

export interface UnitOption {
    id: string;
    name: string;
    abbreviation: string;
}

interface SellingUnitsEditorProps {
    units: UnitOption[];
    baseUnitId: string;
    sharedStock: number;
    poolCost: number;
    /** Ladder order: smallest first; each row contains N × the row above */
    rows: ProductFormVariant[];
    autoSku: boolean;
    skuPreview: string;
    isEdit: boolean;
    /** Rows whose ⋯ panel should be open (e.g. a SKU is missing) */
    expandIds?: string[];
    onBaseUnitChange: (id: string) => void;
    onSharedStockChange: (n: number) => void;
    onPoolCostChange: (n: number) => void;
    onRowsChange: (rows: ProductFormVariant[]) => void;
}

/** Stock-count key for loose base units when no selling unit is exactly 1 base unit */
const LOOSE = '__loose__';

// Desktop columns: unit | contains | price | stock | actions. Phones: unit + contains, then price + stock + actions.
const ROW_GRID = 'grid grid-cols-6 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1fr)_5rem_4.5rem] gap-x-2 gap-y-1.5 items-center';

/**
 * Pack sizes drawing on one stock count, as a ladder: Pcs → Pack (12 Pcs) → Box (12 Pack).
 * One line per unit; SKU and image fold away under ⋯.
 */
export function SellingUnitsEditor({
    units,
    baseUnitId,
    sharedStock,
    poolCost,
    rows,
    autoSku,
    skuPreview,
    isEdit,
    expandIds = [],
    onBaseUnitChange,
    onSharedStockChange,
    onPoolCostChange,
    onRowsChange,
}: SellingUnitsEditorProps) {
    const baseUnit = units.find(u => u.id === baseUnitId);
    const baseAbbr = baseUnit?.abbreviation ?? 'base';
    const unitName = (id?: string | null) => units.find(u => u.id === id)?.name;

    const [openPanels, setOpenPanels] = useState<Set<string>>(new Set());
    const [counts, setCounts] = useState<Record<string, number>>(() => splitStock(sharedStock, stockSlots(rows)));

    const definitions = ladderDefinitions(rows);
    const { error: ladderError } = resolveFactors(definitions);
    const slots = stockSlots(rows);
    const totalOf = (c: Record<string, number>, s: { id: string; factor: number }[]) =>
        s.reduce((sum, slot) => sum + (c[slot.id] ?? 0) * slot.factor, 0);

    /** Apply row edits: sizes from the ladder, auto prices from the unit below, stock total from the counts */
    const commit = (next: ProductFormVariant[], nextCounts: Record<string, number> = counts) => {
        const { factors, error } = resolveFactors(ladderDefinitions(next));
        if (error) {
            onRowsChange(next);
            return;
        }
        const resolved: ProductFormVariant[] = [];
        next.forEach((r, i) => {
            const factor = factors.get(r.id) ?? 1;
            let price = r.price;
            if (r.priceAuto && i > 0) {
                const below = resolved[i - 1];
                const belowFactor = below.conversionFactor ?? 1;
                if (below.price > 0) price = Math.round((below.price / belowFactor) * factor);
            }
            resolved.push({ ...r, conversionFactor: factor, price });
        });
        onRowsChange(resolved);
        onSharedStockChange(totalOf(nextCounts, stockSlots(resolved)));
    };

    const updateRow = (id: string, patch: Partial<ProductFormVariant>) =>
        commit(rows.map(r => (r.id === id ? { ...r, ...patch } : r)));

    const addRow = () => {
        const id = `temp-${Date.now()}`;
        commit([
            ...rows,
            {
                id,
                optionValueIds: [],
                sku: '',
                price: 0,
                cost: 0,
                stock: 0,
                imageUrl: null,
                unitId: rows.length === 0 ? baseUnitId || null : null,
                containsQty: 1,
                // New units are made of the unit above by default
                containsRef: rows.length > 0 ? rows[rows.length - 1].id : BASE_REF,
                priceAuto: true,
                conversionFactor: 1,
            },
        ]);
        // Put the cursor in the new unit's "contains" box once it has rendered
        requestAnimationFrame(() => document.getElementById(`contains-${id}`)?.focus());
    };

    /** Remove a unit without changing any other unit's size or the stock total */
    const removeRow = (id: string) => {
        const index = rows.findIndex(r => r.id === id);
        if (index < 0) return;
        // Units made of the removed one are re-pointed to what it was made of, keeping their size
        const defs = ladderDefinitions(rows);
        const removed = defs[index];
        const next = rows
            .map((r, i) => defs[i].containsRef === id
                ? { ...r, containsQty: defs[i].containsQty * removed.containsQty, containsRef: removed.containsRef }
                : { ...r, containsQty: defs[i].containsQty, containsRef: defs[i].containsRef })
            .filter(r => r.id !== id);
        const nextCounts = splitStock(sharedStock, stockSlots(next));
        setCounts(nextCounts);
        commit(next, nextCounts);
    };

    const updateCount = (slotId: string, value: number) => {
        const next = { ...counts, [slotId]: Math.max(0, value) };
        setCounts(next);
        onSharedStockChange(totalOf(next, slots));
    };

    const togglePanel = (id: string) =>
        setOpenPanels(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });

    const hasLoose = slots.some(s => s.id === LOOSE);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Shared Stock</CardTitle>
                <CardDescription>
                    Stock is counted once, in the base unit. Each unit below holds a number of the unit above it.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Base unit and cost */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="base-unit">Base unit *</Label>
                        <Select value={baseUnitId || undefined} onValueChange={onBaseUnitChange}>
                            <SelectTrigger id="base-unit" className="w-full">
                                <SelectValue placeholder="Choose unit" />
                            </SelectTrigger>
                            <SelectContent>
                                {units.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            The smallest amount you sell. <Link href="/dashboard/settings/units" className="underline">Manage units</Link>
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="pool-cost">Cost per {baseAbbr} (Rp)</Label>
                        <CurrencyInput id="pool-cost" value={poolCost} onValueChange={(v) => onPoolCostChange(v ?? 0)} />
                    </div>
                </div>

                {ladderError && (
                    <p className="text-xs text-destructive flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" /> {ladderError}.
                    </p>
                )}

                {/* The ladder */}
                <div className="rounded-lg border divide-y">
                    <div className={`${ROW_GRID} hidden sm:grid px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/40`}>
                        <span>Unit</span>
                        <span>Contains</span>
                        <span>Price (Rp)</span>
                        <span>{isEdit ? 'Stock' : 'Initial stock'}</span>
                        <span className="sr-only">Actions</span>
                    </div>

                    {rows.length === 0 && (
                        <p className="text-sm text-muted-foreground p-4 text-center">
                            Start with the smallest size you sell, e.g. 1 {baseAbbr}.
                        </p>
                    )}

                    {rows.map((row, i) => {
                        const factor = row.conversionFactor ?? 1;
                        const ref = definitions[i]?.containsRef ?? BASE_REF;
                        const earlier = rows.slice(0, i);
                        const refLabel = ref === BASE_REF ? baseAbbr : (unitName(rows.find(r => r.id === ref)?.unitId) ?? 'unit');
                        const panelOpen = openPanels.has(row.id) || expandIds.includes(row.id);
                        const name = unitName(row.unitId) ?? 'this unit';
                        return (
                            <div key={row.id} className="px-3 py-2.5 space-y-2">
                                <div className={ROW_GRID}>
                                    {/* Unit */}
                                    <div className="col-span-3 sm:col-span-1 min-w-0">
                                        <span className="sm:hidden text-[10px] text-muted-foreground">Unit</span>
                                        <Select value={row.unitId || undefined} onValueChange={(id) => updateRow(row.id, { unitId: id })}>
                                            <SelectTrigger className="h-8 text-sm w-full" aria-label={`Unit ${i + 1}`}>
                                                <SelectValue placeholder="Choose" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {units.map(u => (
                                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Contains: N × base units or a smaller unit (the unit above by default) */}
                                    <div className="col-span-3 sm:col-span-1 min-w-0">
                                        <span className="sm:hidden text-[10px] text-muted-foreground">Contains</span>
                                        <div className="flex items-center gap-1.5 text-sm">
                                            <Input
                                                id={`contains-${row.id}`}
                                                className="h-8 w-16 text-sm"
                                                type="number"
                                                min={1}
                                                step={1}
                                                value={row.containsQty ?? factor}
                                                onChange={(e) => updateRow(row.id, { containsQty: Math.max(1, parseInt(e.target.value) || 1) })}
                                                aria-label={`How many ${refLabel} in one ${name}`}
                                            />
                                            <span className="text-muted-foreground shrink-0">×</span>
                                            {i === 0 ? (
                                                <span className="truncate">{baseAbbr}</span>
                                            ) : (
                                                <Select
                                                    value={ref}
                                                    // Switching what it's made of keeps the size as close as possible
                                                    onValueChange={(newRef) => {
                                                        const refFactor = newRef === BASE_REF ? 1 : rows.find(r => r.id === newRef)?.conversionFactor ?? 1;
                                                        updateRow(row.id, { containsRef: newRef, containsQty: Math.max(1, Math.round(factor / refFactor)) });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 text-sm min-w-0 flex-1 px-2" aria-label={`What one ${name} is made of`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={BASE_REF}>{baseAbbr}</SelectItem>
                                                        {earlier.map(r => (
                                                            <SelectItem key={r.id} value={r.id}>{unitName(r.unitId) ?? 'Unnamed unit'}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                            {ref !== BASE_REF && !ladderError && (
                                                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">= {factor}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="col-span-3 sm:col-span-1 min-w-0">
                                        <span className="sm:hidden text-[10px] text-muted-foreground">Price (Rp)</span>
                                        <CurrencyInput
                                            className="h-8 text-sm"
                                            value={row.price}
                                            onValueChange={(v) => updateRow(row.id, { price: v ?? 0, priceAuto: false })}
                                            aria-label={`Price of one ${name}`}
                                        />
                                    </div>

                                    {/* Stock count in this unit */}
                                    <div className="col-span-2 sm:col-span-1 min-w-0">
                                        <span className="sm:hidden text-[10px] text-muted-foreground">Stock</span>
                                        <Input
                                            className="h-8 text-sm tabular-nums"
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={counts[row.id] ?? 0}
                                            onChange={(e) => updateCount(row.id, parseInt(e.target.value) || 0)}
                                            aria-label={`Stock counted in ${name}`}
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-1 flex justify-end gap-0.5 self-end sm:self-center">
                                        <Button
                                            type="button"
                                            variant={panelOpen ? 'secondary' : 'ghost'}
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => togglePanel(row.id)}
                                            aria-expanded={panelOpen}
                                            aria-label={`More for ${name}: SKU, image`}
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => removeRow(row.id)}
                                            aria-label={`Remove ${name}`}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                {panelOpen && (
                                    <div className="flex flex-wrap items-end gap-3 rounded-md bg-muted/30 p-2.5">
                                        <div className="space-y-1 w-44">
                                            <Label htmlFor={`sku-${row.id}`} className="text-xs">{autoSku ? 'SKU' : 'SKU *'}</Label>
                                            <Input
                                                id={`sku-${row.id}`}
                                                className="h-8 text-sm"
                                                value={autoSku ? (row.sku || skuPreview) : row.sku}
                                                onChange={(e) => updateRow(row.id, { sku: e.target.value })}
                                                placeholder={autoSku ? 'Auto-generated' : 'SKU'}
                                                readOnly={autoSku}
                                                disabled={autoSku}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs">Image</span>
                                            <div className="w-9 h-9">
                                                <ImageUpload
                                                    value={row.imageUrl || undefined}
                                                    onChange={(url) => updateRow(row.id, { imageUrl: url })}
                                                    type="product"
                                                    minimal
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground pb-1.5 basis-full">
                                            1 {name} = {factor} {baseAbbr} · cost Rp {(poolCost * factor).toLocaleString('id-ID')} · {availableUnits(sharedStock, factor)} available
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Leftover base units when no unit is exactly 1 */}
                    {rows.length > 0 && hasLoose && (
                        <div className={`${ROW_GRID} px-3 py-2`}>
                            <span className="col-span-4 sm:col-span-3 text-sm text-muted-foreground">Loose {baseAbbr}</span>
                            <Input
                                className="col-span-2 sm:col-span-1 h-8 text-sm tabular-nums"
                                type="number"
                                min={0}
                                step={1}
                                value={counts[LOOSE] ?? 0}
                                onChange={(e) => updateCount(LOOSE, parseInt(e.target.value) || 0)}
                                aria-label={`Loose ${baseAbbr} in stock`}
                            />
                        </div>
                    )}

                    {/* Footer: add + total */}
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-muted/20">
                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={addRow}>
                            <Plus className="h-3.5 w-3.5" /> {rows.length === 0 ? 'Add first unit' : 'Add bigger unit'}
                        </Button>
                        {rows.length > 0 && !ladderError && (
                            <span className="text-sm font-medium tabular-nums">
                                Total {sharedStock.toLocaleString('id-ID')} {baseAbbr}
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/** Where stock can be counted: every unit, plus loose base units if no unit is exactly 1 */
function stockSlots(rows: ProductFormVariant[]) {
    const slots = rows.map(r => ({ id: r.id, factor: r.conversionFactor ?? 1 }));
    return slots.some(s => s.factor === 1) ? slots : [...slots, { id: LOOSE, factor: 1 }];
}
