import { NextRequest, NextResponse } from 'next/server';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Initialize Firebase Storage
    if (!app) {
      return NextResponse.json(
        { error: 'Firebase not initialized' },
        { status: 500 }
      );
    }

    const storage = getStorage(app);
    
    // Convert file to bytes
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Create a reference to the storage location
    const storageRef = ref(storage, `prizes/${filename}`);

    // Upload the file to Firebase Storage
    await uploadBytes(storageRef, buffer, {
      contentType: file.type,
    });

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);

    return NextResponse.json({
      success: true,
      imagePath: downloadURL,
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
