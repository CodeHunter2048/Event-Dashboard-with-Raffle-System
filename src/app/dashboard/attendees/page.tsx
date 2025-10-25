'use client';

import { File, PlusCircle, Upload, Ticket } from 'lucide-react';
import Image from 'next/image';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { attendees, Attendee } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export default function AttendeesPage() {
  const generateTicket = async (attendee: Attendee) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [400, 150]
    });

    // Generate QR Code
    const qrCodeDataURL = await QRCode.toDataURL(attendee.id, {
      width: 80,
      margin: 2,
    });

    // Ticket Design
    doc.setFontSize(14);
    doc.text(`${attendee.id}`, 20, 40);
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${attendee.name}`, 20, 70);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(`${attendee.organization}`, 20, 90);
    
    doc.addImage(qrCodeDataURL, 'PNG', 300, 20, 80, 80);

    doc.setDrawColor(180, 180, 180);
    doc.line(10, 10, 390, 10); // Top
    doc.line(10, 140, 390, 140); // Bottom
    doc.line(10, 10, 10, 140); // Left
    doc.line(390, 10, 390, 140); // Right
    
    doc.save(`ticket-${attendee.id}.pdf`);
  };

  return (
    <Tabs defaultValue="all">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="checked-in">Checked-in</TabsTrigger>
          <TabsTrigger value="not-checked-in">Not Checked-in</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Export
            </span>
          </Button>
           <Button size="sm" variant="outline" className="h-8 gap-1">
            <Upload className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Import CSV
            </span>
          </Button>
          <Button size="sm" className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Add Attendee
            </span>
          </Button>
        </div>
      </div>
      <TabsContent value="all">
        <Card>
          <CardHeader>
            <CardTitle>Attendees</CardTitle>
            <CardDescription>
              Manage your event attendees and view their details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden w-[100px] sm:table-cell">
                    <span className="sr-only">Avatar</span>
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Role
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Checked-in at
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendees.map((attendee) => {
                  const avatar = PlaceHolderImages.find(p => p.id === `avatar${attendee.avatar}`);
                  return (
                    <TableRow key={attendee.id}>
                      <TableCell className="hidden sm:table-cell">
                        <Avatar className="h-10 w-10">
                          {avatar && <AvatarImage src={avatar.imageUrl} alt={attendee.name} data-ai-hint={avatar.imageHint} />}
                          <AvatarFallback>{attendee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{attendee.name} <div className="text-muted-foreground text-xs">{attendee.email}</div></TableCell>
                      <TableCell>{attendee.organization}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {attendee.role}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {attendee.checkedIn ? (
                          <Badge>
                            {new Date(attendee.checkInTime!).toLocaleTimeString()}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Not Yet</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                         <Button variant="outline" onClick={() => generateTicket(attendee)}>
                            <Ticket className="h-4 w-4 mr-2" />
                            Generate Ticket
                         </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}