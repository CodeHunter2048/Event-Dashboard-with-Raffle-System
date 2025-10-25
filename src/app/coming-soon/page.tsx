'use client';

import { Calendar, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export default function ComingSoon() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = new Date('2025-10-29T09:00:00').getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob [animation-delay:2s]"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob [animation-delay:4s]"></div>
      </div>

      <div className="max-w-4xl w-full relative z-10">
        <div className="text-center space-y-8">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <Sparkles className="h-20 w-20 text-yellow-400 animate-pulse" />
              <div className="absolute inset-0 blur-xl bg-yellow-400 opacity-50"></div>
            </div>
          </div>

          {/* Main heading */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
              AI for IA
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-blue-200 mb-6">
              Uniting Industry-Academia through Artificial Intelligence
            </h2>
            <div className="inline-block bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3 border border-white/20">
              <p className="text-xl md:text-2xl text-white font-medium flex items-center gap-2 justify-center">
                <Calendar className="h-6 w-6 text-blue-300" />
                October 29, 2025
              </p>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="grid grid-cols-4 gap-4 md:gap-8 max-w-2xl mx-auto mt-12">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hours', value: timeLeft.hours },
              { label: 'Minutes', value: timeLeft.minutes },
              { label: 'Seconds', value: timeLeft.seconds },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white/10 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/20 shadow-2xl"
              >
                <div className="text-3xl md:text-5xl font-bold text-white mb-2">
                  {item.value.toString().padStart(2, '0')}
                </div>
                <div className="text-sm md:text-base text-blue-200 uppercase tracking-wide">
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* Coming Soon Badge */}
          <div className="mt-12">
            <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-8 py-4 rounded-full text-xl md:text-2xl font-bold shadow-2xl transform hover:scale-105 transition-transform">
              🚀 Coming Soon
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-12 space-y-4 text-blue-100">
            <p className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Join us for an exciting conference bringing together industry leaders and academic innovators 
              to explore the transformative power of Artificial Intelligence.
            </p>
            <p className="text-md text-blue-300">
              Stay tuned for registration details and program announcements.
            </p>
          </div>

          
        </div>
      </div>
    </div>
  );
}
