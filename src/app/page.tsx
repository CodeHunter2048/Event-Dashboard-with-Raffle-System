import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, CheckCircle2, Shield, TrendingUp, Users, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Home',
  description: 'AI for IA Event Dashboard - Professional event management system with QR-based check-in and transparent raffle prize drawing for academic conferences.',
  openGraph: {
    title: 'AI for IA - Event Dashboard & Raffle System',
    description: 'Professional event management system with QR-based check-in and transparent raffle system for academic conferences.',
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950 dark:to-purple-950">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI for IA Event Dashboard
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8">
            Professional event management system with QR-based check-in and transparent raffle prize drawing
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg">
              <Link href="/transparency">
                View Transparency <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg">
              <Link href="/login">
                Admin Login
              </Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
          <Card>
            <CardHeader>
              <CheckCircle2 className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>QR-Based Check-In</CardTitle>
              <CardDescription>
                Fast and efficient attendee check-in using QR code scanning
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Award className="h-10 w-10 text-yellow-600 mb-2" />
              <CardTitle>Raffle System</CardTitle>
              <CardDescription>
                Fair and transparent prize drawing system for event attendees
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Real-Time Analytics</CardTitle>
              <CardDescription>
                Track check-ins, attendance, and event metrics in real-time
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>Security First</CardTitle>
              <CardDescription>
                Secure authentication and role-based access control
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-10 w-10 text-orange-600 mb-2" />
              <CardTitle>Attendee Management</CardTitle>
              <CardDescription>
                Comprehensive attendee database with import/export capabilities
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-red-600 mb-2" />
              <CardTitle>Public Transparency</CardTitle>
              <CardDescription>
                Public transparency page showing all winners and check-in logs
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center max-w-2xl mx-auto">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
            <CardHeader>
              <CardTitle className="text-3xl text-white">
                Ready to streamline your event?
              </CardTitle>
              <CardDescription className="text-white/90 text-lg">
                View our public transparency page or contact us to learn more about using this system for your academic conference.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" variant="secondary" className="text-lg">
                <Link href="/transparency">
                  View Transparency Page <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
