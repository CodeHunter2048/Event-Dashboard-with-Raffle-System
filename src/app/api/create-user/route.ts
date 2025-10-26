
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

let adminApp;
if (!getApps().some(app => app.name === 'admin')) {
    const serviceAccount = require('../../../../serviceAccountKey.json');
    adminApp = initializeApp({
        credential: cert(serviceAccount)
    }, 'admin');
} else {
    adminApp = getApp('admin');
}


const auth = getAuth(adminApp);
const db = getFirestore(adminApp);

export async function POST(req: NextRequest) {
    try {
        const { email, password, displayName, organization, role } = await req.json();

        // Get the token from the request header
        const idToken = req.headers.get('authorization')?.split('Bearer ')[1];

        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify the token
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const userDocRef = db.collection('users').doc(uid);
        const userDoc = await userDocRef.get();


        if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }


        const userRecord = await auth.createUser({ email, password, displayName });
        const newUserDocRef = db.collection('users').doc(userRecord.uid);
        
        await newUserDocRef.set({
            displayName,
            email,
            organization,
            role,
            uid: userRecord.uid
        });

        return NextResponse.json({ message: 'User created successfully' });
    } catch (error: any) {
        console.error('Error creating user:', error);

        if (error.code?.includes('permission-denied')) {
             const permissionError = new FirestorePermissionError({
                path: 'users',
                operation: 'create',
                requestResourceData: error.requestData,
              });
              errorEmitter.emit('permission-error', permissionError);
        }

        return NextResponse.json({ error: 'Error creating user' }, { status: 500 });
    }
}
