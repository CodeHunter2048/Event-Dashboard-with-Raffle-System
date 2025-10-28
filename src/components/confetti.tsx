'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  vx: number;
  vy: number;
  vr: number;
}

const colors = ['#3B82F6', '#06B6D4', '#8B5CF6', '#10B981', '#F59E0B'];

const createParticle = (id: number): ConfettiParticle => ({
  id,
  x: Math.random() * 100,
  y: -5 - Math.random() * 20,
  rotation: Math.random() * 360,
  scale: Math.random() * 0.5 + 0.5,
  color: colors[Math.floor(Math.random() * colors.length)],
  vx: Math.random() * 2 - 1,
  vy: Math.random() * 2 + 1,
  vr: Math.random() * 20 - 10,
});

export function Confetti() {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const maxFrames = 600; // Auto-stop after ~10 seconds at 60fps

  // Memoized animate function to prevent recreations
  const animate = useCallback(() => {
    // Safety check: ensure we're still mounted and should be animating
    if (!isMountedRef.current || !isAnimatingRef.current) {
      return;
    }

    // Safety: Auto-stop after max frames to prevent infinite loops
    frameCountRef.current++;
    if (frameCountRef.current > maxFrames) {
      isAnimatingRef.current = false;
      return;
    }

    try {
      setParticles(prevParticles => {
        // Safety: Ensure particles exist
        if (!prevParticles || prevParticles.length === 0) {
          return prevParticles;
        }

        const updatedParticles = prevParticles.map(p => {
          try {
            let newY = p.y + p.vy;
            let newX = p.x + p.vx;
            let newRotation = p.rotation + p.vr;

            // Reset particle if it goes off screen
            if (newY > 110) {
              return createParticle(p.id);
            }
            return { ...p, y: newY, x: newX, rotation: newRotation };
          } catch (err) {
            // If individual particle fails, just return original
            console.error('Particle update error:', err);
            return p;
          }
        });
        return updatedParticles;
      });

      // Continue animation if still mounted and animating
      if (isMountedRef.current && isAnimatingRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    } catch (err) {
      // If animation fails, stop gracefully
      console.error('Confetti animation error:', err);
      isAnimatingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    // Mark as mounted
    isMountedRef.current = true;
    isAnimatingRef.current = true;
    frameCountRef.current = 0;

    // Initialize particles with error handling
    try {
      const initialParticles = Array.from({ length: 150 }, (_, i) => createParticle(i));
      setParticles(initialParticles);
    } catch (err) {
      console.error('Failed to create confetti particles:', err);
      return;
    }

    // Start animation with a small delay to ensure DOM is ready
    const startTimeout = setTimeout(() => {
      if (isMountedRef.current && isAnimatingRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    }, 50);

    // Cleanup function
    return () => {
      // Mark as unmounted
      isMountedRef.current = false;
      isAnimatingRef.current = false;

      // Clear timeout
      clearTimeout(startTimeout);

      // Cancel any pending animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Clear particles
      setParticles([]);
    };
  }, [animate]);

  // Don't render if no particles
  if (!particles || particles.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50" aria-hidden="true">
      {particles.map(p => {
        try {
          return (
            <div
              key={`confetti-${p.id}`}
              className="absolute w-2 h-4 will-change-transform"
              style={{
                left: `${Math.max(0, Math.min(100, p.x))}vw`,
                top: `${Math.max(-20, Math.min(120, p.y))}vh`,
                backgroundColor: p.color,
                transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
                transition: 'none'
              }}
            />
          );
        } catch (err) {
          // If rendering a particle fails, skip it
          return null;
        }
      })}
    </div>
  );
}
