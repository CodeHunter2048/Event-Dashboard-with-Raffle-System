'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Confetti } from '@/components/confetti';
import { Award, Check, Redo, Users, Trophy, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, doc, writeBatch, serverTimestamp, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// Firestore-compatible interfaces
interface Attendee {
  id: string; 
  name: string;
  organization: string;
  avatar: number;
  checkedIn: boolean;
  isEligible?: boolean; // Track if attendee is eligible for drawing
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
  const [drawQuantity, setDrawQuantity] = useState(1);
  const [batchWinners, setBatchWinners] = useState<Attendee[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [confettiKey, setConfettiKey] = useState(0);

  // Fetch fresh selected prize and eligible attendees from Firestore
  const syncWithDatabase = async (): Promise<{ eligible: Attendee[]; prize: Prize | null }> => {
    if (!db) return { eligible: eligiblePool, prize: selectedPrize };
    try {
      const database = db;

      // Refresh selected prize if one is chosen
      let freshPrize: Prize | null = selectedPrize;
      if (selectedPrize) {
        const prizeRef = doc(database, 'prizes', selectedPrize.id);
        const prizeSnap = await getDoc(prizeRef);
        if (prizeSnap.exists()) {
          freshPrize = { id: prizeSnap.id, ...(prizeSnap.data() as Omit<Prize, 'id'>) } as Prize;
          setSelectedPrize(freshPrize);
        }
      }

      // Fresh eligible attendees (checked-in + eligible) minus anyone who already won
      const attendeesSnap = await getDocs(
        query(
          collection(database, 'attendees'),
          where('checkedIn', '==', true),
          where('isEligible', '==', true)
        )
      );
      const freshAttendees = attendeesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Attendee[];

      const winnersSnap = await getDocs(collection(database, 'winners'));
      const winnerIds = new Set(winnersSnap.docs.map(d => d.data().attendeeId));
      const freshEligible = freshAttendees.filter(a => !winnerIds.has(a.id));
      setEligiblePool(freshEligible);

      return { eligible: freshEligible, prize: freshPrize ?? null };
    } catch (e) {
      console.error('Error syncing with database:', e);
      return { eligible: eligiblePool, prize: selectedPrize };
    }
  };

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
    const attendeesQuery = query(
      collection(database, 'attendees'), 
      where('checkedIn', '==', true),
      where('isEligible', '==', true) // Only include eligible attendees
    );
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

  const maxDrawQuantity = useMemo(() => {
    if (!selectedPrize) return 1;
    return Math.min(
      selectedPrize.remaining,
      eligiblePool.length,
      10 // Cap at 10 for practical reasons
    );
  }, [selectedPrize, eligiblePool.length]);

  useEffect(() => {
    // Reset draw quantity when it exceeds max
    if (drawQuantity > maxDrawQuantity) {
      setDrawQuantity(Math.max(1, maxDrawQuantity));
    }
  }, [maxDrawQuantity, drawQuantity]);

  const startDrawing = (overridePool?: Attendee[]) => {
    if (!selectedPrize || eligiblePool.length === 0 || (selectedPrize?.remaining ?? 0) <= 0) {
      return;
    }

    // Use current eligiblePool state - create a fresh copy to avoid mutations
    const currentPool = (overridePool ?? eligiblePool).filter(attendee => attendee.isEligible !== false);
    
    if (currentPool.length === 0) {
      toast({
        title: "No Eligible Attendees",
        description: "There are no eligible attendees left in the pool.",
        variant: "destructive"
      });
      return;
    }

  const pool = [...currentPool];
    const selectedWinners: Attendee[] = [];
    const actualDrawCount = Math.min(drawQuantity, pool.length, selectedPrize.remaining);

    for (let i = 0; i < actualDrawCount; i++) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      selectedWinners.push(pool[randomIndex]);
      pool.splice(randomIndex, 1); // Remove selected winner from pool
    }

    setBatchWinners(selectedWinners);
    setCurrentBatchIndex(0);
    setDrawingState('drawing');
    setShowConfetti(false);
    setIsModalOpen(true);
    
    // Start animating the first winner
    animateWinner(selectedWinners[0]);
  };

  const animateWinner = (winnerToShow: Attendee) => {
    setWinner(winnerToShow);
    
    // Build animation sequence - ONLY use currently eligible attendees
    const pool = eligiblePool.filter(a => a.isEligible !== false && a.id !== winnerToShow.id);
    
    if (pool.length === 0) {
      // If no other eligible attendees, just show the winner
      setShuffledNames([winnerToShow.name]);
      setTimeout(() => {
        setDrawingState('revealed');
        setShowConfetti(true);
        setConfettiKey(prev => prev + 1);
      }, 1000);
      return;
    }
    
    const picks: string[] = [];
    const targetLength = Math.max(40, Math.min(80, pool.length * 3));
    for (let i = 0; i < targetLength - 1; i++) {
      const p = pool[Math.floor(Math.random() * pool.length)];
      picks.push(p.name);
    }
    picks.push(winnerToShow.name);
    setShuffledNames(picks);

    setTimeout(() => {
      setDrawingState('revealed');
      setShowConfetti(true);
      setConfettiKey(prev => prev + 1); // Force new confetti instance
    }, 4000); 
  };

  const showNextWinner = () => {
    if (currentBatchIndex < batchWinners.length - 1) {
      const nextIndex = currentBatchIndex + 1;
      setCurrentBatchIndex(nextIndex);
      setDrawingState('drawing');
      setShowConfetti(false);
      animateWinner(batchWinners[nextIndex]);
    }
  };

  const confirmWinner = async () => {
    if (!winner || !selectedPrize || isConfirming) return;
    if ((selectedPrize?.remaining ?? 0) <= 0) {
      toast({ title: 'Out of Stock', description: 'This prize has no remaining stock.', variant: 'destructive' });
      return;
    }

    setIsConfirming(true);
    
    try {
      const database = db!;
      const batch = writeBatch(database);

      // For batch draws, confirm all winners at once
      const winnersToConfirm = drawQuantity > 1 ? batchWinners : [winner];
      
      winnersToConfirm.forEach((winnerAttendee) => {
        // 1. Create a new winner document
        const winnerRef = doc(collection(database, "winners"));
        batch.set(winnerRef, {
          attendeeId: winnerAttendee.id,
          attendeeName: winnerAttendee.name,
          attendeeOrganization: winnerAttendee.organization,
          attendeeAvatar: winnerAttendee.avatar,
          prizeId: selectedPrize.id,
          prizeName: selectedPrize.name,
          prizeTier: selectedPrize.tier,
          prizeDescription: selectedPrize.description,
          timestamp: serverTimestamp(),
          claimed: false,
        });
        
        // 2. Set isEligible to false for winners so they can't win again
        const attendeeRef = doc(database, "attendees", winnerAttendee.id);
        batch.update(attendeeRef, { isEligible: false });
      });

      // 3. Update the prize's remaining quantity
      const prizeRef = doc(database, "prizes", selectedPrize.id);
      batch.update(prizeRef, { remaining: selectedPrize.remaining - winnersToConfirm.length });
      
  // Commit the batch
  await batch.commit();

  // Ensure UI reflects latest DB state (remaining + eligible pool)
  await syncWithDatabase();

      const message = drawQuantity > 1 
        ? `${winnersToConfirm.length} winners confirmed for ${selectedPrize.name}.`
        : `${winner.name} won the ${selectedPrize.name}.`;

      toast({ 
        title: "Winner(s) Confirmed!", 
        description: message
      });
      
  setIsConfirmed(true);

    } catch (error) {
      console.error("Error confirming winner:", error);
      toast({ 
        title: "Error", 
        description: "Could not save the winner(s). Please try again.", 
        variant: "destructive" 
      });
      setIsConfirming(false);
    }
  };

  const redraw = async () => {
    if (!winner || !db) return;
    setShowRedrawConfirm(false);
    
    try {
      const database = db;
      
      // For batch draws, exclude all current batch winners
      const winnersToExclude = drawQuantity > 1 ? batchWinners : [winner];
      
  // FIRST: Remove from local pool IMMEDIATELY before any async operations
  const excludeIds = new Set(winnersToExclude.map(w => w.id));
  const updatedPool = eligiblePool.filter(p => !excludeIds.has(p.id));
  setEligiblePool(updatedPool);
      
      const batch = writeBatch(database);
      
      // Delete the winner record(s) BUT keep isEligible as false
      const winnersQuery = query(collection(database, 'winners'));
      const winnersSnapshot = await getDocs(winnersQuery);
      
      winnersToExclude.forEach((winnerAttendee) => {
        // Find and delete the winner document
        winnersSnapshot.docs.forEach(winnerDoc => {
          if (winnerDoc.data().attendeeId === winnerAttendee.id) {
            batch.delete(doc(database, 'winners', winnerDoc.id));
          }
        });
        
        // Keep isEligible as FALSE - they had their chance, even if absent
        const attendeeRef = doc(database, "attendees", winnerAttendee.id);
        batch.update(attendeeRef, { isEligible: false });
      });
      
      // DON'T update prize quantity - it will be updated only when winner is confirmed
      // The prize quantity should stay the same since we're just excluding this attendee
      
      await batch.commit();

      // Sync from DB to ensure absent attendee is removed and counts reflect server
      const { eligible } = await syncWithDatabase();

      toast({
        title: "Redrawing",
        description: `${winnersToExclude.length > 1 ? 'Winners were' : 'Winner was'} absent and disqualified.`,
      });
      
      resetDraw(false);
      
      // Start next draw using the freshly synced eligible pool
      setTimeout(() => {
        startDrawing(eligible);
      }, 150);
    } catch (error) {
      console.error("Error during redraw:", error);
      toast({
        title: "Error",
        description: "Failed to process redraw. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRedrawClick = () => {
    setShowRedrawConfirm(true);
  };

  const cancelRedraw = () => {
    setShowRedrawConfirm(false);
    // Optional: ensure pool/prize stats reflect DB when cancelling
    void syncWithDatabase();
  };

  const drawAgain = () => {
    resetDraw();
    setTimeout(() => startDrawing(), 100);
  };
  
  const resetDraw = (closeModal = true) => {
    setDrawingState('idle');
    setWinner(null);
    setShuffledNames([]);
    setShowConfetti(false);
    setIsConfirming(false);
    setIsConfirmed(false);
    setShowRedrawConfirm(false);
    setBatchWinners([]);
    setCurrentBatchIndex(0);
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
                <div>
                  <div className="flex items-center gap-2"><Award className="h-4 w-4" />Stock</div>
                  <p className="text-muted-foreground mt-1"><span className="font-bold">{selectedPrize.remaining}</span> of {selectedPrize.quantity} remaining</p>
                </div>
                <div>
                  <div className="flex items-center gap-2"><Users className="h-4 w-4" />Eligible Pool</div>
                  <p className="text-muted-foreground mt-1">{eligiblePool.length} people eligible</p>
                </div>
              </div>

              {maxDrawQuantity > 1 && (
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium">Draw Quantity</label>
                  <Input
                    type="number"
                    min={1}
                    max={maxDrawQuantity}
                    value={drawQuantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 1 && value <= maxDrawQuantity) {
                        setDrawQuantity(value);
                      }
                    }}
                    disabled={drawingState !== 'idle'}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Draw multiple winners at once (max: {maxDrawQuantity})
                  </p>
                </div>
              )}

               <Button
                 className="w-full mt-4"
                 size="lg"
                 onClick={() => startDrawing()}
                 disabled={!selectedPrize || drawingState !== 'idle' || eligiblePool.length === 0 || (selectedPrize?.remaining ?? 0) <= 0}
               >
                 {eligiblePool.length === 0
                   ? 'No Eligible Attendees'
                   : (selectedPrize?.remaining ?? 0) <= 0
                     ? 'Out of Stock'
                     : drawQuantity > 1
                       ? `Draw ${drawQuantity} Winners`
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
            <DialogContent className="sm:max-w-3xl h-3/4 flex flex-col p-0 gap-0" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
                 {showConfetti && <Confetti key={confettiKey} />}
                 <DialogHeader className="p-4 flex-shrink-0 border-b">
                    <DialogTitle className="text-2xl font-bold">
                      {selectedPrize?.name || 'Prize Draw'}
                      {drawQuantity > 1 && batchWinners.length > 0 && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          (Winner {currentBatchIndex + 1} of {batchWinners.length})
                        </span>
                      )}
                    </DialogTitle>
                 </DialogHeader>
                <div className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-background/80 overflow-hidden">
                    {drawingState === 'idle' && <div className="flex items-center justify-center h-full"><Trophy className="h-32 w-32 text-yellow-400 animate-pulse"/></div>}
                    {drawingState === 'drawing' && <NameCarousel />}
                    {drawingState === 'revealed' && winner && (
                        <div className="text-center animate-in fade-in zoom-in-90 flex flex-col items-center justify-center">
                            <p className="text-lg text-accent font-semibold">WINNER!</p>
                            <div className="mt-4">
                                <h3 className="text-4xl font-bold text-foreground">{winner.name}</h3>
                                <p className="text-muted-foreground text-lg">{winner.organization}</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0 p-4 bg-muted/50 border-t">
                    {drawingState === 'revealed' && !isConfirmed && (
                        <>
                        {!showRedrawConfirm ? (
                            <div className="space-y-3">
                              {/* Show navigation for batch draws */}
                              {drawQuantity > 1 && currentBatchIndex < batchWinners.length - 1 && (
                                <Button 
                                  size="lg" 
                                  className="w-full" 
                                  onClick={showNextWinner}
                                  disabled={isConfirming}
                                >
                                  Show Next Winner ({currentBatchIndex + 2} of {batchWinners.length})
                                </Button>
                              )}
                              
                              {/* Show confirm/redraw when on last winner or single draw */}
                              {(drawQuantity === 1 || currentBatchIndex === batchWinners.length - 1) && (
                                <div className="grid grid-cols-2 gap-4">
                                  <Button size="lg" variant="outline" onClick={handleRedrawClick} disabled={isConfirming}>
                                      <Redo className="mr-2 h-4 w-4" /> Redraw {drawQuantity > 1 ? 'All' : ''}
                                  </Button>
                                  <Button size="lg" onClick={confirmWinner} disabled={isConfirming}>
                                      {isConfirming ? (
                                          <>
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              Confirming...
                                          </>
                                      ) : (
                                          <>
                                              <Check className="mr-2 h-4 w-4" /> Confirm {drawQuantity > 1 ? `${batchWinners.length} Winners` : 'Winner'}
                                          </>
                                      )}
                                  </Button>
                                </div>
                              )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-center text-sm text-muted-foreground">
                                    Are you sure you want to redraw? This will exclude {drawQuantity > 1 ? `all ${batchWinners.length} selected winners` : <span className="font-semibold">{winner?.name}</span>} from the pool.
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
