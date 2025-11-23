'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, Shield, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

type UserRole = 'owner' | 'manager' | 'cashier';

interface TeamMember {
    id: string;
    email: string;
    role: UserRole;
    firstName?: string;
    lastName?: string;
}

export default function UsersPage() {
    const { user } = useUser();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>('cashier');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Check if user is owner
    const userRole = user?.publicMetadata?.role as UserRole;
    const isOwner = userRole === 'owner';

    useEffect(() => {
        if (!isOwner) {
            router.push('/dashboard');
        } else {
            fetchTeamMembers();
        }
    }, [isOwner, router]);

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

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/users/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send invitation');
            }

            setSuccess(`Invitation sent to ${inviteEmail}!`);
            setInviteEmail('');
            setInviteRole('cashier');
            fetchTeamMembers();
        } catch (err: any) {
            setError(err.message || 'Failed to send invitation');
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
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Team Management</h1>
                <p className="text-muted-foreground">Invite and manage your team members</p>
            </div>

            {/* Invite Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Invite Team Member
                    </CardTitle>
                    <CardDescription>
                        Send an invitation to join your team
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
                            <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
                                {success}
                            </div>
                        )}

                        <Button type="submit" disabled={loading}>
                            <Mail className="mr-2 h-4 w-4" />
                            {loading ? 'Sending...' : 'Send Invitation'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Team Members List */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                        {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {teamMembers.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No team members yet. Invite someone to get started!
                            </p>
                        ) : (
                            teamMembers.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Shield className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {member.firstName && member.lastName
                                                    ? `${member.firstName} ${member.lastName}`
                                                    : member.email}
                                            </p>
                                            <p className="text-sm text-muted-foreground">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                                            {member.role}
                                        </span>
                                        {member.id !== user?.id && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
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
