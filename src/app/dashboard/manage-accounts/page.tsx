'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Key } from 'lucide-react';

interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  organization: string;
  role: 'admin' | 'organizer' | 'attendee';
  createdAt?: any;
  docId?: string;
}

export default function ManageAccountsPage() {
  const router = useRouter();
  const { userAccount, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<UserAccount | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    organization: '',
    role: 'attendee' as 'admin' | 'organizer' | 'attendee',
  });
  const [newPassword, setNewPassword] = useState('');

  // Check if user is admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
      });
      router.push('/dashboard');
    }
  }, [isAdmin, loading, router, toast]);

  // Fetch accounts
  useEffect(() => {
    if (isAdmin && db) {
      fetchAccounts();
    }
  }, [isAdmin]);

  const fetchAccounts = async () => {
    if (!db) return;
    
    try {
      const accountsCollection = await getDocs(collection(db, 'accounts'));
      const accountsData = accountsCollection.docs.map(accountDoc => {
        const data = accountDoc.data() as Partial<UserAccount>;
        return {
          uid: data.uid || accountDoc.id,
          email: data.email || '',
          displayName: data.displayName || 'User',
          organization: data.organization || '',
          role: (data.role as UserAccount['role']) || 'attendee',
          createdAt: data.createdAt,
          docId: accountDoc.id,
        } as UserAccount;
      });
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch accounts.',
      });
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db || !userAccount) return;

    try {
      // Call API route to create user without affecting current session
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
          organization: formData.organization,
          role: formData.role,
          adminUid: userAccount.docId || userAccount.uid, // Use docId if available
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      toast({
        title: 'Success',
        description: 'User account created successfully.',
      });

      setDialogOpen(false);
      setFormData({
        email: '',
        password: '',
        displayName: '',
        organization: '',
        role: 'attendee',
      });
      fetchAccounts();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create user account.',
      });
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !selectedAccount) return;

    try {
      await updateDoc(doc(db, 'accounts', selectedAccount.docId || selectedAccount.uid), {
        displayName: formData.displayName,
        organization: formData.organization,
        role: formData.role,
      });

      toast({
        title: 'Success',
        description: 'User account updated successfully.',
      });

      setEditDialogOpen(false);
      setSelectedAccount(null);
      fetchAccounts();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user account.',
      });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    // Note: Resetting password for other users requires Firebase Admin SDK
    // This is a placeholder - in production, you'd need a backend endpoint
    toast({
      title: 'Feature Note',
      description: 'Password reset requires admin API. Please use Firebase Console or implement backend endpoint.',
    });
    setResetPasswordDialogOpen(false);
  };

  const handleDeleteUser = async (account: UserAccount) => {
    if (!db) return;
    if (!confirm(`Are you sure you want to delete ${account.displayName}?`)) return;

    try {
      // Delete Firestore document
      await deleteDoc(doc(db, 'accounts', account.docId || account.uid));

      toast({
        title: 'Success',
        description: 'User account deleted from database.',
      });

      fetchAccounts();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete user account.',
      });
    }
  };

  const openEditDialog = (account: UserAccount) => {
    setSelectedAccount(account);
    setFormData({
      email: account.email,
      password: '',
      displayName: account.displayName,
      organization: account.organization,
      role: account.role,
    });
    setEditDialogOpen(true);
  };

  const openResetPasswordDialog = (account: UserAccount) => {
    setSelectedAccount(account);
    setNewPassword('');
    setResetPasswordDialogOpen(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'organizer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading || loadingAccounts) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Accounts</h1>
          <p className="text-muted-foreground">Add, edit, and manage user accounts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddUser}>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account with email and password.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attendee">Attendee</SelectItem>
                      <SelectItem value="organizer">Organizer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create User</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
          <CardDescription>
            Total users: {accounts.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.uid}>
                  <TableCell className="font-medium">{account.displayName}</TableCell>
                  <TableCell>{account.email}</TableCell>
                  <TableCell>{account.organization || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(account.role)}>
                      {account.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(account)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openResetPasswordDialog(account)}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(account)}
                        disabled={account.uid === userAccount?.uid}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditUser}>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user account information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-displayName">Display Name</Label>
                <Input
                  id="edit-displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-organization">Organization</Label>
                <Input
                  id="edit-organization"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attendee">Attendee</SelectItem>
                    <SelectItem value="organizer">Organizer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Update User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <form onSubmit={handleResetPassword}>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Reset password for {selectedAccount?.displayName}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Note: Password reset for other users requires Firebase Admin SDK. 
                Please use Firebase Console or contact system administrator.
              </p>
            </div>
            <DialogFooter>
              <Button type="submit">Reset Password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
