'use client';

import { useState, useEffect, useRef } from 'react';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  delay: number;
}

const colors = ['#3B82F6', '#06B6D4', '#8B5CF6', '#10B981', '#F59E0B'];

const createParticle = (id: number): ConfettiParticle => ({
  id,
  x: Math.random() * 100,
  y: Math.random() * 100,
  rotation: Math.random() * 360,
  scale: Math.random() * 0.5 + 0.5,
  color: colors[Math.floor(Math.random() * colors.length)],
  delay: Math.random() * 0.5, // Stagger the animation start
});

export function Confetti() {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Create particles once
    const initialParticles = Array.from({ length: 150 }, (_, i) => createParticle(i));
    setParticles(initialParticles);

    // Start fade out after 2 seconds
    const fadeTimeout = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    return () => {
      clearTimeout(fadeTimeout);
    };
  }, []);

  if (particles.length === 0) {
    return null;
  }

  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none z-50 transition-opacity duration-1000"
      style={{ opacity: isVisible ? 1 : 0 }}
      aria-hidden="true"
    >
      {particles.map(p => (
        <div
          key={`confetti-${p.id}`}
          className="absolute w-2 h-4 animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            animationDelay: `${p.delay}s`,
            animationDuration: '2s',
            animationTimingFunction: 'ease-out',
            animationFillMode: 'forwards',
          }}
        />
      ))}
    </div>
  );
}
