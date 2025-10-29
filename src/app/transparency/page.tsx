'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/theme-toggle';
import { Award, CheckCircle2, Clock, Home, Shield, TrendingUp, Users, Search, Filter, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Winner {
  id: string;
  attendeeName: string;
  attendeeOrganization: string;
  prizeName: string;
  timestamp: string;
}

interface CheckInLog {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: string;
  checkInTime: string;
}

export default function TransparencyPage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalWinners: 0,
    totalCheckIns: 0,
    grandPrizeWinners: 0,
  });

  // Filter states for Winners
  const [winnerSearchTerm, setWinnerSearchTerm] = useState('');
  const [winnerPrizeFilter, setWinnerPrizeFilter] = useState('all');

  // Filter states for Check-ins
  const [checkInSearchTerm, setCheckInSearchTerm] = useState('');
  const [checkInRoleFilter, setCheckInRoleFilter] = useState('all');

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubscribes: (() => void)[] = [];

    try {
      // Listen to winners collection
      const winnersRef = collection(db, 'winners');
      const unsubWinners = onSnapshot(
        winnersRef,
        (snapshot) => {
          const winnersData = snapshot.docs.map(doc => {
            const data = doc.data();
            let timestampISO = new Date().toISOString();
            try {
              if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                timestampISO = data.timestamp.toDate().toISOString();
              } else if (data.timestamp && typeof data.timestamp === 'string') {
                timestampISO = data.timestamp;
              }
            } catch (e) {
              console.warn('Error converting timestamp:', e);
            }
            
            return {
              id: doc.id,
              attendeeName: data.attendeeName || 'Unknown',
              attendeeOrganization: data.attendeeOrganization || 'N/A',
              prizeName: data.prizeName || 'Unknown Prize',
              timestamp: timestampISO,
            };
          });
          
          winnersData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setWinners(winnersData);
          
          // Calculate grand prize winners (assuming "Grand" is in prize name)
          const grandCount = winnersData.filter(w => 
            w.prizeName.toLowerCase().includes('drone') || 
            w.prizeName.toLowerCase().includes('grand')
          ).length;
          
          setStats(prev => ({ ...prev, totalWinners: winnersData.length, grandPrizeWinners: grandCount }));
        },
        (error) => {
          console.error('Error fetching winners:', error);
        }
      );
      unsubscribes.push(unsubWinners);

      // Listen to checked-in attendees
      const attendeesRef = collection(db, 'attendees');
      const unsubAttendees = onSnapshot(
        attendeesRef,
        (snapshot) => {
          const checkInsData = snapshot.docs
            .map(doc => {
              const data = doc.data();
              
              if (!data.checkedIn) return null;
              
              let checkInTimeISO = null;
              try {
                if (data.checkInTime && typeof data.checkInTime.toDate === 'function') {
                  checkInTimeISO = data.checkInTime.toDate().toISOString();
                } else if (data.checkInTime && typeof data.checkInTime === 'string') {
                  checkInTimeISO = data.checkInTime;
                }
              } catch (e) {
                console.warn('Error converting checkInTime:', e);
              }
              
              if (!checkInTimeISO) return null;
              
              return {
                id: doc.id,
                name: data.name || 'Unknown',
                email: data.email || 'N/A',
                organization: data.organization || 'N/A',
                role: data.role || 'Attendee',
                checkInTime: checkInTimeISO,
              };
            })
            .filter((item): item is CheckInLog => item !== null);
          
          checkInsData.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
          setCheckIns(checkInsData);
          setStats(prev => ({ ...prev, totalCheckIns: checkInsData.length }));
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching check-ins:', error);
          setLoading(false);
        }
      );
      unsubscribes.push(unsubAttendees);

    } catch (error) {
      console.error('Error setting up listeners:', error);
      setLoading(false);
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  // Get unique prizes for filter dropdown
  const uniquePrizes = useMemo(() => {
    const prizes = Array.from(new Set(winners.map(w => w.prizeName)));
    return prizes.sort();
  }, [winners]);

  // Get unique roles for filter dropdown
  const uniqueRoles = useMemo(() => {
    const roles = Array.from(new Set(checkIns.map(c => c.role)));
    return roles.sort();
  }, [checkIns]);

  // Filtered winners
  const filteredWinners = useMemo(() => {
    return winners.filter(winner => {
      const matchesSearch = 
        winner.attendeeName.toLowerCase().includes(winnerSearchTerm.toLowerCase()) ||
        winner.attendeeOrganization.toLowerCase().includes(winnerSearchTerm.toLowerCase()) ||
        winner.prizeName.toLowerCase().includes(winnerSearchTerm.toLowerCase());
      
      const matchesPrize = winnerPrizeFilter === 'all' || winner.prizeName === winnerPrizeFilter;
      
      return matchesSearch && matchesPrize;
    });
  }, [winners, winnerSearchTerm, winnerPrizeFilter]);

  // Filtered check-ins
  const filteredCheckIns = useMemo(() => {
    return checkIns.filter(checkIn => {
      const matchesSearch = 
        checkIn.name.toLowerCase().includes(checkInSearchTerm.toLowerCase()) ||
        checkIn.email.toLowerCase().includes(checkInSearchTerm.toLowerCase()) ||
        checkIn.organization.toLowerCase().includes(checkInSearchTerm.toLowerCase());
      
      const matchesRole = checkInRoleFilter === 'all' || checkIn.role === checkInRoleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [checkIns, checkInSearchTerm, checkInRoleFilter]);

  // Clear all winner filters
  const clearWinnerFilters = () => {
    setWinnerSearchTerm('');
    setWinnerPrizeFilter('all');
  };

  // Clear all check-in filters
  const clearCheckInFilters = () => {
    setCheckInSearchTerm('');
    setCheckInRoleFilter('all');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-300/10 dark:bg-purple-900/10 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-300/10 dark:bg-pink-900/10 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Event Transparency Portal</h1>
              <p className="text-xs text-muted-foreground">Public Record of Winners & Check-ins</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline">
              <Link href="/login">
                <Home className="h-4 w-4 mr-2" />
                Back to Login
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Real-time Event Transparency</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Full Event <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Transparency</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            View the complete, unfiltered history of prize winners and attendee check-ins. 
            All data is updated in real-time and publicly accessible for complete transparency.
          </p>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-2 hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Total Winners</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{stats.totalWinners}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.grandPrizeWinners} Grand Prize{stats.grandPrizeWinners !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Total Check-ins</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{stats.totalCheckIns}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Verified attendees
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Last Updated</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Live</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Real-time updates
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="winners" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-12">
            <TabsTrigger value="winners" className="text-base">
              <Award className="h-4 w-4 mr-2" />
              Winners History
            </TabsTrigger>
            <TabsTrigger value="checkins" className="text-base">
              <Users className="h-4 w-4 mr-2" />
              Check-in Logs
            </TabsTrigger>
          </TabsList>

          {/* Winners Tab */}
          <TabsContent value="winners" className="space-y-4">
            {/* Winners Filters */}
            <Card className="border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Filters</CardTitle>
                  </div>
                  {(winnerSearchTerm || winnerPrizeFilter !== 'all') && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearWinnerFilters}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="winner-search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="winner-search"
                        placeholder="Name, organization, or prize..."
                        value={winnerSearchTerm}
                        onChange={(e) => setWinnerSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="winner-prize">Prize Type</Label>
                    <Select value={winnerPrizeFilter} onValueChange={setWinnerPrizeFilter}>
                      <SelectTrigger id="winner-prize">
                        <SelectValue placeholder="All prizes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Prizes</SelectItem>
                        {uniquePrizes.map(prize => (
                          <SelectItem key={prize} value={prize}>{prize}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {filteredWinners.length < winners.length && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Showing {filteredWinners.length} of {winners.length} winners
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Prize Winners
                </CardTitle>
                <CardDescription>
                  Complete chronological record of all prize drawings and winners
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredWinners.length > 0 ? (
                  <div className="relative overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Winner</TableHead>
                          <TableHead>Prize</TableHead>
                          <TableHead className="text-right">Date & Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWinners.map((winner, index) => (
                          <TableRow key={winner.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <Badge variant="outline">{index + 1}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{winner.attendeeName}</span>
                                <span className="text-sm text-muted-foreground">{winner.attendeeOrganization}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-medium">
                                {winner.prizeName}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              <div className="flex flex-col items-end">
                                <span>{new Date(winner.timestamp).toLocaleDateString()}</span>
                                <span className="text-muted-foreground">{new Date(winner.timestamp).toLocaleTimeString()}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : winners.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium text-muted-foreground">No winners yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Prize drawings haven't started</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium text-muted-foreground">No matches found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearWinnerFilters}
                      className="mt-4"
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Check-ins Tab */}
          <TabsContent value="checkins" className="space-y-4">
            {/* Check-ins Filters */}
            <Card className="border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Filters</CardTitle>
                  </div>
                  {(checkInSearchTerm || checkInRoleFilter !== 'all') && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearCheckInFilters}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="checkin-search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="checkin-search"
                        placeholder="Name, email, or organization..."
                        value={checkInSearchTerm}
                        onChange={(e) => setCheckInSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkin-role">Role</Label>
                    <Select value={checkInRoleFilter} onValueChange={setCheckInRoleFilter}>
                      <SelectTrigger id="checkin-role">
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {uniqueRoles.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {filteredCheckIns.length < checkIns.length && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Showing {filteredCheckIns.length} of {checkIns.length} check-ins
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Attendee Check-ins
                </CardTitle>
                <CardDescription>
                  Complete log of all attendee check-ins at the event
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredCheckIns.length > 0 ? (
                  <div className="relative overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="hidden md:table-cell">Email</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Check-in Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCheckIns.map((checkIn, index) => (
                          <TableRow key={checkIn.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <Badge variant="outline">{index + 1}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{checkIn.name}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {checkIn.email}
                            </TableCell>
                            <TableCell>{checkIn.organization}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{checkIn.role}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              <div className="flex flex-col items-end">
                                <span>{new Date(checkIn.checkInTime).toLocaleDateString()}</span>
                                <span className="text-muted-foreground">{new Date(checkIn.checkInTime).toLocaleTimeString()}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : checkIns.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium text-muted-foreground">No check-ins yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Waiting for attendees to arrive</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium text-muted-foreground">No matches found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearCheckInFilters}
                      className="mt-4"
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Trust Badge Section */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
              <div className="p-4 rounded-full bg-primary/10">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Verified & Transparent</h3>
                <p className="text-muted-foreground max-w-2xl">
                  All data displayed on this page is pulled directly from our secure database in real-time. 
                  No data is modified or filtered, ensuring complete transparency and trust in our raffle system.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Event Dashboard. All records are public and verifiable.</p>
          <p className="mt-2">Last updated: {new Date().toLocaleString()}</p>
        </div>
      </footer>

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
      `}</style>
    </div>
  );
}
