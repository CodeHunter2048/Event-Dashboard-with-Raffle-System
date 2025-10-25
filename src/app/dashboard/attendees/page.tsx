'use client';

import { File, PlusCircle, Upload, Ticket, Printer } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function AttendeesPage() {
  const generateTicket = async (attendee: Attendee) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [450, 150]
    });
    
    // Generate QR Code
    const qrCodeDataURL = await QRCode.toDataURL(attendee.id, {
      width: 80,
      margin: 2,
      color: {
        dark: '#FFFFFF',
        light: '#00000000'
      }
    });

    // Add custom font (Inter) - jsPDF supports limited fonts, so we use a standard one
    doc.setFont('helvetica', 'sans-serif');
    
    // Background Gradient
    const gradient = doc.context2d.createLinearGradient(0, 0, 450, 150);
    gradient.addColorStop(0, '#1E293B');
    gradient.addColorStop(1, '#0f172a');
    doc.context2d.fillStyle = gradient;
    doc.rect(0, 0, 450, 150);
    doc.fill();

    // Accent line
    doc.setFillColor('#3B82F6');
    doc.rect(0, 0, 5, 150);
    doc.fill();
    
    // Attendee Info
    doc.setTextColor('#FFFFFF');
    doc.setFontSize(10);
    doc.text(`ID: ${attendee.id}`, 20, 30);
    
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(attendee.name, 20, 70);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#94A3B8');
    doc.text(attendee.organization, 20, 95);
    
    // QR Code
    doc.addImage(qrCodeDataURL, 'PNG', 340, 35, 80, 80);

    // Event Title
    doc.setFontSize(10);
    doc.setTextColor('#3B82F6');
    doc.text('AI for IA Conference', 345, 130);

    doc.save(`ticket-${attendee.id}.pdf`);
  };

  const generateAllTickets = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const ticketWidth = 190;
    const ticketHeight = 55;
    const pageMargin = 10;
    const ticketsPerPage = 5;
    let y = pageMargin;

    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i];
      if (i > 0 && i % ticketsPerPage === 0) {
        doc.addPage();
        y = pageMargin;
      }

      const qrCodeDataURL = await QRCode.toDataURL(attendee.id, {
        width: 120,
        margin: 1,
        color: {
          dark: '#FFFFFF',
          light: '#00000000'
        }
      });
      
      // Background Gradient
      const gradient = doc.context2d.createLinearGradient(pageMargin, y, ticketWidth + pageMargin, y + ticketHeight);
      gradient.addColorStop(0, '#1E3A8A');
      gradient.addColorStop(1, '#06B6D4');
      doc.context2d.fillStyle = gradient;
      doc.rect(pageMargin, y, ticketWidth, ticketHeight);
      doc.fill();
      
      doc.addImage(qrCodeDataURL, 'PNG', pageMargin + 140, y + 10, 35, 35);
      
      doc.setFont('helvetica', 'sans-serif');
      doc.setTextColor('#FFFFFF');

      doc.setFontSize(8);
      doc.text(`ID: ${attendee.id}`, pageMargin + 10, y + 15);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(attendee.name, pageMargin + 10, y + 28);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#E2E8F0');
      doc.text(attendee.organization, pageMargin + 10, y + 38);

      y += ticketHeight + 5;
    }

    doc.save('all-attendee-tickets.pdf');
  };

  return (
    <TooltipProvider>
    <Tabs defaultValue="all">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="checked-in">Checked-in</TabsTrigger>
          <TabsTrigger value="not-checked-in">Not Checked-in</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={generateAllTickets}>
            <Printer className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Export All Tickets
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => generateTicket(attendee)}>
                                <Ticket className="h-4 w-4" />
                                <span className="sr-only">Generate Ticket</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Generate Ticket</p>
                          </TooltipContent>
                        </Tooltip>
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
    </TooltipProvider>
  );
}
