// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For security reasons, store these values in environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Validate Firebase configuration
function validateFirebaseConfig() {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missingFields = requiredFields.filter(
    field => !firebaseConfig[field as keyof typeof firebaseConfig]
  );

  if (missingFields.length > 0) {
    console.error(
      `🔥 Firebase Configuration Error: Missing required environment variables:\n` +
      missingFields.map(field => `  - NEXT_PUBLIC_FIREBASE_${field.replace(/([A-Z])/g, '_$1').toUpperCase()}`).join('\n')
    );
    return false;
  }

  return true;
}

// Initialize Firebase only on client-side
let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;

if (typeof window !== 'undefined') {
  try {
    // Validate config before initializing
    if (validateFirebaseConfig()) {
      // Client-side only
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      db = getFirestore(app);
      auth = getAuth(app);
      storage = getStorage(app);
      
      // Enable offline persistence for Firestore
      // This allows the app to work offline and sync when connection is restored
      if (db) {
        enableMultiTabIndexedDbPersistence(db).catch((err) => {
          if (err.code === 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled in one tab at a time.
            console.warn('⚠️ Firestore persistence failed: Multiple tabs open. Using single-tab persistence.');
            enableIndexedDbPersistence(db!).catch((error) => {
              console.error('🔥 Failed to enable persistence:', error);
            });
          } else if (err.code === 'unimplemented') {
            // The current browser doesn't support persistence
            console.warn('⚠️ Firestore persistence not available in this browser.');
          } else {
            console.error('🔥 Firestore persistence error:', err);
          }
        });
      }
      
      console.log('✅ Firebase initialized successfully with offline support');
    } else {
      console.warn('⚠️ Firebase not initialized due to configuration errors. Please check your .env.local file.');
    }
  } catch (error) {
    console.error('🔥 Firebase initialization error:', error);
    console.warn(
      'Please check your Firebase configuration in .env.local:\n' +
      '  - Ensure all NEXT_PUBLIC_FIREBASE_* variables are set\n' +
      '  - Verify your API key is valid\n' +
      '  - Make sure Firebase project exists'
    );
  }
}

// Helper function to check if Firebase is ready
export function isFirebaseReady(): boolean {
  return !!(app && db && auth);
}

export { db, auth, app, storage };
