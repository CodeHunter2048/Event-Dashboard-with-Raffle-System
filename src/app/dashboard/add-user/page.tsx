'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


const AddUserPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');

    try {
        const user = auth.currentUser;
        if (user) {
            const idToken = await user.getIdToken();
            const response = await fetch('/api/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ email, password, displayName, organization, role })
            });

            if (response.ok) {
                toast({
                  title: 'User Created',
                  description: 'The new user has been successfully added.',
                });
                router.push('/dashboard');
            } else {
                const data = await response.json();
                setError(data.error || 'An error occurred');
            }
        }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Error creating user',
        description: error.message,
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Add User</CardTitle>
          <CardDescription>
            Enter the details of the new user below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddUser} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="John Doe"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={cn(error && 'border-destructive')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(error && 'border-destructive')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(error && 'border-destructive')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                type="text"
                placeholder="Some Organization"
                required
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className={cn(error && 'border-destructive')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                type="text"
                placeholder="admin or user"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={cn(error && 'border-destructive')}
              />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Add User
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddUserPage;
