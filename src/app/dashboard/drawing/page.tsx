'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { attendees, prizes, Prize, Winner } from '@/lib/data';
import { Confetti } from '@/components/confetti';
import { Award, Check, Redo, Users, Trophy, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const checkedInAttendees = attendees.filter(a => a.checkedIn);

type DrawingState = 'idle' | 'drawing' | 'revealed';

export default function DrawingPage() {
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [drawingState, setDrawingState] = useState<DrawingState>('idle');
  const [winner, setWinner] = useState<(typeof checkedInAttendees[0]) | null>(null);
  const [eligiblePool, setEligiblePool] = useState(checkedInAttendees);
  const [shuffledNames, setShuffledNames] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [winnersList, setWinnersList] = useState<Winner[]>([]);

  const handlePrizeChange = (prizeId: string) => {
    const prize = prizes.find(p => p.id === prizeId);
    setSelectedPrize(prize || null);
    resetDraw();
  };

  const startDrawing = () => {
    if (!selectedPrize || eligiblePool.length === 0) return;
    setDrawingState('drawing');
    setShowConfetti(false);
    setIsModalOpen(true);
    
    let tempShuffled = [];
    for(let i=0; i<10; i++){
        tempShuffled.push(...[...eligiblePool].sort(() => Math.random() - 0.5));
    }
    const finalWinner = eligiblePool[Math.floor(Math.random() * eligiblePool.length)];
    tempShuffled.push(finalWinner);
    setShuffledNames(tempShuffled.map(a => a.name));
    setWinner(finalWinner);

    setTimeout(() => {
      setDrawingState('revealed');
      setShowConfetti(true);
    }, 4000); 
  };

  const confirmWinner = () => {
    if (!winner || !selectedPrize) return;

    const newWinnerEntry: Winner = {
        attendee: winner,
        prize: selectedPrize,
        timestamp: new Date().toISOString(),
        claimed: false, // Or true if claimed immediately
    };
    setWinnersList(prev => [newWinnerEntry, ...prev]);

    setEligiblePool(pool => pool.filter(p => p.id !== winner.id));
    
    const prizeIndex = prizes.findIndex(p => p.id === selectedPrize.id);
    if(prizeIndex !== -1) {
        prizes[prizeIndex].remaining -= 1;
    }

    if(selectedPrize.remaining <= 1){
        setSelectedPrize(null);
    }
    
    resetDraw();
  };

  const redraw = () => {
    if (!winner) return;
    // Keep the winner out of the pool for this specific prize draw
    setEligiblePool(pool => pool.filter(p => p.id !== winner.id));
    resetDraw(false); // don't close modal
    startDrawing();
  };
  
  const resetDraw = (closeModal = true) => {
    setDrawingState('idle');
    setWinner(null);
    setShowConfetti(false);
    if (closeModal) {
      setIsModalOpen(false);
    }
  }

  const NameCarousel = useCallback(() => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    useEffect(() => {
        if (drawingState !== 'drawing') {
            if(drawingState === 'revealed' && winner) {
                 setCurrentIndex(shuffledNames.indexOf(winner.name));
            }
            return;
        };

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
    }, [drawingState, winner]);

    if (drawingState === 'idle' && !isModalOpen) {
        return <div className="text-4xl text-muted-foreground">Ready to Draw</div>
    }

    if (drawingState === 'idle' && isModalOpen) {
      return (
        <div className="flex items-center justify-center h-full">
            <Trophy className="h-32 w-32 text-yellow-400 animate-pulse"/>
        </div>
      );
    }


    const transformY = `translateY(-${currentIndex * 100}%)`;

    return (
        <div className="h-32 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-background to-transparent z-10"/>
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent z-10"/>
            <div className="transition-transform duration-100 ease-linear" style={{ transform: transformY }}>
                {shuffledNames.map((name, index) => (
                    <div key={index} className="h-32 flex items-center justify-center text-5xl md:text-7xl font-bold">
                        {name}
                    </div>
                ))}
            </div>
        </div>
    )

  }, [shuffledNames, drawingState, winner, isModalOpen]);


  return (
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
                {prizes.filter(p => p.remaining > 0).map(prize => (
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
              <CardTitle className="flex items-center gap-2">
                <Award />
                Prize Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <h3 className="text-xl font-bold">{selectedPrize.name}</h3>
              <p className="text-muted-foreground">{selectedPrize.description}</p>
              <div className='grid grid-cols-2 gap-4'>
                <p>
                    <span className="font-bold">{selectedPrize.remaining}</span> of {selectedPrize.quantity} remaining
                </p>
                <div>
                  <div className="flex items-center gap-2"><Users />Eligible Pool</div>
                  <p className="text-muted-foreground mt-1">{eligiblePool.length} checked-in attendees are eligible to win.</p>
                </div>
              </div>
               <Button
                className="w-full mt-4"
                size="lg"
                onClick={startDrawing}
                disabled={!selectedPrize || drawingState !== 'idle'}
                >
                Start Draw
                </Button>
            </CardContent>
          </Card>
        )}
      </div>

       <Card>
            <CardHeader>
                <CardTitle>Recent Winners</CardTitle>
                <CardDescription>List of recently drawn winners.</CardDescription>
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
                 <DialogHeader className="p-4 flex-shrink-0">
                    <DialogTitle className="text-2xl font-bold">{selectedPrize?.name}</DialogTitle>
                 </DialogHeader>

                <div className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-background/80 overflow-hidden">
                     <div className="mb-8 w-full">
                        <NameCarousel/>
                    </div>

                    {drawingState === 'revealed' && winner && (
                        <div className="text-center animate-in fade-in zoom-in-90">
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
                
                <div className="flex-shrink-0 p-4 bg-muted/50">
                    {drawingState === 'revealed' && (
                        <div className="grid grid-cols-2 gap-4">
                        <Button size="lg" variant="outline" onClick={redraw}>
                            <Redo className="mr-2 h-4 w-4" /> Redraw
                        </Button>
                        <Button size="lg" onClick={confirmWinner}>
                            <Check className="mr-2 h-4 w-4" /> Confirm Winner
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
  );
}
