'use client';

import { authClient, type AuthUser } from '@/lib/auth-client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, Shield, Trash2, Copy, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

type UserRole = 'owner' | 'manager' | 'cashier';

interface TeamMember {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
}

export default function UsersPage() {
    const { data: session, isPending } = authClient.useSession();
    const user = session?.user as AuthUser | undefined;
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>('cashier');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);

    // Check if user is owner
    const isOwner = user?.role === 'owner';

    useEffect(() => {
        if (!isPending && !isOwner) {
            router.push('/dashboard');
        } else if (isOwner) {
            fetchTeamMembers();
        }
    }, [isPending, isOwner, router]);

    const fetchTeamMembers = async () => {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const data = await response.json();
                setTeamMembers(data.users || []);
            }
        } catch (err) {
            console.error('Error fetching team members:', err);
        }
    };

    const copyInviteLink = async (link: string) => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        setInviteLink('');

        try {
            const response = await fetch('/api/users/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create invitation');
            }

            setSuccess(`Invitation created for ${inviteEmail}`);
            if (data.inviteLink) {
                setInviteLink(data.inviteLink);
            }
            setInviteEmail('');
            setInviteRole('cashier');
            fetchTeamMembers();
        } catch (err: any) {
            setError(err.message || 'Failed to create invitation');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveUser = async (userId: string) => {
        if (!confirm('Are you sure you want to remove this user?')) return;

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to remove user');
            }

            fetchTeamMembers();
        } catch (err) {
            setError('Failed to remove user');
        }
    };

    if (!isOwner) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold">Team Management</h1>
                    <p className="text-xs text-muted-foreground">Invite and manage your team members</p>
                </div>
            </div>

            {/* Invite Form */}
            <Card>
                <CardContent className="p-0">
                    <div className="px-4 pt-4 pb-2 border-b flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold text-sm">Invite Team Member</p>
                    </div>
                    <div className="p-4">
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="colleague@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Select
                                    value={inviteRole}
                                    onValueChange={(value) => setInviteRole(value as UserRole)}
                                    disabled={loading}
                                >
                                    <SelectTrigger id="role">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cashier">Cashier - POS access only</SelectItem>
                                        <SelectItem value="manager">Manager - POS + Reports</SelectItem>
                                        <SelectItem value="owner">Owner - Full access</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700 space-y-2">
                                <p>{success}</p>
                                {inviteLink && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <p className="text-xs font-medium">Share this invite link:</p>
                                        <div className="flex-1 truncate text-xs bg-white border rounded px-2 py-1 font-mono">
                                            {inviteLink}
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => copyInviteLink(inviteLink)}
                                        >
                                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        <Button type="submit" disabled={loading} size="sm" className="h-9 gap-1.5">
                            <Mail className="h-4 w-4" />
                            {loading ? 'Creating...' : 'Create Invite Link'}
                        </Button>
                    </form>
                    </div>
                </CardContent>
            </Card>

            {/* Team Members List */}
            <Card>
                <CardContent className="p-0">
                    <div className="px-4 pt-4 pb-2 border-b flex items-center justify-between">
                        <p className="font-semibold text-sm">Team Members</p>
                        <span className="text-xs text-muted-foreground">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="p-4 space-y-3">
                        {teamMembers.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No team members yet. Invite someone to get started!
                            </p>
                        ) : (
                            teamMembers.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between gap-3 p-3 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <Shield className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm truncate">
                                                {member.name || member.email}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                                            {member.role}
                                        </span>
                                        {member.id !== user?.id && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleRemoveUser(member.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
