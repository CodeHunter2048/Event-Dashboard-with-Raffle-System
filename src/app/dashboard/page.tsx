'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  Users,
  Gift,
  CheckCircle,
} from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { db } from '@/lib/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import withAuth from '@/components/withAuth';
import { Attendee } from '@/lib/data';


function Dashboard() {
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [recentCheckins, setRecentCheckins] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    // Listener for all attendees to get total count
    const attendeesQuery = query(collection(db, 'attendees'));
    const unsubscribeTotal = onSnapshot(attendeesQuery, (snapshot) => {
      setTotalAttendees(snapshot.size);
    });

    // Listener for recently checked-in attendees
    const recentCheckinsQuery = query(
      collection(db, 'attendees'),
      where('checkedIn', '==', true),
      orderBy('checkInTime', 'desc'),
      limit(5)
    );

    const unsubscribeRecent = onSnapshot(recentCheckinsQuery, (snapshot) => {
      const checkinsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          organization: data.organization || '',
          role: data.role || '',
          avatar: data.avatar || '1',
          checkedIn: data.checkedIn || false,
          checkInTime: data.checkInTime ? new Date(data.checkInTime.seconds * 1000).toISOString() : null,
          createdAt: data.createdAt,
        } as Attendee;
      });
      setRecentCheckins(checkinsData);
      setLoading(false);
    });
    
    // Listener for checked-in count
    const checkedInQuery = query(collection(db, 'attendees'), where('checkedIn', '==', true));
    const unsubscribeCheckedIn = onSnapshot(checkedInQuery, (snapshot) => {
      setCheckedInCount(snapshot.size);
    });


    return () => {
      unsubscribeTotal();
      unsubscribeRecent();
      unsubscribeCheckedIn();
    };
  }, []);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Attendees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAttendees}</div>
            <p className="text-xs text-muted-foreground">
              Total registered for the event
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Checked-in
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checkedInCount}</div>
            <p className="text-xs text-muted-foreground">
              {`+${totalAttendees > 0 ? ((checkedInCount / totalAttendees) * 100).toFixed(0) : 0}% of total`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prizes Remaining</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              3 Grand prizes left
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Check-in Activity
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+52</div>
            <p className="text-xs text-muted-foreground">
              in the last hour
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Recent Check-ins</CardTitle>
              <CardDescription>
                The latest attendees to arrive at the event.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/dashboard/attendees">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attendee</TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Role
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Check-in Time
                  </TableHead>
                  <TableHead className="text-right">Organization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Loading recent check-ins...</TableCell>
                  </TableRow>
                ) : recentCheckins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No check-ins yet.</TableCell>
                  </TableRow>
                ) : (
                  recentCheckins.map((attendee) => {
                    const avatar = PlaceHolderImages.find(p => p.id === `avatar${attendee.avatar}`);
                    return (
                      <TableRow key={attendee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="hidden h-9 w-9 sm:flex">
                             {avatar && <AvatarImage src={avatar.imageUrl} alt="Avatar" data-ai-hint={avatar.imageHint} />}
                              <AvatarFallback>{attendee.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="grid gap-0.5">
                              <div className="font-medium">{attendee.name}</div>
                              <div className="hidden text-sm text-muted-foreground md:inline">
                                {attendee.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <Badge variant="outline">{attendee.role}</Badge>
                        </TableCell>
                         <TableCell className="hidden md:table-cell lg:hidden xl:table-cell">
                          {attendee.checkInTime ? new Date(attendee.checkInTime).toLocaleTimeString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {attendee.organization}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                    Manage your event on the fly.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <Link href="/dashboard/check-in" passHref>
                    <Button className="w-full" size="lg">Start Check-in</Button>
                </Link>
                <Link href="/dashboard/drawing" passHref>
                    <Button className="w-full" size="lg" variant="secondary">Start Prize Drawing</Button>
                </Link>
                <Link href="/display" target="_blank" passHref>
                    <Button className="w-full" size="lg" variant="outline">Launch Public Display</Button>
                </Link>
            </CardContent>
        </Card>
      </div>
    </>
  );
}

export default withAuth(Dashboard);
