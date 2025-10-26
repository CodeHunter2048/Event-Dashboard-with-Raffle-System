'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, isFirebaseReady } from '@/lib/firebase';

const withAuth = (WrappedComponent: any) => {
  const Wrapper = (props: any) => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      // Check if Firebase is ready before using auth
      if (!isFirebaseReady() || !auth) {
        setError('Firebase is not properly configured. Please check your environment variables.');
        setLoading(false);
        return;
      }

      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          if (!user) {
            router.push('/login');
          } else {
            setUser(user);
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

    return <WrappedComponent {...props} user={user} />;
  };

  return Wrapper;
};

export default withAuth;
