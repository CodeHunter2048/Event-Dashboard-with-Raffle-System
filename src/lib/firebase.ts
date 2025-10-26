// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

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

if (typeof window !== 'undefined') {
  try {
    // Validate config before initializing
    if (validateFirebaseConfig()) {
      // Client-side only
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      db = getFirestore(app);
      auth = getAuth(app);
      console.log('✅ Firebase initialized successfully');
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

export { db, auth, app };
