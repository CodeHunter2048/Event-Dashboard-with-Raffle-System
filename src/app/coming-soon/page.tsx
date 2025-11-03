'use client';

import { Calendar, Clock } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';

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
    <div className="h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      {/* Animated background with blur dots */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="h-screen flex items-center justify-center p-4 lg:p-8 relative">
        <div className="max-w-5xl w-full relative z-10">
          <div className="text-center space-y-6">
            {/* Logo/Icon with float animation */}
            <div className="flex justify-center animate-float">
              <div className="relative">
                <div className="p-4 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 backdrop-blur-sm">
                  <Image src="/logo.png" alt="AI for IA Logo" width={64} height={64} className="w-12 h-12 md:w-16 md:h-16" />
                </div>
                <div className="absolute inset-0 blur-2xl bg-yellow-400 opacity-30 animate-pulse"></div>
              </div>
            </div>

            {/* Main heading with gradient */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 backdrop-blur-sm">
                <Clock className="h-5 w-5 text-cyan-400 animate-pulse" />
                <span className="text-sm font-medium text-cyan-300">Event Countdown</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI for IA
              </h1>
              
              <h2 className="text-xl md:text-2xl font-semibold text-blue-200 tracking-wide">
                Uniting Industry-Academia through Artificial Intelligence
              </h2>
              
              <Card className="inline-block bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md border-slate-600/50 shadow-2xl">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3 text-white">
                    <div className="p-2 rounded-lg bg-cyan-500/20">
                      <Calendar className="h-5 w-5 md:h-6 md:w-6 text-cyan-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs md:text-sm text-slate-400">Event Date</p>
                      <p className="text-lg md:text-xl font-bold">October 29, 2025</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Countdown Timer */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto">
              {[
                { label: 'Days', value: timeLeft.days, color: 'from-cyan-500 to-blue-500' },
                { label: 'Hours', value: timeLeft.hours, color: 'from-blue-500 to-purple-500' },
                { label: 'Minutes', value: timeLeft.minutes, color: 'from-purple-500 to-pink-500' },
                { label: 'Seconds', value: timeLeft.seconds, color: 'from-pink-500 to-orange-500' },
              ].map((item) => (
                <Card
                  key={item.label}
                  className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md border-slate-600/50 shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-105"
                >
                  <CardContent className="p-4 md:p-6 text-center">
                    <div className={`text-3xl md:text-5xl font-bold mb-1 bg-gradient-to-br ${item.color} bg-clip-text text-transparent`}>
                      {item.value.toString().padStart(2, '0')}
                    </div>
                    <div className="text-xs md:text-sm text-slate-400 uppercase tracking-wide font-medium">
                      {item.label}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Coming Soon Badge */}
            <div className="mt-6">
              <div className="inline-block relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 px-6 py-3 md:px-8 md:py-4 rounded-full text-lg md:text-xl font-bold shadow-2xl transform hover:scale-105 transition-transform cursor-pointer">
                  🚀 Coming Soon
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="max-w-2xl mx-auto">
              <p className="text-base md:text-lg text-blue-100 leading-relaxed">
                Join us for an exciting conference bringing together industry leaders and academic innovators 
                to explore the transformative power of Artificial Intelligence.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
