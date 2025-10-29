'use client';
import { useState, useEffect } from 'react';
import { Line, LineChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Attendee, Prize, Winner } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface CheckInDataPoint {
  time: string;
  checkins: number;
}

interface ScanLog {
  id: string;
  attendeeId: string;
  attendeeName: string;
  scannedBy: string;
  timestamp: string;
  action: 'checked-in' | 'already-checked-in' | 'not-found';
}

interface ScannerDataPoint {
  scanner: string;
  scans: number;
  checkins: number;
  duplicates: number;
}

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkInData, setCheckInData] = useState<CheckInDataPoint[]>([]);
  const [scannerData, setScannerData] = useState<ScannerDataPoint[]>([]);

  // Fetch real-time data from Firebase
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubscribes: (() => void)[] = [];

    try {
      // Listen to attendees collection - using simple query without orderBy to avoid index issues
      const attendeesRef = collection(db, 'attendees');
      const unsubAttendees = onSnapshot(
        attendeesRef,
        (snapshot) => {
          const attendeesData = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // Safely handle checkInTime conversion
            let checkInTimeISO = null;
            try {
              if (data.checkInTime && typeof data.checkInTime.toDate === 'function') {
                checkInTimeISO = data.checkInTime.toDate().toISOString();
              } else if (data.checkInTime && typeof data.checkInTime === 'string') {
                checkInTimeISO = data.checkInTime;
              }
            } catch (e) {
              console.warn('Error converting checkInTime for attendee:', doc.id, e);
            }
            
            return {
              id: doc.id,
              name: data.name || '',
              email: data.email || '',
              organization: data.organization || '',
              role: data.role || '',
              avatar: data.avatar || '1',
              checkedIn: data.checkedIn || false,
              checkInTime: checkInTimeISO,
              createdAt: data.createdAt,
            } as Attendee;
          });
          setAttendees(attendeesData);
          
          // Calculate check-in data by hour
          calculateCheckInTrend(attendeesData);
        },
        (error) => {
          console.error('Error fetching attendees:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to fetch attendees data.',
          });
        }
      );
      unsubscribes.push(unsubAttendees);

      // Listen to prizes collection
      const prizesQuery = collection(db, 'prizes');
      const unsubPrizes = onSnapshot(
        prizesQuery,
        (snapshot) => {
          const prizesData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || '',
              description: data.description || '',
              quantity: data.quantity || 0,
              remaining: data.remaining || 0,
              tier: data.tier || 'Minor',
              image: data.image || '',
            } as Prize;
          });
          setPrizes(prizesData);
        },
        (error) => {
          console.error('Error fetching prizes:', error);
        }
      );
      unsubscribes.push(unsubPrizes);

      // Listen to winners collection - using simple query without orderBy to avoid index issues
      const winnersRef = collection(db, 'winners');
      const unsubWinners = onSnapshot(
        winnersRef,
        (snapshot) => {
          const winnersData = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // Safely handle timestamp conversion
            let timestampISO = new Date().toISOString();
            try {
              if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                timestampISO = data.timestamp.toDate().toISOString();
              } else if (data.timestamp && typeof data.timestamp === 'string') {
                timestampISO = data.timestamp;
              }
            } catch (e) {
              console.warn('Error converting timestamp for winner:', doc.id, e);
            }
            
            return {
              id: doc.id,
              attendeeId: data.attendeeId,
              prizeId: data.prizeId,
              attendeeName: data.attendeeName,
              attendeeOrganization: data.attendeeOrganization,
              prizeName: data.prizeName,
              timestamp: timestampISO,
            };
          });
          // Sort by timestamp in JavaScript after fetching
          winnersData.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setWinners(winnersData as any);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching winners:', error);
          setLoading(false);
        }
      );
      unsubscribes.push(unsubWinners);

      // Listen to scan logs collection
      const scanLogsRef = collection(db, 'scanlogs');
      const unsubScanLogs = onSnapshot(
        scanLogsRef,
        (snapshot) => {
          const scanLogsData = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // Safely handle timestamp conversion
            let timestampISO = new Date().toISOString();
            try {
              if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                timestampISO = data.timestamp.toDate().toISOString();
              } else if (data.timestamp && typeof data.timestamp === 'string') {
                timestampISO = data.timestamp;
              }
            } catch (e) {
              console.warn('Error converting timestamp for scan log:', doc.id, e);
            }
            
            return {
              id: doc.id,
              attendeeId: data.attendeeId || '',
              attendeeName: data.attendeeName || '',
              scannedBy: data.scannedBy || 'Unknown',
              timestamp: timestampISO,
              action: data.action || 'checked-in',
            } as ScanLog;
          });
          setScanLogs(scanLogsData);
          
          // Calculate scanner statistics
          calculateScannerStats(scanLogsData);
        },
        (error) => {
          console.error('Error fetching scan logs:', error);
        }
      );
      unsubscribes.push(unsubScanLogs);

    } catch (error) {
      console.error('Error setting up listeners:', error);
      setLoading(false);
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [toast]);

  // Calculate check-in trend with 15-minute intervals
  const calculateCheckInTrend = (attendeesData: Attendee[]) => {
    const checkedInAttendees = attendeesData.filter(a => a.checkedIn && a.checkInTime);
    
    if (checkedInAttendees.length === 0) {
      setCheckInData([]);
      return;
    }

    // Group check-ins by 15-minute intervals
    const intervalData: { [key: string]: { time: string, checkins: number, timestamp: number } } = {};
    
    checkedInAttendees.forEach(attendee => {
      if (attendee.checkInTime) {
        const date = new Date(attendee.checkInTime);
        const hour = date.getHours();
        const minute = date.getMinutes();
        
        // Round down to nearest 15-minute interval
        const intervalMinute = Math.floor(minute / 15) * 15;
        
        // Create time label
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        const timeLabel = `${displayHour}:${intervalMinute.toString().padStart(2, '0')} ${period}`;
        
        // Store both display time and timestamp for sorting
        const timestamp = hour * 60 + intervalMinute;
        
        if (!intervalData[timeLabel]) {
          intervalData[timeLabel] = { time: timeLabel, checkins: 0, timestamp };
        }
        intervalData[timeLabel].checkins += 1;
      }
    });

    // Convert to array and sort by timestamp
    const sortedData = Object.values(intervalData)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(({ time, checkins }) => ({ time, checkins }));

    setCheckInData(sortedData);
  };

  // Calculate scanner statistics
  const calculateScannerStats = (scanLogsData: ScanLog[]) => {
    if (scanLogsData.length === 0) {
      setScannerData([]);
      return;
    }

    // Group scans by scanner
    const scannerStats: { [key: string]: { scans: number; checkins: number; duplicates: number } } = {};
    
    scanLogsData.forEach(log => {
      const scanner = log.scannedBy;
      
      if (!scannerStats[scanner]) {
        scannerStats[scanner] = { scans: 0, checkins: 0, duplicates: 0 };
      }
      
      scannerStats[scanner].scans += 1;
      
      if (log.action === 'checked-in') {
        scannerStats[scanner].checkins += 1;
      } else if (log.action === 'already-checked-in') {
        scannerStats[scanner].duplicates += 1;
      }
    });

    // Convert to array and sort by total scans
    const sortedData = Object.entries(scannerStats)
      .map(([scanner, stats]) => ({
        scanner,
        scans: stats.scans,
        checkins: stats.checkins,
        duplicates: stats.duplicates,
      }))
      .sort((a, b) => b.scans - a.scans);

    setScannerData(sortedData);
  };

  // Calculate metrics
  const checkedInCount = attendees.filter(a => a.checkedIn).length;
  const attendanceRate = attendees.length > 0 ? ((checkedInCount / attendees.length) * 100).toFixed(1) : '0.0';
  
  // Find peak check-in time
  const peakCheckIn = checkInData.length > 0
    ? checkInData.reduce((max, curr) => curr.checkins > max.checkins ? curr : max, checkInData[0])
    : null;

  // Calculate total scans and active scanners
  const totalScans = scanLogs.length;
  const activeScanners = scannerData.length;
  const topScanner = scannerData.length > 0 ? scannerData[0] : null;

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-3">
         <Card>
            <CardHeader>
                <CardTitle>Attendance Rate</CardTitle>
                <CardDescription>Total registered vs. checked-in attendees.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-5xl font-bold">{attendanceRate}%</div>
                <p className="text-xs text-muted-foreground">{checkedInCount} of {attendees.length} attendees checked in.</p>
            </CardContent>
         </Card>
          <Card>
            <CardHeader>
                <CardTitle>Peak Check-in</CardTitle>
                <CardDescription>The busiest time interval for arrivals.</CardDescription>
            </CardHeader>
            <CardContent>
                {peakCheckIn ? (
                  <>
                    <div className="text-5xl font-bold">{peakCheckIn.time}</div>
                    <p className="text-xs text-muted-foreground">With {peakCheckIn.checkins} check-ins.</p>
                  </>
                ) : (
                  <>
                    <div className="text-5xl font-bold">--</div>
                    <p className="text-xs text-muted-foreground">No check-ins yet.</p>
                  </>
                )}
            </CardContent>
         </Card>
         <Card>
            <CardHeader>
                <CardTitle>Active Scanners</CardTitle>
                <CardDescription>Organizers/admins performing check-ins.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-5xl font-bold">{activeScanners}</div>
                <p className="text-xs text-muted-foreground">
                  {totalScans} total scans
                  {topScanner && ` • Top: ${topScanner.scanner}`}
                </p>
            </CardContent>
         </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Check-in Trend</CardTitle>
          <CardDescription>Number of attendee check-ins per 15-minute interval.</CardDescription>
        </CardHeader>
        <CardContent>
          {checkInData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={checkInData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                  label={{ value: 'Check-ins', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="checkins"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Check-ins"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              No check-in data available yet.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scanner Activity</CardTitle>
            <CardDescription>Total scans performed by each organizer/admin.</CardDescription>
          </CardHeader>
          <CardContent>
            {scannerData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scannerData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    dataKey="scanner"
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar dataKey="scans" fill="hsl(var(--primary))" name="Total Scans" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No scanner data available yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Check-in Performance</CardTitle>
            <CardDescription>Successful check-ins vs. duplicate scans by scanner.</CardDescription>
          </CardHeader>
          <CardContent>
            {scannerData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scannerData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    dataKey="scanner"
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar dataKey="checkins" fill="hsl(var(--chart-1))" name="Successful" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="duplicates" fill="hsl(var(--chart-2))" name="Duplicates" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No scanner data available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Winners List</CardTitle>
          <CardDescription>List of all prize winners.</CardDescription>
        </CardHeader>
        <CardContent>
            {winners.length > 0 ? (
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Winner</TableHead>
                          <TableHead>Prize</TableHead>
                          <TableHead>Drawn At</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {winners.map((winner: any, index) => (
                          <TableRow key={winner.id || index}>
                              <TableCell>
                                  <div className="font-medium">{winner.attendeeName}</div>
                                  <div className="text-sm text-muted-foreground">{winner.attendeeOrganization}</div>
                              </TableCell>
                              <TableCell>{winner.prizeName}</TableCell>
                              <TableCell>{new Date(winner.timestamp).toLocaleString()}</TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No winners yet. Start drawing prizes!
              </div>
            )}
        </CardContent>
      </Card>

    </div>
  );
}
