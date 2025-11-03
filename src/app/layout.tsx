import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { RecaptchaProvider } from '@/components/recaptcha-provider';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL('https://aiforia.vercel.app'),
  title: {
    default: 'AI for IA - Event Dashboard & Raffle System',
    template: '%s | AI for IA'
  },
  description: 'Professional event management system for AI academic conferences. Features QR-based check-in, real-time analytics, and transparent raffle prize drawing functionality.',
  keywords: ['AI conference', 'event management', 'raffle system', 'QR check-in', 'prize drawing', 'event dashboard', 'academic conference'],
  authors: [{ name: 'AI for IA Team' }],
  creator: 'AI for IA',
  publisher: 'AI for IA',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://aiforia.vercel.app',
    title: 'AI for IA - Event Dashboard & Raffle System',
    description: 'Professional event management system for AI academic conferences with QR-based check-in and transparent raffle system.',
    siteName: 'AI for IA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI for IA - Event Dashboard & Raffle System',
    description: 'Professional event management system for AI academic conferences with QR-based check-in and transparent raffle system.',
  },
  verification: {
    // Add your Google Search Console verification code here after setup
    // google: 'your-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('font-body antialiased', inter.variable)}>
        <RecaptchaProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </RecaptchaProvider>
      </body>
    </html>
  );
}
