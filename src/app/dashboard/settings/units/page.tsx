'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Check, X } from 'lucide-react';

interface Unit {
    id: string;
    name: string;
    abbreviation: string;
    usageCount: number;
}

export default function UnitsSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [units, setUnits] = useState<Unit[]>([]);
    const [newName, setNewName] = useState('');
    const [newAbbr, setNewAbbr] = useState('');
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editAbbr, setEditAbbr] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    useEffect(() => {
        fetchUnits();
    }, []);

    const fetchUnits = async () => {
        try {
            const res = await fetch('/api/units');
            if (res.ok) {
                const data = await res.json();
                setUnits(data.data ?? []);
            }
        } catch {
            toast.error('Failed to load units');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !newAbbr.trim()) return;
        setAdding(true);
        try {
            const res = await fetch('/api/units', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, abbreviation: newAbbr }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add unit');
            toast.success(`Added ${data.name}`);
            setNewName('');
            setNewAbbr('');
            fetchUnits();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to add unit');
        } finally {
            setAdding(false);
        }
    };

    const startEdit = (unit: Unit) => {
        setEditingId(unit.id);
        setEditName(unit.name);
        setEditAbbr(unit.abbreviation);
        setConfirmDeleteId(null);
    };

    const saveEdit = async (id: string) => {
        try {
            const res = await fetch(`/api/units/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName, abbreviation: editAbbr }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save unit');
            toast.success('Unit saved');
            setEditingId(null);
            fetchUnits();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to save unit');
        }
    };

    const deleteUnit = async (id: string) => {
        try {
            const res = await fetch(`/api/units/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete unit');
            toast.success('Unit deleted');
            setConfirmDeleteId(null);
            fetchUnits();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete unit');
            setConfirmDeleteId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold">Units of Measure</h1>
                <p className="text-xs text-muted-foreground">
                    Units for counting stock and naming pack sizes, e.g. pcs, kg, Tray, Box
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Add a Unit</CardTitle>
                    <CardDescription>
                        Use these when a product shares one stock count across pack sizes
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
                        <Input
                            id="unit-name"
                            placeholder="Name, e.g. Tray"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="sm:flex-1"
                        />
                        <Input
                            id="unit-abbreviation"
                            placeholder="Short form, e.g. tray"
                            value={newAbbr}
                            onChange={(e) => setNewAbbr(e.target.value)}
                            className="sm:w-40"
                        />
                        <Button type="submit" disabled={adding || !newName.trim() || !newAbbr.trim()}>
                            {adding ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
                            Add Unit
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Your Units</CardTitle>
                    <CardDescription>{units.length} unit{units.length === 1 ? '' : 's'}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {units.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No units yet. Add one above.</p>
                    ) : (
                        <div className="divide-y">
                            {units.map(unit => (
                                <div key={unit.id} className="flex items-center gap-3 px-4 py-2.5">
                                    {editingId === unit.id ? (
                                        <>
                                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 flex-1" aria-label="Unit name" />
                                            <Input value={editAbbr} onChange={(e) => setEditAbbr(e.target.value)} className="h-8 w-28" aria-label="Short form" />
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(unit.id)} aria-label="Save">
                                                <Check className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)} aria-label="Cancel">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex-1 min-w-0">
                                                <span className="font-medium text-sm">{unit.name}</span>
                                                <span className="text-xs text-muted-foreground ml-2">{unit.abbreviation}</span>
                                            </div>
                                            {unit.usageCount > 0 && (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    Used {unit.usageCount}×
                                                </Badge>
                                            )}
                                            {confirmDeleteId === unit.id ? (
                                                <>
                                                    <span className="text-xs">Delete?</span>
                                                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteUnit(unit.id)}>Delete</Button>
                                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirmDeleteId(null)}>Keep</Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(unit)} aria-label={`Rename ${unit.name}`}>
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() => setConfirmDeleteId(unit.id)}
                                                        disabled={unit.usageCount > 0}
                                                        title={unit.usageCount > 0 ? 'In use by products' : `Delete ${unit.name}`}
                                                        aria-label={`Delete ${unit.name}`}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
