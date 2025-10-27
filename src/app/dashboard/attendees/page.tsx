'use client';

import { useEffect, useState, useRef } from 'react';
import { File, PlusCircle, Upload, Ticket, Printer, Trash2, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Attendee } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp,
  getDocs,
  where,
  deleteDoc,
  doc
} from 'firebase/firestore';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ImportedAttendee {
  name: string;
  organization: string;
  role: string;
  email?: string;
}

export default function AttendeesPage() {
  const { toast } = useToast();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    role: '',
  });
  
  // Filter states
  const [nameFilter, setNameFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [checkedInFilter, setCheckedInFilter] = useState<'all' | 'checked' | 'not-checked'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Real-time listener for attendees
  useEffect(() => {
    if (!db) return;

    const attendeesRef = collection(db, 'attendees');
    const q = query(attendeesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const attendeesData = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Safely handle checkInTime conversion
        let checkInTimeISO = null;
        try {
          if (data.checkInTime) {
            if (typeof data.checkInTime.toDate === 'function') {
              checkInTimeISO = data.checkInTime.toDate().toISOString();
            } else if (typeof data.checkInTime === 'string') {
              checkInTimeISO = data.checkInTime;
            }
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
          avatar: data.avatar || 1,
          checkedIn: data.checkedIn || false,
          checkInTime: checkInTimeISO,
          createdAt: data.createdAt,
        } as Attendee;
      });
      setAttendees(attendeesData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching attendees:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch attendees.',
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  // Filter attendees based on filter criteria
  const getFilteredAttendees = (attendeesList: Attendee[]) => {
    return attendeesList.filter(attendee => {
      const matchesName = !nameFilter || attendee.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesOrg = !organizationFilter || attendee.organization.toLowerCase().includes(organizationFilter.toLowerCase());
      const matchesRole = !roleFilter || attendee.role.toLowerCase().includes(roleFilter.toLowerCase());
      const matchesCheckedIn = checkedInFilter === 'all' || 
        (checkedInFilter === 'checked' && attendee.checkedIn) ||
        (checkedInFilter === 'not-checked' && !attendee.checkedIn);
      
      return matchesName && matchesOrg && matchesRole && matchesCheckedIn;
    });
  };

  // Check if attendee name already exists (case-insensitive)
  const isDuplicateName = (name: string): boolean => {
    const normalizedName = name.trim().toLowerCase();
    return attendees.some(attendee => 
      attendee.name.trim().toLowerCase() === normalizedName
    );
  };

  const handleAddAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    // Check for duplicate
    if (isDuplicateName(formData.name)) {
      toast({
        variant: 'destructive',
        title: 'Duplicate Entry',
        description: `An attendee named "${formData.name}" already exists.`,
      });
      return;
    }

    try {
      await addDoc(collection(db, 'attendees'), {
        name: formData.name.trim(),
        email: '', // Can be added later if needed
        organization: formData.organization.trim(),
        role: formData.role.trim(),
        avatar: Math.floor(Math.random() * 10) + 1, // Random avatar
        checkedIn: false,
        checkInTime: null,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Success',
        description: 'Attendee added successfully.',
      });

      setDialogOpen(false);
      setFormData({
        name: '',
        organization: '',
        role: '',
      });
    } catch (error: any) {
      console.error('Error adding attendee:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add attendee.',
      });
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      // Parse CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processImportedData(results.data as ImportedAttendee[]);
        },
        error: (error) => {
          toast({
            variant: 'destructive',
            title: 'CSV Parse Error',
            description: error.message,
          });
        },
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Parse XLSX
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ImportedAttendee[];
          processImportedData(jsonData);
        } catch (error: any) {
          toast({
            variant: 'destructive',
            title: 'Excel Parse Error',
            description: error.message,
          });
        }
      };
      reader.readAsBinaryString(file);
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please upload a CSV or XLSX file.',
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processImportedData = async (data: ImportedAttendee[]) => {
    if (!db) return;

    setImporting(true);
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    try {
      for (const row of data) {
        // Validate required fields
        if (!row.name || !row.organization || !row.role) {
          errorCount++;
          continue;
        }

        // Check for duplicates
        if (isDuplicateName(row.name)) {
          duplicateCount++;
          continue;
        }

        // Add to Firestore
        try {
          await addDoc(collection(db, 'attendees'), {
            name: row.name.trim(),
            email: row.email?.trim() || '',
            organization: row.organization.trim(),
            role: row.role.trim(),
            avatar: Math.floor(Math.random() * 10) + 1,
            checkedIn: false,
            checkInTime: null,
            createdAt: serverTimestamp(),
          });
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      // Show summary toast
      const messages = [];
      if (successCount > 0) messages.push(`${successCount} added`);
      if (duplicateCount > 0) messages.push(`${duplicateCount} duplicates skipped`);
      if (errorCount > 0) messages.push(`${errorCount} errors`);

      toast({
        title: successCount > 0 ? 'Import Complete' : 'Import Failed',
        description: messages.join(', '),
        variant: successCount > 0 ? 'default' : 'destructive',
      });

      setImportDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Import Error',
        description: error.message || 'Failed to import attendees.',
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      { name: 'John Doe', organization: 'Acme Corp', role: 'Software Engineer', email: 'john@example.com' },
      { name: 'Jane Smith', organization: 'Tech Inc', role: 'Product Manager', email: 'jane@example.com' },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendees');
    XLSX.writeFile(workbook, 'attendees_template.xlsx');
  };

  const toggleSelectAttendee = (attendeeId: string) => {
    const newSelected = new Set(selectedAttendees);
    if (newSelected.has(attendeeId)) {
      newSelected.delete(attendeeId);
    } else {
      newSelected.add(attendeeId);
    }
    setSelectedAttendees(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedAttendees.size === attendees.length) {
      setSelectedAttendees(new Set());
    } else {
      setSelectedAttendees(new Set(attendees.map(a => a.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (!db || selectedAttendees.size === 0) return;

    setDeleting(true);
    try {
      // Delete each attendee
      const deletePromises = Array.from(selectedAttendees).map((attendeeId) => {
        const attendeeRef = doc(db!, 'attendees', attendeeId);
        return deleteDoc(attendeeRef);
      });

      await Promise.all(deletePromises);

      toast({
        title: 'Success',
        description: `${selectedAttendees.size} attendee(s) deleted successfully.`,
      });

      setSelectedAttendees(new Set());
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Error deleting attendees:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete attendees.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const generateTicket = async (attendee: Attendee) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [210, 50] // Smaller height to fit more tickets
    });
    
    // Generate QR Code
    const qrCodeDataURL = await QRCode.toDataURL(attendee.id, {
      width: 150,
      margin: 1,
      color: {
        dark: '#2B5F6F', // Deep Teal Blue
        light: '#FFFFFF'
      }
    });

    // Load logo image
    const logoUrl = '/logo.png'; // Fixed: Changed from aioria-logo.png to logo.png
    let logoDataURL = '';
    try {
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      logoDataURL = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Logo could not be loaded, continuing without it');
    }

    // Cream/Beige Background
    doc.setFillColor('#F5F1E3');
    doc.rect(0, 0, 210, 50, 'F');

    // Deep Teal Blue accent bar on left
    doc.setFillColor('#2B5F6F');
    doc.rect(0, 0, 6, 50, 'F');

    // Warm Orange decorative line
    doc.setFillColor('#D4833C');
    doc.rect(6, 0, 1.5, 50, 'F');

    // Logo (if loaded)
    if (logoDataURL) {
      doc.addImage(logoDataURL, 'PNG', 12, 5, 18, 18);
    }

    // Event Branding Section (shifted right if logo present)
    const textStartX = logoDataURL ? 33 : 12;
    
  // AI FOR IA - single line with consistent size and color spacing measured
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);

  const titleY = 14;
  const gap = 2; // even gap between words in mm

  // AI
  doc.setTextColor('#2B5F6F'); // Deep Teal Blue
  doc.text('AI', textStartX, titleY);
  const aiWidth = doc.getTextWidth('AI');

  // FOR
  const forX = textStartX + aiWidth + gap;
  doc.setTextColor('#D4833C'); // Warm Orange
  doc.text('FOR', forX, titleY);
  const forWidth = doc.getTextWidth('FOR');

  // IA
  const iaX = forX + forWidth + gap;
  doc.setTextColor('#A4464B'); // Burgundy Red
  doc.text('IA', iaX, titleY);

    // UNITING INDUSTRY-ACADEMIA THROUGH ARTIFICIAL INTELLIGENCE - single line, bold
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor('#2B5F6F'); // Deep Teal Blue
    doc.text('UNITING INDUSTRY-ACADEMIA THROUGH ARTIFICIAL INTELLIGENCE', textStartX, 21);

    // Decorative line separator
    doc.setDrawColor('#D4833C');
    doc.setLineWidth(0.4);
    doc.line(12, 26, 85, 26);

    // Attendee Info Section
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#666666');
    doc.text(`ID: ${attendee.id.substring(0, 12)}...`, 12, 31);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#2B5F6F'); // Deep Teal Blue
    doc.text(attendee.name, 12, 39, { maxWidth: 75 });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#A4464B'); // Burgundy Red
    doc.text(attendee.organization, 12, 43, { maxWidth: 75 });

    // QR Code Section (Right Side)
    doc.addImage(qrCodeDataURL, 'PNG', 165, 8, 35, 35);
    
    doc.setFontSize(6);
    doc.setTextColor('#666666');
    doc.setFont('helvetica', 'normal');
    const qrText = 'Scan for Check-in';
    const qrTextWidth = doc.getTextWidth(qrText);
    doc.text(qrText, 182.5 - (qrTextWidth / 2), 46);

    // Burgundy decorative corner
    doc.setFillColor('#A4464B');
    doc.triangle(210, 0, 210, 6, 204, 0, 'F');
    doc.triangle(0, 50, 6, 50, 0, 44, 'F');

    doc.save(`ticket-${attendee.name.replace(/\s+/g, '-')}.pdf`);
  };

  const generateAllTickets = async () => {
    const filteredAttendees = getFilteredAttendees(attendees);
    
    if (filteredAttendees.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Attendees',
        description: 'No attendees match the current filters.',
      });
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Load logo image once
    const logoUrl = '/logo.png'; // Fixed: Changed from aioria-logo.png to logo.png
    let logoDataURL = '';
    try {
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      logoDataURL = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Logo could not be loaded, continuing without it');
    }

    const ticketWidth = 190;
    const ticketHeight = 27; // Smaller height to fit 10 tickets per page
    const pageMargin = 10;
    const pageHeight = doc.internal.pageSize.getHeight();
    const ticketSpacing = 2;
    let y = pageMargin;
    let isFirstTicket = true;

    for (let i = 0; i < filteredAttendees.length; i++) {
      const attendee = filteredAttendees[i];
      
      if (!isFirstTicket && y + ticketHeight > pageHeight - pageMargin) {
        doc.addPage();
        y = pageMargin;
      }
      isFirstTicket = false;

      const qrCodeDataURL = await QRCode.toDataURL(attendee.id, {
        width: 120,
        margin: 1,
        color: {
          dark: '#2B5F6F',
          light: '#FFFFFF'
        }
      });
      
      // Cream/Beige Background
      doc.setFillColor('#F5F1E3');
      doc.rect(pageMargin, y, ticketWidth, ticketHeight, 'F');

      // Deep Teal Blue accent bar
      doc.setFillColor('#2B5F6F');
      doc.rect(pageMargin, y, 4, ticketHeight, 'F');

      // Warm Orange decorative line
      doc.setFillColor('#D4833C');
      doc.rect(pageMargin + 4, y, 1, ticketHeight, 'F');

      // Logo (if loaded)
      if (logoDataURL) {
        doc.addImage(logoDataURL, 'PNG', pageMargin + 8, y + 2.5, 15, 15);
      }

      // Event Branding (shifted right if logo present)
      const textStartX = logoDataURL ? pageMargin + 26 : pageMargin + 8;
      
  // AI FOR IA - single line; compute widths to keep even spacing
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);

  const titleYSmall = y + 9;
  const gapSmall = 1.8; // even gap between words

  // AI
  doc.setTextColor('#2B5F6F');
  doc.text('AI', textStartX, titleYSmall);
  const aiWidthSmall = doc.getTextWidth('AI');

  // FOR
  const forXSmall = textStartX + aiWidthSmall + gapSmall;
  doc.setTextColor('#D4833C');
  doc.text('FOR', forXSmall, titleYSmall);
  const forWidthSmall = doc.getTextWidth('FOR');

  // IA
  const iaXSmall = forXSmall + forWidthSmall + gapSmall;
  doc.setTextColor('#A4464B');
  doc.text('IA', iaXSmall, titleYSmall);

      // UNITING INDUSTRY-ACADEMIA THROUGH ARTIFICIAL INTELLIGENCE - single line, bold
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor('#2B5F6F');
      doc.text('UNITING INDUSTRY-ACADEMIA THROUGH ARTIFICIAL INTELLIGENCE', textStartX, y + 14);

      // Attendee Info
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#2B5F6F');
      doc.text(attendee.name, pageMargin + 8, y + 21, { maxWidth: 115 });

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#A4464B');
      doc.text(attendee.organization, pageMargin + 8, y + 24, { maxWidth: 115 });

      // QR Code
      doc.addImage(qrCodeDataURL, 'PNG', pageMargin + 165, y + 4, 20, 20);
      
      doc.setFontSize(5);
      doc.setTextColor('#666666');
      const qrText = 'Scan';
      const qrTextWidth = doc.getTextWidth(qrText);
      doc.text(qrText, pageMargin + 175 - (qrTextWidth / 2), y + 25);

      // Decorative corners
      doc.setFillColor('#A4464B');
      doc.triangle(pageMargin + ticketWidth, y, pageMargin + ticketWidth, y + 4, pageMargin + ticketWidth - 4, y, 'F');
      doc.triangle(pageMargin, y + ticketHeight, pageMargin + 4, y + ticketHeight, pageMargin, y + ticketHeight - 4, 'F');

      y += ticketHeight + ticketSpacing;
    }

    doc.save('all-attendee-tickets.pdf');
    
    toast({
      title: 'Success',
      description: `Exported ${filteredAttendees.length} ticket(s) successfully.`,
    });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <Tabs defaultValue="all">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">All ({getFilteredAttendees(attendees).length})</TabsTrigger>
          <TabsTrigger value="checked-in">
            Checked-in ({getFilteredAttendees(attendees.filter(a => a.checkedIn)).length})
          </TabsTrigger>
          <TabsTrigger value="not-checked-in">
            Not Checked-in ({getFilteredAttendees(attendees.filter(a => !a.checkedIn)).length})
          </TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          {selectedAttendees.size > 0 && (
            <Button 
              size="sm" 
              variant="destructive" 
              className="h-8 gap-1"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Delete ({selectedAttendees.size})
              </span>
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={generateAllTickets}>
            <Printer className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Export Filtered Tickets ({getFilteredAttendees(attendees).length})
            </span>
          </Button>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1">
                <Upload className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Import CSV
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Attendees</DialogTitle>
                <DialogDescription>
                  Upload a CSV or XLSX file with attendee information. Duplicates will be skipped automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>File Format</Label>
                  <p className="text-sm text-muted-foreground">
                    Required columns: <strong>name</strong>, <strong>organization/section</strong>, <strong>role</strong>
                    <br />
                    Optional: email
                  </p>
                </div>
                <div className="grid gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileImport}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label htmlFor="file-upload">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={importing}
                      asChild
                    >
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        {importing ? 'Importing...' : 'Choose File'}
                      </span>
                    </Button>
                  </Label>
                </div>
                <div className="grid gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={downloadTemplate}
                  >
                    Download Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add Attendee
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddAttendee}>
                <DialogHeader>
                  <DialogTitle>Add New Attendee</DialogTitle>
                  <DialogDescription>
                    Add a new attendee to the event.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="organization">Organization/Section</Label>
                    <Input
                      id="organization"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      required
                      placeholder="Company Name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      required
                      placeholder="Software Engineer"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Add Attendee</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
            {/* Filter Section */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-8"
                >
                  <Filter className="h-3.5 w-3.5 mr-2" />
                  Filters
                  {showFilters ? <ChevronUp className="h-3.5 w-3.5 ml-2" /> : <ChevronDown className="h-3.5 w-3.5 ml-2" />}
                </Button>
                {(nameFilter || organizationFilter || roleFilter || checkedInFilter !== 'all') && (
                  <>
                    <Badge variant="secondary" className="text-xs">
                      {[nameFilter, organizationFilter, roleFilter, checkedInFilter !== 'all' ? 'status' : ''].filter(Boolean).length} active
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNameFilter('');
                        setOrganizationFilter('');
                        setRoleFilter('');
                        setCheckedInFilter('all');
                      }}
                      className="h-7"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </>
                )}
              </div>
              
              {showFilters && (
                <div className="mt-3 p-3 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label htmlFor="name-filter" className="text-xs mb-1">Name</Label>
                      <Input
                        id="name-filter"
                        placeholder="Filter by name..."
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="org-filter" className="text-xs mb-1">Organization</Label>
                      <Input
                        id="org-filter"
                        placeholder="Filter by organization..."
                        value={organizationFilter}
                        onChange={(e) => setOrganizationFilter(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role-filter" className="text-xs mb-1">Role</Label>
                      <Input
                        id="role-filter"
                        placeholder="Filter by role..."
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="checkin-filter" className="text-xs mb-1">Check-in Status</Label>
                      <select
                        id="checkin-filter"
                        value={checkedInFilter}
                        onChange={(e) => setCheckedInFilter(e.target.value as 'all' | 'checked' | 'not-checked')}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                      >
                        <option value="all">All</option>
                        <option value="checked">Checked-in</option>
                        <option value="not-checked">Not Checked-in</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        getFilteredAttendees(attendees).length > 0 &&
                        getFilteredAttendees(attendees).every(a => selectedAttendees.has(a.id))
                      }
                      onCheckedChange={() => {
                        const filtered = getFilteredAttendees(attendees);
                        const allSelected = filtered.every(a => selectedAttendees.has(a.id));
                        const newSelected = new Set(selectedAttendees);
                        
                        if (allSelected) {
                          filtered.forEach(a => newSelected.delete(a.id));
                        } else {
                          filtered.forEach(a => newSelected.add(a.id));
                        }
                        setSelectedAttendees(newSelected);
                      }}
                    />
                  </TableHead>
                  <TableHead className="hidden w-[100px] sm:table-cell">
                    <span className="sr-only">Avatar</span>
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Organization/Section</TableHead>
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
                {getFilteredAttendees(attendees).map((attendee) => {
                  const avatar = PlaceHolderImages.find(p => p.id === `avatar${attendee.avatar}`);
                  return (
                    <TableRow key={attendee.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedAttendees.has(attendee.id)}
                          onCheckedChange={() => toggleSelectAttendee(attendee.id)}
                        />
                      </TableCell>
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
                        {attendee.checkedIn && attendee.checkInTime ? (
                          <Badge>
                            {(() => {
                              try {
                                const date = new Date(attendee.checkInTime);
                                if (isNaN(date.getTime())) {
                                  return 'Invalid Date';
                                }
                                return date.toLocaleTimeString();
                              } catch (e) {
                                return 'Invalid Date';
                              }
                            })()}
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
      <TabsContent value="checked-in">
        <Card>
          <CardHeader>
            <CardTitle>Checked-in Attendees</CardTitle>
            <CardDescription>
              Attendees who have checked in to the event.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filter Section */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-8"
                >
                  <Filter className="h-3.5 w-3.5 mr-2" />
                  Filters
                  {showFilters ? <ChevronUp className="h-3.5 w-3.5 ml-2" /> : <ChevronDown className="h-3.5 w-3.5 ml-2" />}
                </Button>
                {(nameFilter || organizationFilter || roleFilter) && (
                  <>
                    <Badge variant="secondary" className="text-xs">
                      {[nameFilter, organizationFilter, roleFilter].filter(Boolean).length} active
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNameFilter('');
                        setOrganizationFilter('');
                        setRoleFilter('');
                      }}
                      className="h-7"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </>
                )}
              </div>
              
              {showFilters && (
                <div className="mt-3 p-3 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="name-filter-checked" className="text-xs mb-1">Name</Label>
                      <Input
                        id="name-filter-checked"
                        placeholder="Filter by name..."
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="org-filter-checked" className="text-xs mb-1">Organization</Label>
                      <Input
                        id="org-filter-checked"
                        placeholder="Filter by organization..."
                        value={organizationFilter}
                        onChange={(e) => setOrganizationFilter(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role-filter-checked" className="text-xs mb-1">Role</Label>
                      <Input
                        id="role-filter-checked"
                        placeholder="Filter by role..."
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        getFilteredAttendees(attendees.filter(a => a.checkedIn)).length > 0 &&
                        getFilteredAttendees(attendees.filter(a => a.checkedIn)).every(a => selectedAttendees.has(a.id))
                      }
                      onCheckedChange={() => {
                        const filtered = getFilteredAttendees(attendees.filter(a => a.checkedIn));
                        const allSelected = filtered.every(a => selectedAttendees.has(a.id));
                        const newSelected = new Set(selectedAttendees);
                        
                        if (allSelected) {
                          filtered.forEach(a => newSelected.delete(a.id));
                        } else {
                          filtered.forEach(a => newSelected.add(a.id));
                        }
                        setSelectedAttendees(newSelected);
                      }}
                    />
                  </TableHead>
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
                {getFilteredAttendees(attendees.filter(a => a.checkedIn)).map((attendee) => {
                  const avatar = PlaceHolderImages.find(p => p.id === `avatar${attendee.avatar}`);
                  return (
                    <TableRow key={attendee.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedAttendees.has(attendee.id)}
                          onCheckedChange={() => toggleSelectAttendee(attendee.id)}
                        />
                      </TableCell>
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
                        {attendee.checkedIn && attendee.checkInTime ? (
                          <Badge>
                            {(() => {
                              try {
                                const date = new Date(attendee.checkInTime);
                                if (isNaN(date.getTime())) {
                                  return 'Invalid Date';
                                }
                                return date.toLocaleTimeString();
                              } catch (e) {
                                return 'Invalid Date';
                              }
                            })()}
                          </Badge>
                        ) : null}
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
      <TabsContent value="not-checked-in">
        <Card>
          <CardHeader>
            <CardTitle>Not Checked-in Attendees</CardTitle>
            <CardDescription>
              Attendees who have not checked in to the event yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filter Section */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-8"
                >
                  <Filter className="h-3.5 w-3.5 mr-2" />
                  Filters
                  {showFilters ? <ChevronUp className="h-3.5 w-3.5 ml-2" /> : <ChevronDown className="h-3.5 w-3.5 ml-2" />}
                </Button>
                {(nameFilter || organizationFilter || roleFilter) && (
                  <>
                    <Badge variant="secondary" className="text-xs">
                      {[nameFilter, organizationFilter, roleFilter].filter(Boolean).length} active
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNameFilter('');
                        setOrganizationFilter('');
                        setRoleFilter('');
                      }}
                      className="h-7"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </>
                )}
              </div>
              
              {showFilters && (
                <div className="mt-3 p-3 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="name-filter-not-checked" className="text-xs mb-1">Name</Label>
                      <Input
                        id="name-filter-not-checked"
                        placeholder="Filter by name..."
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="org-filter-not-checked" className="text-xs mb-1">Organization</Label>
                      <Input
                        id="org-filter-not-checked"
                        placeholder="Filter by organization..."
                        value={organizationFilter}
                        onChange={(e) => setOrganizationFilter(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role-filter-not-checked" className="text-xs mb-1">Role</Label>
                      <Input
                        id="role-filter-not-checked"
                        placeholder="Filter by role..."
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        getFilteredAttendees(attendees.filter(a => !a.checkedIn)).length > 0 &&
                        getFilteredAttendees(attendees.filter(a => !a.checkedIn)).every(a => selectedAttendees.has(a.id))
                      }
                      onCheckedChange={() => {
                        const filtered = getFilteredAttendees(attendees.filter(a => !a.checkedIn));
                        const allSelected = filtered.every(a => selectedAttendees.has(a.id));
                        const newSelected = new Set(selectedAttendees);
                        
                        if (allSelected) {
                          filtered.forEach(a => newSelected.delete(a.id));
                        } else {
                          filtered.forEach(a => newSelected.add(a.id));
                        }
                        setSelectedAttendees(newSelected);
                      }}
                    />
                  </TableHead>
                  <TableHead className="hidden w-[100px] sm:table-cell">
                    <span className="sr-only">Avatar</span>
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Role
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Status
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredAttendees(attendees.filter(a => !a.checkedIn)).map((attendee) => {
                  const avatar = PlaceHolderImages.find(p => p.id === `avatar${attendee.avatar}`);
                  return (
                    <TableRow key={attendee.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedAttendees.has(attendee.id)}
                          onCheckedChange={() => toggleSelectAttendee(attendee.id)}
                        />
                      </TableCell>
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
                        <Badge variant="secondary">Not Yet</Badge>
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
    
    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Attendees</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {selectedAttendees.size} attendee(s)? 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </TooltipProvider>
  );
}
