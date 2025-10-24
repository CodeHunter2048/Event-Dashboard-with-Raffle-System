'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  CheckCircle2,
  QrCode,
  ScanLine,
  XCircle,
} from 'lucide-react';
import { Attendee, attendees } from '@/lib/data';

type ScanStatus = 'success' | 'error' | 'duplicate' | 'idle';

export default function CheckInPage() {
  const [lastScan, setLastScan] = useState<{
    status: ScanStatus;
    attendee: Attendee | null;
    message: string;
  }>({ status: 'idle', attendee: null, message: 'Scan an attendee QR code to begin' });

  const handleManualCheckin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const id = formData.get('attendeeId') as string;
    const attendee = attendees.find(a => a.id.toLowerCase() === id.toLowerCase());

    if (!attendee) {
      setLastScan({ status: 'error', attendee: null, message: `Invalid ID: Attendee with ID "${id}" not found.` });
      return;
    }

    if (attendee.checkedIn) {
      setLastScan({ status: 'duplicate', attendee, message: `Already checked in at ${new Date(attendee.checkInTime!).toLocaleTimeString()}` });
      return;
    }
    
    // In a real app, you'd update the backend here.
    attendee.checkedIn = true;
    attendee.checkInTime = new Date().toISOString();
    setLastScan({ status: 'success', attendee, message: 'Check-in successful!' });
  };


  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>QR Code Scanner</CardTitle>
          <CardDescription>
            Point the camera at an attendee's QR code.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center bg-muted/20 rounded-lg m-6 mt-0">
          <div className="flex flex-col items-center gap-4 text-center text-muted-foreground animate-pulse">
            <ScanLine className="h-32 w-32" />
            <p>Ready to Scan</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Last Scan Status</CardTitle>
          </CardHeader>
          <CardContent>
            {lastScan.status === 'idle' && (
              <div className="flex flex-col items-center justify-center text-center p-8 rounded-lg bg-muted/20">
                <QrCode className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{lastScan.message}</p>
              </div>
            )}
            {lastScan.status === 'success' && lastScan.attendee && (
              <div className="p-6 rounded-lg bg-green-900/40 border border-green-500/50">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-8 w-8 text-green-400 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{lastScan.attendee.name}</h3>
                    <p className="text-green-300">{lastScan.message}</p>
                    <p className="text-sm text-green-400/80">{lastScan.attendee.organization} - {lastScan.attendee.role}</p>
                  </div>
                </div>
              </div>
            )}
             {(lastScan.status === 'error' || lastScan.status === 'duplicate') && (
              <div className="p-6 rounded-lg bg-red-900/40 border border-red-500/50">
                <div className="flex items-start gap-4">
                  {lastScan.status === 'error' ? 
                    <XCircle className="h-8 w-8 text-red-400 mt-1" /> :
                    <AlertCircle className="h-8 w-8 text-yellow-400 mt-1" />
                  }
                  <div>
                    <h3 className="text-lg font-semibold text-white">{lastScan.attendee?.name || 'Unknown Attendee'}</h3>
                    <p className={lastScan.status === 'error' ? 'text-red-300' : 'text-yellow-300'}>{lastScan.message}</p>
                     {lastScan.attendee && <p className="text-sm text-red-400/80">{lastScan.attendee.organization} - {lastScan.attendee.role}</p>}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual Check-in</CardTitle>
            <CardDescription>
              If the QR code is not working, enter the attendee ID here.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleManualCheckin}>
            <CardContent>
              <Label htmlFor="attendeeId">Attendee ID</Label>
              <Input id="attendeeId" name="attendeeId" placeholder="e.g., A001" />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">Check In</Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
