import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// Ensure Node.js runtime for firebase-admin
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName, organization, role, adminUid } = await request.json();

    console.log('Creating user - adminUid:', adminUid);

    // Verify the requesting user is an admin
    const adminDoc = await adminDb.collection('accounts').doc(adminUid).get();
    
    if (!adminDoc.exists) {
      console.error('Admin document not found for uid:', adminUid);
      return NextResponse.json(
        { error: 'Unauthorized: Admin account not found' },
        { status: 403 }
      );
    }

    const adminData = adminDoc.data();
    console.log('Admin data:', adminData);
    
    if (!adminData || adminData.role !== 'admin') {
      console.error('User is not an admin. Role:', adminData?.role);
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Create user with Firebase Admin SDK
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    console.log('User created:', userRecord.uid);

    // Create Firestore account document
    await adminDb.collection('accounts').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName,
      organization: organization || '',
      role,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      message: 'User created successfully',
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}

