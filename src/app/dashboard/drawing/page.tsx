'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Confetti } from '@/components/confetti';
import { Award, Check, Redo, Users, Trophy, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, orderBy, limit } from 'firebase/firestore';
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

  // Fetches all necessary data from Firestore on initial load
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    
    // Create a timeout promise to prevent hanging when offline
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Fetch timeout')), 10000); // 10 second timeout
    });
    
    try {
      // Race between data fetch and timeout
      await Promise.race([
        (async () => {
          // 1. Fetch all prizes
          const prizesQuery = query(collection(db, 'prizes'), orderBy('name'));
          const prizesSnapshot = await getDocs(prizesQuery);
          const prizesData = prizesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Prize[];
          setAllPrizes(prizesData);

          // 2. Fetch all checked-in attendees
          const attendeesQuery = query(collection(db, 'attendees'), where('checkedIn', '==', true));
          const attendeesSnapshot = await getDocs(attendeesQuery);
          const checkedInAttendees = attendeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Attendee[];

          // 3. Fetch all past winners to determine who is ineligible
          const winnersQuery = query(collection(db, 'winners'));
          const winnersSnapshot = await getDocs(winnersQuery);
          const winnerAttendeeIds = new Set(winnersSnapshot.docs.map(doc => doc.data().attendeeId));
          
          // 4. Calculate the eligible pool
          const eligibleAttendees = checkedInAttendees.filter(attendee => !winnerAttendeeIds.has(attendee.id));
          setEligiblePool(eligibleAttendees);
          
          // 5. Fetch recent winners for display
          const recentWinnersQuery = query(collection(db, 'winners'), orderBy('timestamp', 'desc'), limit(10));
          const recentWinnersSnapshot = await getDocs(recentWinnersQuery);
          const recentWinnersData = recentWinnersSnapshot.docs.map(doc => {
            const data = doc.data();
            const attendee = checkedInAttendees.find(a => a.id === data.attendeeId) || { id: data.attendeeId, name: data.attendeeName, organization: data.attendeeOrganization, avatar: 1, checkedIn: true };
            const prize = prizesData.find(p => p.id === data.prizeId) || { id: data.prizeId, name: data.prizeName, tier: 'Unknown', remaining: 0, quantity: 0, description: '' };
            return { attendee, prize, timestamp: new Date(data.timestamp?.toDate()).toISOString() };
          }) as Winner[];
          setWinnersList(recentWinnersData);
        })(),
        timeoutPromise
      ]);

    } catch (error: any) {
      if (error.message === 'Fetch timeout') {
        console.warn("Data fetch timed out - using cached data");
        if (!isOnline) {
          toast({ 
            title: "Using Cached Data", 
            description: "Loading from local cache. Connect to internet for latest updates.",
            variant: "default"
          });
        }
      } else {
        console.error("Error fetching data:", error);
        toast({ title: "Error", description: "Failed to load raffle data from the database.", variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast, isOnline]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrizeChange = (prizeId: string) => {
    const prize = allPrizes.find(p => p.id === prizeId);
    setSelectedPrize(prize || null);
    resetDraw();
  };

  const startDrawing = () => {
    if (!selectedPrize || eligiblePool.length === 0) return;
    setDrawingState('drawing');
    setShowConfetti(false);
    setIsModalOpen(true);
    
    // Shuffle animation logic
    let tempShuffled = [...eligiblePool].sort(() => Math.random() - 0.5).slice(0, 20);
    const finalWinner = eligiblePool[Math.floor(Math.random() * eligiblePool.length)];
    tempShuffled.push(finalWinner);
    setShuffledNames(tempShuffled.map(a => a.name));
    setWinner(finalWinner);

    setTimeout(() => {
      setDrawingState('revealed');
      setShowConfetti(true);
    }, 4000); 
  };

  const confirmWinner = async () => {
    if (!winner || !selectedPrize || isConfirming) return;

    setIsConfirming(true);
    
    // Show offline warning if not connected
    if (!isOnline) {
      setPendingSync(true);
    }
    
    try {
      const batch = writeBatch(db);

      // 1. Create a new winner document
      const winnerRef = doc(collection(db, "winners"));
      batch.set(winnerRef, {
        attendeeId: winner.id,
        attendeeName: winner.name,
        attendeeOrganization: winner.organization,
        prizeId: selectedPrize.id,
        prizeName: selectedPrize.name,
        timestamp: serverTimestamp(),
        claimed: false,
      });

      // 2. Update the prize's remaining quantity
      const prizeRef = doc(db, "prizes", selectedPrize.id);
      batch.update(prizeRef, { remaining: selectedPrize.remaining - 1 });
      
      // Commit the batch (will be queued if offline)
      await batch.commit();

      // 3. Update local state optimistically
      // Update the prize quantity locally without fetching
      setAllPrizes(prevPrizes => 
        prevPrizes.map(p => 
          p.id === selectedPrize.id 
            ? { ...p, remaining: p.remaining - 1 }
            : p
        )
      );
      
      // Update the selected prize
      setSelectedPrize(prev => prev ? { ...prev, remaining: prev.remaining - 1 } : null);
      
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
      
      // Only fetch from server if online to refresh data
      if (isOnline) {
        setPendingSync(false);
        // Fetch in background without blocking UI
        fetchData().catch(err => console.error("Background fetch error:", err));
      }

    } catch (error) {
      console.error("Error confirming winner:", error);
      
      // If offline, the write is cached by Firebase
      if (!isOnline) {
        // Still update local state optimistically
        setAllPrizes(prevPrizes => 
          prevPrizes.map(p => 
            p.id === selectedPrize.id 
              ? { ...p, remaining: p.remaining - 1 }
              : p
          )
        );
        
        setSelectedPrize(prev => prev ? { ...prev, remaining: prev.remaining - 1 } : null);
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

  const NameCarousel = useCallback(() => {
    // This component remains largely the same, no changes needed
    const [currentIndex, setCurrentIndex] = useState(0);
    useEffect(() => {
        if (drawingState !== 'drawing') return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => {
                if (prev >= shuffledNames.length - 2) {
                    clearInterval(interval);
                    return shuffledNames.length -1;
                }
                return prev + 1;
            });
        }, 100);
        return () => clearInterval(interval);
    }, [drawingState, shuffledNames]);

    const transformY = `translateY(-${currentIndex * 100}%)`;
    return (
        <div className="h-32 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-background to-transparent z-10"/>
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent z-10"/>
            <div className="transition-transform duration-100 ease-linear" style={{ transform: transformY }}>
                {shuffledNames.map((name, index) => (
                    <div key={index} className="h-32 flex items-center justify-center text-5xl md:text-7xl font-bold">{name}</div>
                ))}
            </div>
        </div>
    )
  }, [shuffledNames, drawingState]);


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
               <Button className="w-full mt-4" size="lg" onClick={startDrawing} disabled={!selectedPrize || drawingState !== 'idle' || eligiblePool.length === 0}>
                {eligiblePool.length === 0 ? 'No Eligible Attendees' : 'Start Draw'}
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
