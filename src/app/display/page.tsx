
'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Attendee } from '@/lib/data';
import { Users, CheckCircle2, Sparkles, User } from 'lucide-react';

// CSS for the scrolling animation and blob effects
const styles = `
  @keyframes scroll {
    0% { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }
  .scrolling-list {
    animation: scroll 60s linear infinite;
  }
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
`;

export default function DisplayPage() {
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [checkedInAttendees, setCheckedInAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    // Get total number of attendees
    const allAttendeesQuery = query(collection(db, 'attendees'));
    const unsubscribeTotal = onSnapshot(allAttendeesQuery, (snapshot) => {
      setTotalAttendees(snapshot.size);
    });

    // Get real-time updates for checked-in attendees
    const checkedInQuery = query(collection(db, 'attendees'), where('checkedIn', '==', true));
    const unsubscribeCheckedIn = onSnapshot(checkedInQuery, (snapshot) => {
      const attendeesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          organization: data.organization || '',
          role: data.role || '',
          avatar: data.avatar || 1,
          checkedIn: data.checkedIn || false,
          checkInTime: data.checkInTime || null,
        } as Attendee;
      });
      setCheckedInAttendees(attendeesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching checked-in attendees:", error);
      setLoading(false);
    });

    // Clean up listeners on unmount
    return () => {
      unsubscribeTotal();
      unsubscribeCheckedIn();
    };
  }, []);

  const displayedAttendees = checkedInAttendees.length > 0 ? [...checkedInAttendees, ...checkedInAttendees] : [];

  return (
    <>
      <style>{styles}</style>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
        {/* Animated Background with Blur Dots */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="flex flex-col items-center justify-center p-4 lg:p-8 space-y-8 min-h-screen relative">
          <header className="text-center max-w-5xl animate-float">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 mb-6 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
              <span className="text-sm font-medium text-cyan-300">Live Event Dashboard</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              AI for IA
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-blue-200 mb-6 tracking-wide">
              Uniting Industry-Academia through Artificial Intelligence
            </h2>
            <div className="flex items-center justify-center gap-2 text-xl md:text-2xl text-slate-300">
              <Users className="h-6 w-6 text-cyan-400" />
              <p>Welcome attendees!</p>
            </div>
          </header>

          <div className="grid lg:grid-cols-3 gap-8 w-full max-w-7xl">
            <main className="lg:col-span-2 h-[60vh] overflow-hidden relative rounded-xl border border-slate-700/50 bg-slate-900/30 backdrop-blur-md shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent z-10 pointer-events-none" />
              <div className="scrolling-list p-4">
                {displayedAttendees.length > 0 ? (
                  displayedAttendees.map((attendee, index) => {
                    return (
                      <Card key={`${attendee.id}-${index}`} className="mb-4 bg-gradient-to-r from-slate-800/80 to-slate-800/60 backdrop-blur-md border-slate-600/50 hover:border-cyan-500/50 transition-all duration-300 shadow-lg">
                        <CardContent className="p-5 flex items-center gap-4">
                          <div className="relative">
                            <Avatar className="h-14 w-14 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20">
                              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white flex items-center justify-center">
                                <User className="h-8 w-8" strokeWidth={2} />
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-slate-900">
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-lg text-white mb-1">{attendee.name}</p>
                            <div className="text-slate-300 text-sm flex items-center gap-2">
                              <Badge variant="secondary" className="bg-slate-700/50 text-slate-300 border-slate-600/50">
                                {attendee.organization}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Checked In</p>
                            {attendee.checkInTime && (
                              <p className="text-xs text-cyan-400 font-medium">
                                {typeof attendee.checkInTime === 'string' 
                                  ? new Date(attendee.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : new Date((attendee.checkInTime as any).seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <p className="text-lg">No attendees checked in yet...</p>
                  </div>
                )}
              </div>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto"></div>
                    <p className="text-white text-lg">Loading attendees...</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-10 pointer-events-none" />
            </main>

            <aside className="lg:col-span-1 flex flex-col justify-center space-y-4">
              <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md border-slate-600/50 shadow-2xl overflow-hidden relative">
                <CardHeader className="relative z-10">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-cyan-500/20">
                      <CheckCircle2 className="h-6 w-6 text-cyan-400" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    Checked In
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 text-center">
                  <div className="space-y-2">
                    <p className="text-6xl lg:text-7xl font-bold bg-gradient-to-br from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {checkedInAttendees.length}
                    </p>
                    <p className="text-2xl text-slate-400">
                      of <span className="text-white font-semibold">{totalAttendees}</span>
                    </p>
                    <div className="pt-4">
                      <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out rounded-full"
                          style={{ width: `${totalAttendees > 0 ? (checkedInAttendees.length / totalAttendees) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-slate-400 mt-2">
                        {totalAttendees > 0 ? Math.round((checkedInAttendees.length / totalAttendees) * 100) : 0}% Attendance
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-800/50 to-pink-800/50 backdrop-blur-md border-purple-600/50 shadow-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-center gap-2">
                    <Users className="h-5 w-5 text-purple-300" />
                    <CardTitle className="text-lg text-purple-100">Total Registered</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-4xl font-bold text-white">{totalAttendees}</p>
                  <p className="text-sm text-purple-200 mt-1">Delegates</p>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
