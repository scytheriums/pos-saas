"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CustomerDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customer?: any;
}

export function CustomerDialog({ open, onClose, onSuccess, customer }: CustomerDialogProps) {
    const [name, setName] = useState(customer?.name || "");
    const [phone, setPhone] = useState(customer?.phone || "");
    const [email, setEmail] = useState(customer?.email || "");
    const [address, setAddress] = useState(customer?.address || "");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setSubmitting(true);
        try {
            const url = customer ? `/api/customers/${customer.id}` : '/api/customers';
            const method = customer ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, email, address }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to save customer');
            }

            onClose();
            resetForm();
            onSuccess();
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Failed to save customer');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setName("");
        setPhone("");
        setEmail("");
        setAddress("");
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                            placeholder="Customer name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                            placeholder="+1234567890"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                            type="email"
                            placeholder="customer@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Address</Label>
                        <Textarea
                            placeholder="Customer address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" type="button" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting || !name}>
                            {submitting ? "Saving..." : customer ? "Update" : "Create"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
