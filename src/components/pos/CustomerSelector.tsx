"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserPlus, X } from "lucide-react";

interface CustomerSelectorProps {
    onSelectCustomer: (customer: { id: string; name: string; email?: string } | null) => void;
    selectedCustomer?: { id: string; name: string; email?: string } | null;
}

export function CustomerSelector({ onSelectCustomer, selectedCustomer }: CustomerSelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchCustomers();
        }
    }, [open, searchQuery]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            params.append('limit', '20');

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
        onSelectCustomer({
            id: customer.id,
            name: customer.name,
            email: customer.email
        });
        setOpen(false);
        setSearchQuery("");
    };

    const handleClear = () => {
        onSelectCustomer(null);
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
                    <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 w-6 p-0">
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
                            <DialogTitle>Select Customer</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, email, or phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            <ScrollArea className="h-[300px]">
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    </div>
                                ) : customers.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No customers found
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {customers.map((customer) => (
                                            <button
                                                key={customer.id}
                                                onClick={() => handleSelect(customer)}
                                                className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                                            >
                                                <div className="font-medium">{customer.name}</div>
                                                {customer.email && (
                                                    <div className="text-xs text-muted-foreground">{customer.email}</div>
                                                )}
                                                {customer.phone && (
                                                    <div className="text-xs text-muted-foreground">{customer.phone}</div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
