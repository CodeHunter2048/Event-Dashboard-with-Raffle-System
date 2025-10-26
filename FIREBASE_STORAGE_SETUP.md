# Firebase Storage Setup Guide

Your application has been updated to use **Firebase Storage** instead of direct file uploads, which is required for Vercel deployment.

## Changes Made

1. ✅ Updated `src/lib/firebase.ts` to initialize Firebase Storage (client-side)
2. ✅ Updated `src/lib/firebase-admin.ts` to initialize Firebase Storage (server-side)
3. ✅ Rewrote `src/app/api/upload-prize-image/route.ts` to use Firebase Admin Storage
4. ✅ Created `storage.rules` for Firebase Storage security

## Setup Steps

### 1. Enable Firebase Storage

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on **Storage** in the left sidebar
4. Click **Get Started**
5. Choose your security rules (use default for now)
6. Select a storage location (choose the closest region to your users)
7. Click **Done**

### 2. Deploy Storage Rules

You need to deploy the storage rules to Firebase. Run:

```bash
# Install Firebase CLI if you haven't already
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init

# Select Storage and Firestore when prompted
# Choose your existing project
# Accept the default files or use storage.rules

# Deploy the rules
firebase deploy --only storage
```

Or manually copy the rules from `storage.rules` file:

1. Go to Firebase Console > Storage > Rules
2. Copy and paste the contents of `storage.rules`
3. Click **Publish**

### 3. Verify Your Environment Variables

Make sure your `.env.local` has the storage bucket configured:

```env
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

This should already be set if you configured Firebase correctly.

### 4. Test Locally

Before deploying to Vercel:

```bash
npm run dev
```

Try uploading a prize image to verify it works with Firebase Storage.

## How It Works Now

### Before (❌ Won't work on Vercel)
```typescript
// Direct filesystem write
await writeFile(publicPath, buffer);
const imagePath = `/prizes/${filename}`;
```

### After (✅ Works on Vercel)
```typescript
// Upload to Firebase Storage using Admin SDK
const bucket = adminStorage.bucket();
const fileRef = bucket.file(`prizes/${filename}`);
await fileRef.save(buffer, { metadata: { contentType: file.type } });
await fileRef.makePublic();
const publicUrl = `https://storage.googleapis.com/${bucket.name}/prizes/${filename}`;
// Returns: https://storage.googleapis.com/your-project.appspot.com/prizes/...
```

## Benefits

✅ **Vercel Compatible** - No filesystem access needed  
✅ **CDN Delivery** - Images served from Google's CDN  
✅ **Persistent** - Files persist across deployments  
✅ **Scalable** - Automatic scaling and optimization  
✅ **Secure** - Controlled access with Firebase rules  

## Troubleshooting

### Error: "Firebase not initialized"
- Make sure all Firebase environment variables are set (both client and server)
- Check that `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is correct
- Verify Firebase Admin credentials are configured (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)

### Error: "Permission denied"
- Deploy or update your `storage.rules`
- Make sure users are authenticated before uploading

### Images not displaying
- Check that the download URL is being saved to Firestore
- Verify Firebase Storage rules allow read access

## Next Steps

1. ✅ Enable Firebase Storage in Firebase Console
2. ✅ Deploy storage rules
3. ✅ Test image upload locally
4. ✅ Deploy to Vercel
5. ✅ Test in production

## Alternative: Vercel Blob (Optional)

If you prefer to use Vercel's native storage instead:

```bash
npm install @vercel/blob
```

Then update the upload route to use Vercel Blob. Let me know if you'd like me to show you this alternative approach!
