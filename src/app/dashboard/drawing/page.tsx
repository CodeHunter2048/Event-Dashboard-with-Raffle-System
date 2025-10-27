'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Confetti } from '@/components/confetti';
import { Award, Check, Redo, Users, Trophy, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Firestore-compatible interfaces
interface Attendee {
  id: string; 
  name: string;
  organization: string;
  avatar: number;
  checkedIn: boolean;
}

interface Prize {
  id: string; 
  name: string;
  description: string;
  tier: string;
  quantity: number;
  remaining: number;
}

interface Winner {
  attendee: Attendee;
  prize: Prize;
  timestamp: string;
}

type DrawingState = 'idle' | 'drawing' | 'revealed';

export default function DrawingPage() {
  const { toast } = useToast();
  const [allPrizes, setAllPrizes] = useState<Prize[]>([]);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [drawingState, setDrawingState] = useState<DrawingState>('idle');
  const [winner, setWinner] = useState<Attendee | null>(null);
  const [eligiblePool, setEligiblePool] = useState<Attendee[]>([]);
  const [shuffledNames, setShuffledNames] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [winnersList, setWinnersList] = useState<Winner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showRedrawConfirm, setShowRedrawConfirm] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(false);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({ 
        title: "Back Online", 
        description: "Connection restored. Data will sync automatically.",
        variant: "default"
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({ 
        title: "Offline Mode", 
        description: "You can continue drawing. Changes will sync when connection is restored.",
        variant: "default"
      });
    };

    // Set initial state
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Set up real-time listeners for all data
  useEffect(() => {
    if (!db) return;

    setIsLoading(true);
    const database = db;

    // Real-time listener for prizes
    const prizesQuery = query(collection(database, 'prizes'), orderBy('name'));
    const unsubscribePrizes = onSnapshot(
      prizesQuery,
      (snapshot) => {
        const prizesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Prize[];
        setAllPrizes(prizesData);
      },
      (error) => {
        console.error("Error fetching prizes:", error);
        if (error.code !== 'permission-denied') {
          toast({ title: "Error", description: "Failed to load prizes.", variant: "destructive" });
        }
      }
    );

    // Real-time listener for checked-in attendees and winners (to calculate eligible pool)
    const attendeesQuery = query(collection(database, 'attendees'), where('checkedIn', '==', true));
    const winnersQuery = query(collection(database, 'winners'));

    const unsubscribeAttendees = onSnapshot(
      attendeesQuery,
      (attendeesSnapshot) => {
        const checkedInAttendees = attendeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Attendee[];

        // Also listen to winners to calculate eligible pool
        const unsubscribeWinners = onSnapshot(
          winnersQuery,
          (winnersSnapshot) => {
            const winnerAttendeeIds = new Set(winnersSnapshot.docs.map(doc => doc.data().attendeeId));
            const eligibleAttendees = checkedInAttendees.filter(attendee => !winnerAttendeeIds.has(attendee.id));
            setEligiblePool(eligibleAttendees);
            setIsLoading(false);
          },
          (error) => {
            console.error("Error fetching winners for eligible pool:", error);
            if (error.code !== 'permission-denied') {
              setIsLoading(false);
            }
          }
        );

        return unsubscribeWinners;
      },
      (error) => {
        console.error("Error fetching attendees:", error);
        if (error.code !== 'permission-denied') {
          toast({ title: "Error", description: "Failed to load attendees.", variant: "destructive" });
        }
        setIsLoading(false);
      }
    );

    // Real-time listener for recent winners display
    const recentWinnersQuery = query(collection(database, 'winners'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeRecentWinners = onSnapshot(
      recentWinnersQuery,
      (winnersSnapshot) => {
        // Get current prizes and attendees to map winner data
        const winnersData = winnersSnapshot.docs.map(doc => {
          const data = doc.data();
          
          // Use data from the winner doc itself for display
          const attendee: Attendee = { 
            id: data.attendeeId, 
            name: data.attendeeName || 'Unknown', 
            organization: data.attendeeOrganization || '', 
            avatar: data.attendeeAvatar || 1, 
            checkedIn: true 
          };
          
          const prize: Prize = { 
            id: data.prizeId, 
            name: data.prizeName || 'Unknown Prize', 
            tier: data.prizeTier || 'Unknown', 
            remaining: 0, 
            quantity: 0, 
            description: data.prizeDescription || '' 
          };
          
          return { 
            attendee, 
            prize, 
            timestamp: data.timestamp?.toDate ? new Date(data.timestamp.toDate()).toISOString() : new Date().toISOString() 
          };
        }) as Winner[];
        
        setWinnersList(winnersData);
      },
      (error) => {
        console.error("Error fetching recent winners:", error);
        if (error.code !== 'permission-denied') {
          toast({ title: "Error", description: "Failed to load recent winners.", variant: "destructive" });
        }
      }
    );

    // Cleanup all listeners on unmount
    return () => {
      unsubscribePrizes();
      unsubscribeAttendees();
      unsubscribeRecentWinners();
    };
  }, [toast]);

  const handlePrizeChange = (prizeId: string) => {
    const prize = allPrizes.find(p => p.id === prizeId);
    setSelectedPrize(prize || null);
    resetDraw();
  };

  const startDrawing = () => {
    if (!selectedPrize || eligiblePool.length === 0 || (selectedPrize?.remaining ?? 0) <= 0) {
      return;
    }
    setDrawingState('drawing');
    setShowConfetti(false);
    setIsModalOpen(true);
    
    // Build a longer, lively sequence of names that ends with the winner
    // Ensure we always have enough entries to animate even with a tiny pool
    const pool = eligiblePool.length > 0 ? eligiblePool : [];
    const finalWinner = pool[Math.floor(Math.random() * pool.length)];
    setWinner(finalWinner);

    const picks: string[] = [];
    const targetLength = Math.max(40, Math.min(80, pool.length * 3));
    for (let i = 0; i < targetLength - 1; i++) {
      const p = pool[Math.floor(Math.random() * pool.length)];
      picks.push(p.name);
    }
    // Guarantee the last item is the chosen winner
    picks.push(finalWinner.name);
    setShuffledNames(picks);

    setTimeout(() => {
      setDrawingState('revealed');
      setShowConfetti(true);
    }, 4000); 
  };

  const confirmWinner = async () => {
    if (!winner || !selectedPrize || isConfirming) return;
    if ((selectedPrize?.remaining ?? 0) <= 0) {
      toast({ title: 'Out of Stock', description: 'This prize has no remaining stock.', variant: 'destructive' });
      return;
    }

    setIsConfirming(true);
    
    // Show offline warning if not connected
    if (!isOnline) {
      setPendingSync(true);
    }
    
    try {
      const database = db!; // Firestore is guaranteed in client env
      const batch = writeBatch(database);

      // 1. Create a new winner document
      const winnerRef = doc(collection(database, "winners"));
      batch.set(winnerRef, {
        attendeeId: winner.id,
        attendeeName: winner.name,
        attendeeOrganization: winner.organization,
        attendeeAvatar: winner.avatar,
        prizeId: selectedPrize.id,
        prizeName: selectedPrize.name,
        prizeTier: selectedPrize.tier,
        prizeDescription: selectedPrize.description,
        timestamp: serverTimestamp(),
        claimed: false,
      });

      // 2. Update the prize's remaining quantity
      const prizeRef = doc(database, "prizes", selectedPrize.id);
      batch.update(prizeRef, { remaining: selectedPrize.remaining - 1 });
      
      // Commit the batch (will be queued if offline)
      await batch.commit();

      // 3. Update local state optimistically
      // Update the prize quantity locally without fetching
      setAllPrizes(prevPrizes => 
        prevPrizes.map(p => 
          p.id === selectedPrize.id 
            ? { ...p, remaining: Math.max(0, p.remaining - 1) }
            : p
        )
      );
      
      // Update the selected prize
      setSelectedPrize(prev => prev ? { ...prev, remaining: Math.max(0, prev.remaining - 1) } : null);
      
      // Remove winner from eligible pool
      setEligiblePool(prevPool => prevPool.filter(a => a.id !== winner.id));
      
      // Add to winners list optimistically
      const newWinner: Winner = {
        attendee: winner,
        prize: selectedPrize,
        timestamp: new Date().toISOString()
      };
      setWinnersList(prev => [newWinner, ...prev].slice(0, 10));

      toast({ 
        title: "Winner Confirmed!", 
        description: `${winner.name} won the ${selectedPrize.name}.${!isOnline ? ' (Will sync when online)' : ''}` 
      });
      
      setIsConfirmed(true);
      
      // Data will auto-sync via real-time listeners
      if (isOnline) {
        setPendingSync(false);
      }

    } catch (error) {
      console.error("Error confirming winner:", error);
      
      // If offline, the write is cached by Firebase
      if (!isOnline) {
        // Still update local state optimistically
        setAllPrizes(prevPrizes => 
          prevPrizes.map(p => 
            p.id === selectedPrize.id 
              ? { ...p, remaining: Math.max(0, p.remaining - 1) }
              : p
          )
        );
        
        setSelectedPrize(prev => prev ? { ...prev, remaining: Math.max(0, prev.remaining - 1) } : null);
        setEligiblePool(prevPool => prevPool.filter(a => a.id !== winner.id));
        
        const newWinner: Winner = {
          attendee: winner,
          prize: selectedPrize,
          timestamp: new Date().toISOString()
        };
        setWinnersList(prev => [newWinner, ...prev].slice(0, 10));
        
        toast({ 
          title: "Saved Offline", 
          description: "Winner will be synced automatically when connection returns.",
          variant: "default"
        });
        setIsConfirmed(true);
      } else {
        toast({ 
          title: "Error", 
          description: "Could not save the winner. Please try again.", 
          variant: "destructive" 
        });
        setIsConfirming(false);
      }
    }
  };

  const redraw = () => {
    if (!winner) return;
    setShowRedrawConfirm(false);
    setEligiblePool(pool => pool.filter(p => p.id !== winner.id));
    resetDraw(false); 
    startDrawing();
  };

  const handleRedrawClick = () => {
    setShowRedrawConfirm(true);
  };

  const cancelRedraw = () => {
    setShowRedrawConfirm(false);
  };

  const drawAgain = () => {
    resetDraw();
    setTimeout(() => startDrawing(), 100);
  };
  
  const resetDraw = (closeModal = true) => {
    setDrawingState('idle');
    setWinner(null);
    setShowConfetti(false);
    setIsConfirming(false);
    setIsConfirmed(false);
    setShowRedrawConfirm(false);
    if (closeModal) {
      setIsModalOpen(false);
    }
  }

  // Improved, smoother name shuffle with easing and pixel-accurate movement
  function NameCarousel() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const itemRef = useRef<HTMLDivElement | null>(null);
    const [offsetPx, setOffsetPx] = useState(0);

    // Measure a single item height to compute pixel offset precisely
    const itemHeight = useMemo(() => {
      return itemRef.current?.offsetHeight ?? 128; // fallback to 8rem
    }, [itemRef.current?.offsetHeight]);

    useEffect(() => {
      if (drawingState !== 'drawing' || shuffledNames.length === 0) return;

      let rafId = 0;
      const totalSteps = Math.max(1, shuffledNames.length - 1);
      const duration = 3200; // ms
      const start = performance.now();

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = easeOutCubic(t);
        const progress = eased * totalSteps;
        setOffsetPx(progress * itemHeight);
        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          // Snap to the final item
          setOffsetPx(totalSteps * itemHeight);
        }
      };

      rafId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId);
    }, [drawingState, shuffledNames, itemHeight]);

    // Safety: duplicate a short list so animation doesn't look empty
    const namesForDisplay = useMemo(() => {
      if (shuffledNames.length >= 6) return shuffledNames;
      const dup: string[] = [];
      for (let i = 0; i < 10; i++) {
        dup.push(shuffledNames[i % Math.max(1, shuffledNames.length)] ?? '');
      }
      return dup;
    }, [shuffledNames]);

    return (
      <div ref={containerRef} className="h-40 md:h-48 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-background to-transparent z-10"/>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent z-10"/>
        <div
          className="will-change-transform"
          style={{ transform: `translateY(-${offsetPx}px)` }}
        >
          {namesForDisplay.map((name, index) => (
            <div
              key={index}
              ref={index === 0 ? itemRef : null}
              className="h-40 md:h-48 flex items-center justify-center text-4xl md:text-6xl font-extrabold tracking-wide select-none"
            >
              <span className="text-primary-foreground drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Loading Raffle Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Network Status Indicator */}
      {!isOnline && (
        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Offline Mode</AlertTitle>
          <AlertDescription>
            You can continue drawing. All changes will be saved locally and synced automatically when connection is restored.
          </AlertDescription>
        </Alert>
      )}
      
      {pendingSync && isOnline && (
        <Alert>
          <Wifi className="h-4 w-4 animate-pulse" />
          <AlertTitle>Syncing...</AlertTitle>
          <AlertDescription>
            Synchronizing your offline changes with the server.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Select a Prize</CardTitle>
            <CardDescription>Choose which prize you want to draw for.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handlePrizeChange} value={selectedPrize?.id || ''} disabled={drawingState !== 'idle'}>
              <SelectTrigger>
                <SelectValue placeholder="Select a prize..." />
              </SelectTrigger>
              <SelectContent>
                {allPrizes.filter(p => p.remaining > 0).map(prize => (
                  <SelectItem key={prize.id} value={prize.id}>
                    {prize.name} ({prize.tier}) - {prize.remaining} left
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedPrize && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Award />Prize Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <h3 className="text-xl font-bold">{selectedPrize.name}</h3>
              <p className="text-muted-foreground">{selectedPrize.description}</p>
              <div className='grid grid-cols-2 gap-4'>
                <p><span className="font-bold">{selectedPrize.remaining}</span> of {selectedPrize.quantity} remaining</p>
                <div>
                  <div className="flex items-center gap-2"><Users />Eligible Pool</div>
                  <p className="text-muted-foreground mt-1">{eligiblePool.length} people are eligible to win.</p>
                </div>
              </div>
               <Button
                 className="w-full mt-4"
                 size="lg"
                 onClick={startDrawing}
                 disabled={!selectedPrize || drawingState !== 'idle' || eligiblePool.length === 0 || (selectedPrize?.remaining ?? 0) <= 0}
               >
                 {eligiblePool.length === 0
                   ? 'No Eligible Attendees'
                   : (selectedPrize?.remaining ?? 0) <= 0
                     ? 'Out of Stock'
                     : 'Start Draw'}
               </Button>
            </CardContent>
          </Card>
        )}
      </div>

       <Card>
            <CardHeader>
                <CardTitle>Recent Winners</CardTitle>
                <CardDescription>List of recently drawn winners from the database.</CardDescription>
            </CardHeader>
            <CardContent>
                {winnersList.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No winners yet.</p>
                ) : (
                    <ul className="space-y-4">
                        {winnersList.map((w, index) => {
                             const avatar = PlaceHolderImages.find(p => p.id === `avatar${w.attendee.avatar}`);
                            return (
                            <li key={index} className="flex items-center gap-4">
                                <Avatar>
                                    {avatar && <AvatarImage src={avatar.imageUrl} alt={w.attendee.name}/>}
                                    <AvatarFallback>{w.attendee.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <div className="flex-grow">
                                    <p className="font-semibold">{w.attendee.name}</p>
                                    <p className="text-sm text-muted-foreground">{w.attendee.organization}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-sm">{w.prize.name}</p>
                                    <p className="text-xs text-muted-foreground">{w.prize.tier} Prize</p>
                                </div>
                            </li>
                        )})}
                    </ul>
                )}
            </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={(isOpen) => { if (!isOpen) resetDraw(); else setIsModalOpen(true);}}>
            <DialogContent className="sm:max-w-3xl h-3/4 flex flex-col p-0 gap-0">
                 {showConfetti && <Confetti />}
                 <DialogHeader className="p-4 flex-shrink-0 border-b">
                    <DialogTitle className="text-2xl font-bold">{selectedPrize?.name}</DialogTitle>
                 </DialogHeader>
                <div className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-background/80 overflow-hidden">
                    {drawingState === 'idle' && <div className="flex items-center justify-center h-full"><Trophy className="h-32 w-32 text-yellow-400 animate-pulse"/></div>}
                    {drawingState === 'drawing' && <NameCarousel />}
                    {drawingState === 'revealed' && winner && (
                        <div className="text-center animate-in fade-in zoom-in-90 flex flex-col items-center justify-center">
                            <p className="text-lg text-accent font-semibold">WINNER!</p>
                             <div className="flex items-center gap-4 mt-4">
                                <Avatar className="h-24 w-24 border-4 border-primary">
                                    <AvatarImage src={PlaceHolderImages.find(p => p.id === `avatar${winner.avatar}`)?.imageUrl} alt={winner.name} />
                                    <AvatarFallback className="text-4xl">{winner.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-4xl font-bold text-white">{winner.name}</h3>
                                    <p className="text-muted-foreground text-lg">{winner.organization}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0 p-4 bg-muted/50 border-t">
                    {drawingState === 'revealed' && !isConfirmed && (
                        <>
                        {!showRedrawConfirm ? (
                            <div className="grid grid-cols-2 gap-4">
                                <Button size="lg" variant="outline" onClick={handleRedrawClick} disabled={isConfirming}>
                                    <Redo className="mr-2 h-4 w-4" /> Redraw
                                </Button>
                                <Button size="lg" onClick={confirmWinner} disabled={isConfirming}>
                                    {isConfirming ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Confirming...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-4 w-4" /> Confirm Winner
                                        </>
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-center text-sm text-muted-foreground">
                                    Are you sure you want to redraw? This will exclude <span className="font-semibold">{winner?.name}</span> from the pool.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <Button size="lg" variant="outline" onClick={cancelRedraw}>
                                        Cancel
                                    </Button>
                                    <Button size="lg" variant="destructive" onClick={redraw}>
                                        Yes, Redraw
                                    </Button>
                                </div>
                            </div>
                        )}
                        </>
                    )}
                    {drawingState === 'revealed' && isConfirmed && (
                        <div className="grid grid-cols-2 gap-4">
                            <Button size="lg" variant="outline" onClick={() => resetDraw()}>
                                Close
                            </Button>
                            <Button size="lg" onClick={drawAgain}>
                                <Trophy className="mr-2 h-4 w-4" /> Draw Again
                            </Button>
                        </div>
                    )}
                     {drawingState === 'drawing' && (
                        <Button className="w-full" size="lg" disabled>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                            Drawing...
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
