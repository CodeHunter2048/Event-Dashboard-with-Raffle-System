'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseReady } from '@/lib/firebase';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { SidebarNav } from '@/components/sidebar-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Firebase is properly initialized
    if (!isFirebaseReady() || !auth) {
      setError('Firebase is not properly configured. Please check your environment variables.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          // User is not authenticated, redirect to login
          router.push('/login');
        } else {
          // User is authenticated
          setLoading(false);
        }
      },
      (error) => {
        console.error('Auth state change error:', error);
        setError('Authentication error occurred. Please try again.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Configuration Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-gray-600">
            Please ensure your <code className="bg-red-100 px-2 py-1 rounded">.env.local</code> file
            contains valid Firebase credentials.
          </p>
        </div>
      </div>
    );
  }

  // Authenticated state - show dashboard
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarNav />
      </Sidebar>
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 p-4 lg:p-6">
          <div className="flex flex-col gap-4 lg:gap-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
