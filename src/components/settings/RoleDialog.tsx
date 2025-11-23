"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { PermissionAction, PermissionResource } from "@prisma/client";

interface RoleDialogProps {
    open: boolean;
    onClose: () => void;
    role?: any;
    onSuccess: () => void;
}

export function RoleDialog({ open, onClose, role, onSuccess }: RoleDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [permissions, setPermissions] = useState<{ action: string; resource: string }[]>([]);
    const [loading, setLoading] = useState(false);

    const actions = Object.values(PermissionAction);
    const resources = Object.values(PermissionResource);

    useEffect(() => {
        if (role) {
            setName(role.name);
            setDescription(role.description || "");
            setPermissions(role.permissions.map((p: any) => ({ action: p.action, resource: p.resource })));
        } else {
            setName("");
            setDescription("");
            setPermissions([]);
        }
    }, [role]);

    const hasPermission = (action: string, resource: string) => {
        return permissions.some(p => p.action === action && p.resource === resource);
    };

    const togglePermission = (action: string, resource: string) => {
        if (hasPermission(action, resource)) {
            setPermissions(permissions.filter(p => !(p.action === action && p.resource === resource)));
        } else {
            setPermissions([...permissions, { action, resource }]);
        }
    };

    const toggleAllForResource = (resource: string, checked: boolean) => {
        if (checked) {
            const newPerms = actions.map(action => ({ action, resource }));
            setPermissions([...permissions.filter(p => p.resource !== resource), ...newPerms]);
        } else {
            setPermissions(permissions.filter(p => p.resource !== resource));
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            alert("Role name is required");
            return;
        }

        setLoading(true);
        try {
            const url = role ? `/api/roles/${role.id}` : '/api/roles';
            const method = role ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, permissions })
            });

            if (res.ok) {
                onSuccess();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Failed to save role', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{role ? 'Edit Role' : 'Create Role'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="name">Role Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Manager"
                        />
                    </div>

                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of this role"
                            rows={2}
                        />
                    </div>

                    <div>
                        <Label>Permissions Matrix</Label>
                        <div className="border rounded-lg overflow-x-auto mt-2">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-2 text-left font-medium">Resource</th>
                                        {actions.map(action => (
                                            <th key={action} className="p-2 text-center font-medium">{action}</th>
                                        ))}
                                        <th className="p-2 text-center font-medium">All</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resources.map(resource => {
                                        const allChecked = actions.every(action => hasPermission(action, resource));
                                        return (
                                            <tr key={resource} className="border-t">
                                                <td className="p-2 font-medium">{resource}</td>
                                                {actions.map(action => (
                                                    <td key={action} className="p-2 text-center">
                                                        <Checkbox
                                                            checked={hasPermission(action, resource)}
                                                            onCheckedChange={() => togglePermission(action, resource)}
                                                        />
                                                    </td>
                                                ))}
                                                <td className="p-2 text-center">
                                                    <Checkbox
                                                        checked={allChecked}
                                                        onCheckedChange={(checked) => toggleAllForResource(resource, !!checked)}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Saving...' : role ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
