
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// IMPORTANT: Replace with the actual path to your service account key file
const serviceAccount = require('../../../../serviceAccountKey.json');

const app = initializeApp({ 
    credential: cert(serviceAccount)
}, 'admin');

const auth = getAuth(app);
const db = getFirestore(app);

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
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }


        const userRecord = await auth.createUser({ email, password, displayName });
        await db.collection('users').doc(userRecord.uid).set({
            displayName,
            email,
            organization,
            role,
            uid: userRecord.uid
        });

        return NextResponse.json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Error creating user' }, { status: 500 });
    }
}
