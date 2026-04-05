"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
    id: string;
    userName: string;
    action: string;
    resource: string;
    resourceId: string | null;
    details: any;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    user: {
        id: string;
        name: string;
        email: string;
    };
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);
    const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const page = cursorHistory.length + 1;

    // Filters
    const [actionFilter, setActionFilter] = useState("all");
    const [resourceFilter, setResourceFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        // Reset cursor when filters change
        setCursor(null);
        setCursorHistory([]);
    }, [actionFilter, resourceFilter]);

    useEffect(() => {
        fetchLogs();
    }, [cursor, actionFilter, resourceFilter]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ limit: "20" });
            if (cursor) params.append("cursor", cursor);
            if (actionFilter && actionFilter !== "all") params.append("action", actionFilter);
            if (resourceFilter && resourceFilter !== "all") params.append("resource", resourceFilter);

            const response = await fetch(`/api/audit-logs?${params}`);
            if (!response.ok) throw new Error("Failed to fetch audit logs");

            const data = await response.json();
            setLogs(data.logs);
            setHasMore(data.hasMore);
        } catch (error) {
            console.error("Error fetching audit logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const goToNextPage = () => {
        const lastId = logs[logs.length - 1]?.id;
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

    const handleExport = () => {
        const params = new URLSearchParams();
        if (actionFilter && actionFilter !== "all") params.append("action", actionFilter);
        if (resourceFilter && resourceFilter !== "all") params.append("resource", resourceFilter);

        window.open(`/api/audit-logs/export?${params}`, "_blank");
    };

    const getActionBadgeColor = (action: string) => {
        switch (action) {
            case "CREATE": return "default";
            case "UPDATE": return "secondary";
            case "DELETE": return "destructive";
            case "LOGIN": return "outline";
            case "LOGOUT": return "outline";
            default: return "secondary";
        }
    };

    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            log.userName.toLowerCase().includes(query) ||
            log.action.toLowerCase().includes(query) ||
            log.resource.toLowerCase().includes(query) ||
            log.user.email.toLowerCase().includes(query)
        );
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Audit Logs</h1>
                    <p className="text-muted-foreground">Track all system activities and changes</p>
                </div>
                <Button onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Filter audit logs by action, resource, or search</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Action</label>
                            <Select value={actionFilter} onValueChange={setActionFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Actions" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    <SelectItem value="CREATE">Create</SelectItem>
                                    <SelectItem value="UPDATE">Update</SelectItem>
                                    <SelectItem value="DELETE">Delete</SelectItem>
                                    <SelectItem value="LOGIN">Login</SelectItem>
                                    <SelectItem value="LOGOUT">Logout</SelectItem>
                                    <SelectItem value="EXPORT">Export</SelectItem>
                                    <SelectItem value="SETTINGS_CHANGE">Settings Change</SelectItem>
                                    <SelectItem value="PERMISSION_CHANGE">Permission Change</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Resource</label>
                            <Select value={resourceFilter} onValueChange={setResourceFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Resources" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Resources</SelectItem>
                                    <SelectItem value="PRODUCT">Product</SelectItem>
                                    <SelectItem value="CATEGORY">Category</SelectItem>
                                    <SelectItem value="ORDER">Order</SelectItem>
                                    <SelectItem value="USER">User</SelectItem>
                                    <SelectItem value="CUSTOMER">Customer</SelectItem>
                                    <SelectItem value="DISCOUNT">Discount/Promotion</SelectItem>
                                    <SelectItem value="SETTINGS">Settings</SelectItem>
                                    <SelectItem value="ROLE">Role</SelectItem>
                                    <SelectItem value="STOCK_ADJUSTMENT">Stock Adjustment</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search user, email, action..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Audit Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Activity Log</CardTitle>
                    <CardDescription>Showing {filteredLogs.length} of {logs.length} entries on this page</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Resource</TableHead>
                                        <TableHead>Resource ID</TableHead>
                                        <TableHead>IP Address</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-sm">
                                                {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{log.userName}</div>
                                                    <div className="text-xs text-muted-foreground">{log.user.email}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getActionBadgeColor(log.action)}>
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{log.resource}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {log.resourceId ? (
                                                    <code className="text-xs">{log.resourceId.substring(0, 8)}...</code>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {log.ipAddress || "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-muted-foreground">
                                    Page {page}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={goToPrevPage}
                                        disabled={cursorHistory.length === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={goToNextPage}
                                        disabled={!hasMore}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
