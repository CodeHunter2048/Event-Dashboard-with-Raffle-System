'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { winners, prizes, attendees } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Check, Clock } from 'lucide-react';

const checkInData = [
  { time: '9 AM', checkins: 45 },
  { time: '10 AM', checkins: 78 },
  { time: '11 AM', checkins: 120 },
  { time: '12 PM', checkins: 65 },
  { time: '1 PM', checkins: 34 },
  { time: '2 PM', checkins: 12 },
];

const checkedInCount = attendees.filter(a => a.checkedIn).length;
const totalPrizes = prizes.reduce((sum, p) => sum + p.quantity, 0);
const claimedPrizes = winners.filter(w => w.claimed).length;

export default function AnalyticsPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-3">
         <Card>
            <CardHeader>
                <CardTitle>Attendance Rate</CardTitle>
                <CardDescription>Total registered vs. checked-in attendees.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-5xl font-bold">{((checkedInCount / attendees.length) * 100).toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">{checkedInCount} of {attendees.length} attendees checked in.</p>
            </CardContent>
         </Card>
          <Card>
            <CardHeader>
                <CardTitle>Prize Claim Rate</CardTitle>
                <CardDescription>Prizes awarded vs. prizes claimed by winners.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-5xl font-bold">{((claimedPrizes / winners.length) * 100).toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">{claimedPrizes} of {winners.length} prizes claimed.</p>
            </CardContent>
         </Card>
          <Card>
            <CardHeader>
                <CardTitle>Peak Check-in</CardTitle>
                <CardDescription>The busiest hour for attendee arrivals.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-5xl font-bold">11:00 AM</div>
                <p className="text-xs text-muted-foreground">With {Math.max(...checkInData.map(d => d.checkins))} check-ins.</p>
            </CardContent>
         </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Check-in Trend</CardTitle>
          <CardDescription>Number of attendee check-ins per hour.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={checkInData}>
              <XAxis
                dataKey="time"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Bar dataKey="checkins" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Winners List</CardTitle>
          <CardDescription>List of all prize winners and their claim status.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Winner</TableHead>
                        <TableHead>Prize</TableHead>
                        <TableHead>Drawn At</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {winners.map(winner => (
                        <TableRow key={winner.attendee.id + winner.prize.id}>
                            <TableCell>
                                <div className="font-medium">{winner.attendee.name}</div>
                                <div className="text-sm text-muted-foreground">{winner.attendee.organization}</div>
                            </TableCell>
                            <TableCell>{winner.prize.name}</TableCell>
                            <TableCell>{new Date(winner.timestamp).toLocaleTimeString()}</TableCell>
                            <TableCell>
                                <Badge variant={winner.claimed ? 'default' : 'secondary'} className="gap-1">
                                    {winner.claimed ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3"/>}
                                    {winner.claimed ? 'Claimed' : 'Pending'}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

    </div>
  );
}
