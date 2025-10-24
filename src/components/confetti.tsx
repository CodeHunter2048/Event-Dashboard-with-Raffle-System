'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const initialParticles = Array.from({ length: 150 }, (_, i) => createParticle(i));
    setParticles(initialParticles);

    const animationFrame = requestAnimationFrame(animate);

    function animate() {
      setParticles(prevParticles => {
        const updatedParticles = prevParticles.map(p => {
          let newY = p.y + p.vy;
          let newX = p.x + p.vx;
          let newRotation = p.rotation + p.vr;

          if (newY > 110) {
            return createParticle(p.id);
          }
          return { ...p, y: newY, x: newX, rotation: newRotation };
        });
        return updatedParticles;
      });

      requestAnimationFrame(animate);
    }
    
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute w-2 h-4"
          style={{
            left: `${p.x}vw`,
            top: `${p.y}vh`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            transition: 'top 0.05s linear, left 0.05s linear'
          }}
        />
      ))}
    </div>
  );
}
