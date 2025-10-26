/**
 * Custom hook to fetch current user's account data from Firestore
 * Includes role, organization, and other profile information
 */

'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  organization: string;
  role: 'admin' | 'organizer' | 'attendee';
  createdAt?: any;
  docId?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser && db) {
        try {
          const accountsRef = collection(db, 'accounts');
          const accountDocRef = doc(accountsRef, firebaseUser.uid);
          const accountDocSnap = await getDoc(accountDocRef);

          let docId: string | undefined = accountDocSnap.exists() ? accountDocSnap.id : undefined;
          let accountData: Partial<UserAccount> | null = accountDocSnap.exists()
            ? (accountDocSnap.data() as Partial<UserAccount>)
            : null;

          if (!accountData && firebaseUser.email) {
            // Fallback: find by email (handles user_001 style docs)
            const emailQuery = query(accountsRef, where('email', '==', firebaseUser.email));
            const emailSnapshot = await getDocs(emailQuery);

            if (!emailSnapshot.empty) {
              const emailDoc = emailSnapshot.docs[0];
              accountData = emailDoc.data() as Partial<UserAccount>;
              docId = emailDoc.id;
            }
          }

          if (accountData) {
            setUserAccount({
              uid: accountData.uid || firebaseUser.uid,
              email: accountData.email || firebaseUser.email || '',
              displayName: accountData.displayName || firebaseUser.displayName || 'User',
              organization: accountData.organization || '',
              role: (accountData.role as UserAccount['role']) || 'attendee',
              createdAt: accountData.createdAt,
              docId: docId,
            });
          } else {
            // If no Firestore doc, create basic account
            setUserAccount({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              organization: '',
              role: 'attendee',
            });
          }
        } catch (error) {
          console.error('Error fetching user account:', error);
        }
      } else {
        setUserAccount(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    userAccount,
    loading,
    isAdmin: userAccount?.role === 'admin',
    isOrganizer: userAccount?.role === 'organizer' || userAccount?.role === 'admin',
  };
}
