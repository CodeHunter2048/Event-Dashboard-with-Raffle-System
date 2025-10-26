'use client';

import { useState, useEffect, useRef } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  CheckCircle2,
  QrCode,
  XCircle,
  Camera,
  CameraOff,
} from 'lucide-react';
import { Attendee } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { Html5Qrcode } from 'html5-qrcode';

type ScanStatus = 'success' | 'error' | 'duplicate' | 'idle';

interface ScanLog {
  attendeeId: string;
  attendeeName: string;
  scannedBy: string;
  scannedAt: any;
  action: 'checked-in' | 'already-checked-in' | 'not-found';
}

export default function CheckInPage() {
  const { toast } = useToast();
  const [lastScan, setLastScan] = useState<{
    status: ScanStatus;
    attendee: Attendee | null;
    message: string;
  }>({ status: 'idle', attendee: null, message: 'Scan an attendee QR code to begin' });

  const [pendingAttendee, setPendingAttendee] = useState<Attendee | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false); // Flag to prevent multiple scans
  const currentUser = 'Admin'; // In real app, get from auth context

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } else {
          setHasCameraPermission(false);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use the scanner.',
        });
      }
    };

    getCameraPermission();

    return () => {
      // Cleanup on unmount
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, [toast]);

  const startScanner = async () => {
    if (!hasCameraPermission) {
      toast({
        variant: 'destructive',
        title: 'Camera Required',
        description: 'Camera access is needed to start the scanner.',
      });
      return;
    }
    
    setLoading(true);
    setScanning(true);
    
    // Wait for React to render the qr-reader element
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const element = document.getElementById('qr-reader');
      if (!element) {
        throw new Error('Scanner element not found in DOM');
      }
      
      const html5QrCode = new Html5Qrcode('qr-reader', {
        formatsToSupport: [0], // 0 for QR_CODE
        verbose: false,
      });
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        async (decodedText) => {
          // Prevent processing multiple scans simultaneously
          if (!isProcessingRef.current) {
            isProcessingRef.current = true;
            await handleQRCodeScan(decodedText);
          }
        },
        (errorMessage) => {
          // Continuous scanning error, can be ignored.
        }
      );
    } catch (error: any) {
      console.error('Error starting scanner:', error);
      setScanning(false);
      toast({
        variant: 'destructive',
        title: 'Scanner Error',
        description: error.message || 'Could not start the QR code scanner.',
      });
    } finally {
      setLoading(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setScanning(false);
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setScanning(false);
  };

  const handleQRCodeScan = async (attendeeId: string) => {
    if (!db) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Database not initialized.',
      });
      return;
    }

    try {
      const attendeeRef = doc(db, 'attendees', attendeeId);
      const attendeeDoc = await getDoc(attendeeRef);

      if (!attendeeDoc.exists()) {
        setLastScan({ status: 'error', attendee: null, message: `Invalid QR Code: Attendee not found.` });
        await logScan(attendeeId, 'Unknown', 'not-found');
        toast({ variant: 'destructive', title: 'Not Found', description: 'Attendee not found in database.' });
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 2000);
        return;
      }

      const attendeeData = attendeeDoc.data() as Attendee;
      const attendee: Attendee = { ...attendeeData, id: attendeeDoc.id };

      if (attendee.checkedIn) {
        setLastScan({ status: 'duplicate', attendee, message: `Already checked in at ${new Date(attendee.checkInTime!).toLocaleString()}` });
        await logScan(attendeeDoc.id, attendee.name, 'already-checked-in');
        toast({ variant: 'default', title: 'Already Checked In', description: `${attendee.name} was already checked in.` });
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 2000);
        return;
      }

      setPendingAttendee(attendee);
      setConfirmDialogOpen(true);

    } catch (error: any) {
      console.error('Error processing QR code:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to process QR code.' });
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 2000);
    }
  };

  const confirmCheckIn = async () => {
    if (!pendingAttendee || !db) return;

    try {
      const attendeeRef = doc(db, 'attendees', pendingAttendee.id);
      await updateDoc(attendeeRef, {
        checkedIn: true,
        checkInTime: serverTimestamp(),
      });

      await logScan(pendingAttendee.id, pendingAttendee.name, 'checked-in');

      setLastScan({ status: 'success', attendee: { ...pendingAttendee, checkedIn: true, checkInTime: new Date().toISOString() }, message: 'Check-in successful!' });

      toast({ title: 'Success', description: `${pendingAttendee.name} checked in successfully!` });
      setConfirmDialogOpen(false);
      setPendingAttendee(null);
      
      // Allow next scan after a short delay
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1000);

    } catch (error: any) {
      console.error('Error checking in attendee:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to check in attendee.' });
    }
  };

  const cancelCheckIn = () => {
    setConfirmDialogOpen(false);
    setPendingAttendee(null);
    
    // Allow next scan immediately when cancelled
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 500);
  };

  const logScan = async (attendeeId: string, attendeeName: string, action: 'checked-in' | 'already-checked-in' | 'not-found') => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'scanlogs'), {
        attendeeId,
        attendeeName,
        scannedBy: currentUser,
        scannedAt: serverTimestamp(),
        action,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging scan:', error);
    }
  };

  const handleManualCheckin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database not initialized.' });
      return;
    }
    const formData = new FormData(event.currentTarget);
    const id = formData.get('attendeeId') as string;

    try {
      const attendeesRef = collection(db, 'attendees');
      const q = query(attendeesRef, where('__name__', '==', id));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setLastScan({ status: 'error', attendee: null, message: `Invalid ID: Attendee with ID "${id}" not found.` });
        await logScan(id, 'Unknown', 'not-found');
        return;
      }
      const attendeeDoc = querySnapshot.docs[0];
      const attendeeData = attendeeDoc.data() as Attendee;
      const attendee: Attendee = { ...attendeeData, id: attendeeDoc.id };

      if (attendee.checkedIn) {
        setLastScan({ status: 'duplicate', attendee, message: `Already checked in at ${new Date(attendee.checkInTime!).toLocaleString()}` });
        await logScan(attendeeDoc.id, attendee.name, 'already-checked-in');
        return;
      }
      const attendeeRef = doc(db, 'attendees', attendeeDoc.id);
      await updateDoc(attendeeRef, {
        checkedIn: true,
        checkInTime: serverTimestamp(),
      });
      await logScan(attendeeDoc.id, attendee.name, 'checked-in');
      setLastScan({ status: 'success', attendee: { ...attendee, checkedIn: true, checkInTime: new Date().toISOString() }, message: 'Check-in successful!' });
      toast({ title: 'Success', description: `${attendee.name} checked in successfully!` });
      event.currentTarget.reset();
    } catch (error: any) {
      console.error('Error with manual check-in:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to check in attendee.' });
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>QR Code Scanner</CardTitle>
            <CardDescription>Point the camera at an attendee's QR code.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col items-center justify-center bg-muted/20 rounded-lg m-6 mt-0">
            <div id="qr-reader" className={scanning ? 'w-full max-w-lg' : 'hidden'}></div>

            {!scanning && hasCameraPermission !== false && (
              <div className="flex flex-col items-center gap-4 text-center">
                <Camera className="h-32 w-32 text-muted-foreground" />
                <Button onClick={startScanner} size="lg" disabled={loading}>
                  <Camera className="h-5 w-5 mr-2" />
                  {loading ? 'Starting...' : 'Start Scanner'}
                </Button>
              </div>
            )}
            
            {scanning && (
              <Button onClick={stopScanner} variant="destructive" size="lg" className="mt-4">
                <CameraOff className="h-5 w-5 mr-2" />
                Stop Scanner
              </Button>
            )}

            {hasCameraPermission === false && (
              <Alert variant="destructive">
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>
                  Please allow camera access to use this feature. You may need to refresh the page after granting permission.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Last Scan Status</CardTitle></CardHeader>
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
                    {lastScan.status === 'error' ? (
                      <XCircle className="h-8 w-8 text-red-400 mt-1" />
                    ) : (
                      <AlertCircle className="h-8 w-8 text-yellow-400 mt-1" />
                    )}
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
              <CardDescription>If the QR code is not working, enter the attendee ID here.</CardDescription>
            </CardHeader>
            <form onSubmit={handleManualCheckin}>
              <CardContent>
                <Label htmlFor="attendeeId">Attendee ID</Label>
                <Input id="attendeeId" name="attendeeId" placeholder="e.g., aBcDeFg12345" />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">Check In</Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Check-In</AlertDialogTitle>
            <AlertDialogDescription>Please verify the attendee information before confirming check-in.</AlertDialogDescription>
          </AlertDialogHeader>
          {pendingAttendee && (
            <div className="py-4 space-y-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2"><span className="text-sm font-semibold text-muted-foreground">Name:</span><span className="text-lg font-bold">{pendingAttendee.name}</span></div>
                <div className="flex items-center gap-2"><span className="text-sm font-semibold text-muted-foreground">Organization:</span><span className="text-base">{pendingAttendee.organization}</span></div>
                <div className="flex items-center gap-2"><span className="text-sm font-semibold text-muted-foreground">Role:</span><span className="text-base">{pendingAttendee.role}</span></div>
                <div className="flex items-center gap-2"><span className="text-sm font-semibold text-muted-foreground">ID:</span><span className="text-sm font-mono">{pendingAttendee.id}</span></div>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelCheckIn}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCheckIn}>Confirm Check-In</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
