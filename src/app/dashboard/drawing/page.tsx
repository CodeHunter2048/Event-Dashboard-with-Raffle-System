'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { attendees, prizes, Prize } from '@/lib/data';
import { Confetti } from '@/components/confetti';
import { Award, Check, Redo, Users } from 'lucide-react';

const checkedInAttendees = attendees.filter(a => a.checkedIn);

type DrawingState = 'idle' | 'drawing' | 'revealed';

export default function DrawingPage() {
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [drawingState, setDrawingState] = useState<DrawingState>('idle');
  const [winner, setWinner] = useState<typeof checkedInAttendees[0] | null>(null);
  const [eligiblePool, setEligiblePool] = useState(checkedInAttendees);
  const [shuffledNames, setShuffledNames] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const handlePrizeChange = (prizeId: string) => {
    const prize = prizes.find(p => p.id === prizeId);
    setSelectedPrize(prize || null);
    resetDraw();
  };

  const startDrawing = () => {
    if (!selectedPrize || eligiblePool.length === 0) return;
    setDrawingState('drawing');
    setShowConfetti(false);
    
    // Create a long list of shuffled names for the animation
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
    }, 4000); // 3 seconds of animation + 1 for final reveal
  };

  const confirmWinner = () => {
    if (!winner) return;
    setEligiblePool(pool => pool.filter(p => p.id !== winner.id));
    if (selectedPrize) {
      selectedPrize.remaining -= 1;
    }
    resetDraw();
  };

  const redraw = () => {
    if (!winner) return;
    setEligiblePool(pool => pool.filter(p => p.id !== winner.id));
    startDrawing();
  };
  
  const resetDraw = () => {
    setDrawingState('idle');
    setWinner(null);
    setShowConfetti(false);
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

    if (drawingState === 'idle') {
        return <div className="text-4xl text-muted-foreground">Ready to Draw</div>
    }

    const transformY = `translateY(-${currentIndex * 100}%)`;

    return (
        <div className="h-24 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-card to-transparent z-10"/>
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent z-10"/>
            <div className="transition-transform duration-100 ease-linear" style={{ transform: transformY }}>
                {shuffledNames.map((name, index) => (
                    <div key={index} className="h-24 flex items-center justify-center text-4xl md:text-6xl font-bold">
                        {name}
                    </div>
                ))}
            </div>
        </div>
    )

  }, [shuffledNames, drawingState, winner]);


  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Select a Prize</CardTitle>
            <CardDescription>Choose which prize you want to draw for.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handlePrizeChange} disabled={drawingState !== 'idle'}>
              <SelectTrigger>
                <SelectValue placeholder="Select a prize..." />
              </SelectTrigger>
              <SelectContent>
                {prizes.filter(p => p.remaining > 0).map(prize => (
                  <SelectItem key={prize.id} value={prize.id}>
                    {prize.name} ({prize.tier})
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
              <p>
                <span className="font-bold">{selectedPrize.remaining}</span> of {selectedPrize.quantity} remaining
              </p>
            </CardContent>
            <CardContent>
                <CardTitle className="flex items-center gap-2"><Users />Eligible Pool</CardTitle>
                <p className="text-muted-foreground mt-2">{eligiblePool.length} checked-in attendees are eligible to win.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="relative overflow-hidden">
        {showConfetti && <Confetti />}
        <CardHeader>
          <CardTitle>2. The Draw</CardTitle>
          <CardDescription>Click Start Draw to begin the animation.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center py-12 md:py-20 min-h-[300px]">
            <div className="mb-8">
                <NameCarousel/>
            </div>

            {drawingState === 'revealed' && winner && (
                <div className="text-center animate-in fade-in zoom-in-90">
                    <p className="text-lg text-accent font-semibold">WINNER!</p>
                    <h3 className="text-3xl font-bold text-white">{winner.name}</h3>
                    <p className="text-muted-foreground">{winner.organization}</p>
                </div>
            )}
        </CardContent>
        <CardContent>
          {drawingState === 'idle' && (
            <Button
              className="w-full"
              size="lg"
              onClick={startDrawing}
              disabled={!selectedPrize}
            >
              Start Draw
            </Button>
          )}

          {drawingState === 'drawing' && (
             <Button className="w-full" size="lg" disabled>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                Drawing...
            </Button>
          )}

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
        </CardContent>
      </Card>
    </div>
  );
}
