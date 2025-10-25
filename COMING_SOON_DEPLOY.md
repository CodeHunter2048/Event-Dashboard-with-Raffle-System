# Coming Soon Page Deployment Guide

## Overview
A beautiful "Coming Soon" page for the **AI for IA: Uniting Industry-Academia through Artificial Intelligence** conference on October 29, 2025.

## Page Location
The coming soon page is located at: `src/app/coming-soon/page.tsx`

## Features
- ✨ Animated gradient background with floating blobs
- ⏱️ Live countdown timer to October 29, 2025
- 📱 Fully responsive design
- 🎨 Modern glassmorphism UI
- 🚀 Built with Next.js 15 and Tailwind CSS

## Deployment Options

### Option 1: Deploy on Separate Branch (Recommended)

1. **Create a new branch for the coming soon page:**
   ```bash
   git checkout -b coming-soon
   ```

2. **Modify `src/app/page.tsx` to redirect to the coming soon page:**
   ```tsx
   import { redirect } from 'next/navigation';

   export default function Home() {
     redirect('/coming-soon');
   }
   ```

3. **Commit and push:**
   ```bash
   git add .
   git commit -m "Add coming soon page"
   git push origin coming-soon
   ```

4. **Deploy the `coming-soon` branch to your hosting platform**
   - Vercel: Connect the `coming-soon` branch as a separate deployment
   - Netlify: Deploy from the `coming-soon` branch
   - Other platforms: Follow their branch deployment instructions

### Option 2: Standalone Deployment

1. **Keep only the coming soon page by editing `src/app/page.tsx`:**
   ```tsx
   import { redirect } from 'next/navigation';

   export default function Home() {
     redirect('/coming-soon');
   }
   ```

2. **Deploy to your hosting platform**

### Option 3: Use Environment Variables

1. **Add an environment variable to control which page to show:**
   ```env
   # .env.local
   SHOW_COMING_SOON=true
   ```

2. **Modify `src/app/page.tsx`:**
   ```tsx
   import { redirect } from 'next/navigation';

   export default function Home() {
     if (process.env.SHOW_COMING_SOON === 'true') {
       redirect('/coming-soon');
     }
     redirect('/dashboard');
   }
   ```

## Customization

### Change the Event Date
Edit line 15 in `src/app/coming-soon/page.tsx`:
```tsx
const targetDate = new Date('2025-10-29T09:00:00').getTime();
```

### Change Colors
The page uses Tailwind CSS classes. Main colors:
- Background gradient: `from-blue-900 via-purple-900 to-indigo-900`
- Floating blobs: `bg-purple-500`, `bg-blue-500`, `bg-indigo-500`
- CTA button: `from-yellow-400 to-orange-500`

### Change Contact Email
Edit line 115 in `src/app/coming-soon/page.tsx`:
```tsx
<a href="mailto:info@aiforIA.com">info@aiforIA.com</a>
```

## Preview Locally

Run the development server:
```bash
npm run dev
```

Then visit: `http://localhost:9002/coming-soon`

## Build for Production

```bash
npm run build
npm start
```

## Technologies Used
- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- Lucide React (icons)

## Notes
- The countdown timer automatically updates every second
- The page is fully responsive and works on all devices
- The animated background blobs create a dynamic, modern look
- TypeScript errors in the editor are false positives and won't affect the build
