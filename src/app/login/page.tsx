'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { rateLimiter } from '@/lib/rate-limiter';
import { Tv, Clock, Shield, Users, FileText, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    isBlocked: boolean;
    remainingAttempts: number;
    blockedUntil?: Date;
  } | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!auth || !db) {
      setError('Authentication service not initialized.');
      setIsLoading(false);
      return;
    }

    // Check rate limit
    const rateLimitCheck = rateLimiter.checkLimit(email);
    if (!rateLimitCheck.isAllowed) {
      const minutesLeft = rateLimiter.getTimeUntilReset(email);
      setError(
        `Too many failed login attempts. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`
      );
      setRateLimitInfo({
        isBlocked: true,
        remainingAttempts: 0,
        blockedUntil: rateLimitCheck.blockedUntil,
      });
      setIsLoading(false);
      return;
    }

    // Execute reCAPTCHA
    if (executeRecaptcha) {
      try {
        const token = await executeRecaptcha('login');
        
        // Verify token on server-side (optional but recommended)
        // For now, we'll just check if token exists
        if (!token) {
          setError('reCAPTCHA verification failed. Please try again.');
          setIsLoading(false);
          return;
        }
      } catch (recaptchaError) {
        console.error('reCAPTCHA error:', recaptchaError);
        setError('Security verification failed. Please refresh and try again.');
        setIsLoading(false);
        return;
      }
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Clear rate limit on successful login
      rateLimiter.clearAttempts(email);
      setRateLimitInfo(null);
      
      // Log the login event
      try {
        await addDoc(collection(db, 'loginlogs'), {
          userId: user.uid,
          email: user.email || email,
          displayName: user.displayName || email.split('@')[0],
          action: 'login',
          timestamp: serverTimestamp(),
          success: true,
        });
      } catch (logError) {
        console.error('Error logging login event:', logError);
      }
      
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      
      router.push('/dashboard');
    } catch (error: any) {
      // Record failed attempt
      rateLimiter.recordAttempt(email);
      const updatedLimit = rateLimiter.checkLimit(email);
      setRateLimitInfo({
        isBlocked: !updatedLimit.isAllowed,
        remainingAttempts: updatedLimit.remainingAttempts,
        blockedUntil: updatedLimit.blockedUntil,
      });

      // Log failed attempt
      try {
        await addDoc(collection(db, 'loginlogs'), {
          email: email,
          action: 'failed_login',
          timestamp: serverTimestamp(),
          success: false,
          errorCode: error.code,
        });
      } catch (logError) {
        console.error('Error logging failed login:', logError);
      }

      if (error.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later or contact your event administrator.');
      } else {
        setError('An unexpected error occurred. Please try again.');
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: error.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 dark:bg-yellow-900 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl w-full items-center">
          {/* Left Side - Branding & Info */}
          <div className="space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Image src="/logo.png" alt="AI for IA Logo" width={16} height={16} />
                <span className="text-sm font-medium">AI for IA Event Dashboard</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Welcome to the
                <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Event Dashboard
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
                Manage your event with ease. Check-in attendees, manage prizes, and conduct live drawings seamlessly.
              </p>
            </div>

            {/* Quick Access Cards */}
            <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto lg:mx-0">
              <Link href="/display" target="_blank">
                <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/50 h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Tv className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">Public Display</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      View live event updates and winner announcements
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/transparency" target="_blank">
                <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/50 h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">Transparency</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      View full history of winners and check-ins
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/coming-soon">
                <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/50 h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">Coming Soon</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      Preview the event announcement page
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Features */}
            <div className="hidden lg:flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Secure Authentication</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Role-based Access</span>
              </div>
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="Logo" width={16} height={16} />
                <span>Real-time Updates</span>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">Login</CardTitle>
                <CardDescription>
                  Enter your email below to login to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="grid gap-4">
                  {/* Rate Limit Warning */}
                  {rateLimitInfo && rateLimitInfo.remainingAttempts <= 2 && rateLimitInfo.remainingAttempts > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Warning: {rateLimitInfo.remainingAttempts} attempt{rateLimitInfo.remainingAttempts !== 1 ? 's' : ''} remaining before temporary lockout.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading || (rateLimitInfo?.isBlocked ?? false)}
                      className={cn(error && 'border-destructive')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading || (rateLimitInfo?.isBlocked ?? false)}
                      className={cn(error && 'border-destructive')}
                    />
                  </div>
                  {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || (rateLimitInfo?.isBlocked ?? false)}
                  >
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
                
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  <p>Need help? Contact your event administrator</p>
                  {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
                    <p className="mt-2 text-xs">Protected by reCAPTCHA</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
