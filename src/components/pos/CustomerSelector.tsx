"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, X, Plus, Pencil, ArrowLeft, Loader2 } from "lucide-react";

interface CustomerSelectorProps {
    onSelectCustomer: (customer: { id: string; name: string; email?: string } | null) => void;
    selectedCustomer?: { id: string; name: string; email?: string } | null;
}

type FormData = { name: string; email: string; phone: string; address: string };
const emptyForm: FormData = { name: "", email: "", phone: "", address: "" };

export function CustomerSelector({ onSelectCustomer, selectedCustomer }: CustomerSelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // "list" | "create" | "edit"
    const [view, setView] = useState<"list" | "create" | "edit">("list");
    const [editingCustomer, setEditingCustomer] = useState<any>(null);
    const [form, setForm] = useState<FormData>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Focus name field only when switching into create/edit view
    useEffect(() => {
        if (view !== "list") {
            setTimeout(() => nameInputRef.current?.focus(), 50);
        }
    }, [view]);

    useEffect(() => {
        if (open && view === "list") {
            fetchCustomers();
        }
    }, [open, searchQuery, view]);

    // Reset to list view when dialog closes
    useEffect(() => {
        if (!open) {
            setView("list");
            setSearchQuery("");
            setForm(emptyForm);
            setFormError("");
            setEditingCustomer(null);
        }
    }, [open]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append("search", searchQuery);
            params.append("limit", "20");
            const res = await fetch(`/api/customers?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.customers || []);
            }
        } catch (error) {
            console.error("Failed to fetch customers", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (customer: any) => {
        onSelectCustomer({ id: customer.id, name: customer.name, email: customer.email });
        setOpen(false);
    };

    const handleClear = () => onSelectCustomer(null);

    const openCreate = () => {
        setForm(emptyForm);
        setFormError("");
        setEditingCustomer(null);
        setView("create");
    };

    const openEdit = (customer: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setForm({
            name: customer.name || "",
            email: customer.email || "",
            phone: customer.phone || "",
            address: customer.address || "",
        });
        setFormError("");
        setEditingCustomer(customer);
        setView("edit");
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            setFormError("Name is required.");
            return;
        }
        setSaving(true);
        setFormError("");
        try {
            let res: Response;
            if (view === "edit" && editingCustomer) {
                res = await fetch(`/api/customers/${editingCustomer.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                });
            } else {
                res = await fetch("/api/customers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                });
            }

            if (!res.ok) {
                const err = await res.json();
                setFormError(err.error || "Failed to save customer.");
                return;
            }

            const data = await res.json();
            const saved = data.customer;
            onSelectCustomer({ id: saved.id, name: saved.name, email: saved.email });
            setOpen(false);
        } catch {
            setFormError("An unexpected error occurred.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex gap-2">
            {selectedCustomer ? (
                <div className="flex items-center gap-2 flex-1 px-3 py-2 border rounded-md bg-green-50 border-green-200">
                    <div className="flex-1">
                        <div className="font-medium text-sm text-green-900">{selectedCustomer.name}</div>
                        {selectedCustomer.email && (
                            <div className="text-xs text-green-700">{selectedCustomer.email}</div>
                        )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 w-6 p-0 text-green-700 hover:text-green-900">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start text-muted-foreground">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Select Customer (Optional)
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <div className="flex items-center gap-2">
                                {view !== "list" && (
                                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 -ml-1" onClick={() => setView("list")}>
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                )}
                                <DialogTitle>
                                    {view === "create" ? "New" : view === "edit" ? "Edit" : "Select Customer"}
                                </DialogTitle>
                            </div>
                        </DialogHeader>

                        {view === "list" ? (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by name, email, or phone..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    <Button type="button" size="sm" onClick={openCreate} className="shrink-0">
                                        <Plus className="h-4 w-4 mr-1" /> New
                                    </Button>
                                </div>

                                <ScrollArea className="h-[300px]">
                                    {loading ? (
                                        <div className="flex justify-center py-8">
                                            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        </div>
                                    ) : customers.length === 0 ? (
                                        <div className="flex flex-col items-center py-8 gap-3 text-muted-foreground text-sm">
                                            <span>No customers found</span>
                                            <Button type="button" variant="outline" size="sm" onClick={openCreate}>
                                                <Plus className="h-4 w-4 mr-1" /> Create
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {customers.map((customer) => (
                                                <div key={customer.id} className="flex items-center gap-1 group">
                                                    <button
                                                        onClick={() => handleSelect(customer)}
                                                        className="flex-1 text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                                                    >
                                                        <div className="font-medium">{customer.name}</div>
                                                        {customer.email && (
                                                            <div className="text-xs text-muted-foreground">{customer.email}</div>
                                                        )}
                                                        {customer.phone && (
                                                            <div className="text-xs text-muted-foreground">{customer.phone}</div>
                                                        )}
                                                    </button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                                                        onClick={(e) => openEdit(customer, e)}
                                                        title="Edit customer"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor="cs-name">Name <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="cs-name"
                                        ref={nameInputRef}
                                        placeholder="Customer name"
                                        value={form.name}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="cs-phone">Phone</Label>
                                    <Input
                                        id="cs-phone"
                                        placeholder="+62..."
                                        value={form.phone}
                                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="cs-email">Email</Label>
                                    <Input
                                        id="cs-email"
                                        type="email"
                                        placeholder="email@example.com"
                                        value={form.email}
                                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="cs-address">Address</Label>
                                    <Input
                                        id="cs-address"
                                        placeholder="Street, city..."
                                        value={form.address}
                                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                                    />
                                </div>
                                {formError && <p className="text-xs text-destructive">{formError}</p>}
                                <div className="flex gap-2 pt-1">
                                    <Button type="button" variant="outline" className="flex-1" onClick={() => setView("list")} disabled={saving}>
                                        Cancel
                                    </Button>
                                    <Button type="button" className="flex-1" onClick={handleSave} disabled={saving}>
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        {view === "edit" ? "Save Changes" : "Create & Select"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
