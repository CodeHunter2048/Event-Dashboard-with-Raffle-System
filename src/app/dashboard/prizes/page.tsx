'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { MoreHorizontal, PlusCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Prize = {
  id: string;
  name: string;
  description: string;
  quantity: number;
  remaining: number;
  tier: 'Grand' | 'Major' | 'Minor';
  image?: string; // Path like /prizes/filename.png
  createdAt?: any;
  updatedAt?: any;
};

type PrizeFormData = {
  name: string;
  description: string;
  tier: 'Grand' | 'Major' | 'Minor';
  quantity: number;
  image?: string;
};

export default function PrizesPage() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [restockAmount, setRestockAmount] = useState<number>(0);
  const { toast } = useToast();

  const [formData, setFormData] = useState<PrizeFormData>({
    name: '',
    description: '',
    tier: 'Minor',
    quantity: 1,
    image: '',
  });

  // Fetch prizes from Firestore
  useEffect(() => {
    if (!db) {
      toast({
        title: 'Error',
        description: 'Firebase is not initialized',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'prizes'),
      (snapshot) => {
        const prizesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Prize[];
        
        // Sort by tier: Grand > Major > Minor
        const tierOrder = { Grand: 1, Major: 2, Minor: 3 };
        prizesData.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);
        
        setPrizes(prizesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching prizes:', error);
        toast({
          title: 'Error',
          description: 'Failed to load prizes',
          variant: 'destructive',
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      tier: 'Minor',
      quantity: 1,
      image: '',
    });
    setSelectedFile(null);
    setImagePreview('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file (JPEG, PNG, GIF, or WebP)',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 5MB',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);

      const response = await fetch('/api/upload-prize-image', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      return data.imagePath;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleAddPrize = async () => {
    if (!db) {
      toast({
        title: 'Error',
        description: 'Firebase is not initialized',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Prize name is required',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Upload image if selected
      let imagePath = formData.image || '';
      if (selectedFile) {
        const uploadedPath = await uploadImage();
        if (uploadedPath) {
          imagePath = uploadedPath;
        }
      }

      await addDoc(collection(db, 'prizes'), {
        name: formData.name.trim(),
        description: formData.description.trim(),
        tier: formData.tier,
        quantity: formData.quantity,
        remaining: formData.quantity, // Initially, all are remaining
        image: imagePath,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      toast({
        title: 'Success',
        description: 'Prize added successfully',
      });

      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding prize:', error);
      toast({
        title: 'Error',
        description: 'Failed to add prize',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPrize = async () => {
    if (!db || !selectedPrize) return;

    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Prize name is required',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const prizeRef = doc(db, 'prizes', selectedPrize.id);
      
      // Calculate new totals based on restock amount (only increases stock)
      const add = Math.max(0, Number.isFinite(restockAmount) ? restockAmount : 0);
      const newQuantity = selectedPrize.quantity + add;
      const newRemaining = Math.max(0, selectedPrize.remaining + add);

      // Upload new image if selected
      let imagePath = formData.image || selectedPrize.image || '';
      if (selectedFile) {
        const uploadedPath = await uploadImage();
        if (uploadedPath) {
          imagePath = uploadedPath;
        }
      }

      await updateDoc(prizeRef, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        tier: formData.tier,
        quantity: newQuantity,
        remaining: newRemaining,
        image: imagePath,
        updatedAt: Timestamp.now(),
      });

      toast({
        title: 'Success',
        description: 'Prize updated successfully',
      });

      setIsEditDialogOpen(false);
      setSelectedPrize(null);
      setRestockAmount(0);
      resetForm();
    } catch (error) {
      console.error('Error updating prize:', error);
      toast({
        title: 'Error',
        description: 'Failed to update prize',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePrize = async () => {
    if (!db || !selectedPrize) return;

    setSubmitting(true);
    try {
      await deleteDoc(doc(db, 'prizes', selectedPrize.id));

      toast({
        title: 'Success',
        description: 'Prize deleted successfully',
      });

      setIsDeleteDialogOpen(false);
      setSelectedPrize(null);
    } catch (error) {
      console.error('Error deleting prize:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete prize',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (prize: Prize) => {
    setSelectedPrize(prize);
    setFormData({
      name: prize.name,
      description: prize.description,
      tier: prize.tier,
      quantity: prize.quantity,
      image: prize.image || '',
    });
    setImagePreview(prize.image || '');
    setSelectedFile(null);
    setRestockAmount(0);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (prize: Prize) => {
    setSelectedPrize(prize);
    setIsDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading prizes...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prizes</h1>
          <p className="text-muted-foreground">
            Configure prizes for the random drawing.
          </p>
        </div>
        <Button
          className="gap-1"
          onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}
        >
          <PlusCircle className="h-4 w-4" />
          Add Prize
        </Button>
      </div>

      {prizes.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12">
          <p className="text-muted-foreground mb-4">No prizes yet. Add your first prize!</p>
          <Button
            onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Prize
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {prizes.map((prize) => {
            const image = PlaceHolderImages.find((p) => p.id === prize.image);
            return (
              <Card key={prize.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge
                        variant={
                          prize.tier === 'Grand'
                            ? 'default'
                            : prize.tier === 'Major'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="mb-2"
                      >
                        {prize.tier} Prize
                      </Badge>
                      <CardTitle>{prize.name}</CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openEditDialog(prize)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(prize)}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>{prize.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {prize.image ? (
                    <Image
                      alt={prize.name}
                      className="aspect-video w-full rounded-md object-cover"
                      height="300"
                      src={prize.image}
                      width="400"
                    />
                  ) : (
                    <div className="aspect-video w-full rounded-md bg-muted flex items-center justify-center">
                      <p className="text-muted-foreground text-sm">No image</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {prize.remaining} of {prize.quantity}
                    </span>{' '}
                    remaining
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Prize Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Prize</DialogTitle>
            <DialogDescription>
              Add a new prize to the raffle system. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tier">Prize Tier *</Label>
              <Select
                value={formData.tier}
                onValueChange={(value) =>
                  setFormData({ ...formData, tier: value as 'Grand' | 'Major' | 'Minor' })
                }
              >
                <SelectTrigger id="tier">
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Grand">Grand Prize</SelectItem>
                  <SelectItem value="Major">Major Prize</SelectItem>
                  <SelectItem value="Minor">Minor Prize</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Prize Name *</Label>
              <Input
                id="name"
                placeholder="e.g., AI-Powered Drone"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the prize"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image">Prize Image</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {imagePreview && (
                <div className="mt-2 relative w-full aspect-video rounded-md overflow-hidden border">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Max file size: 5MB. Supported formats: JPEG, PNG, GIF, WebP
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleAddPrize} disabled={submitting || uploading}>
              {submitting || uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? 'Uploading...' : 'Adding...'}
                </>
              ) : (
                'Add Prize'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Prize Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Prize</DialogTitle>
            <DialogDescription>
              Update the prize details and restock availability.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto flex-grow">
            <div className="grid gap-2">
              <Label htmlFor="edit-tier">Prize Tier *</Label>
              <Select
                value={formData.tier}
                onValueChange={(value) =>
                  setFormData({ ...formData, tier: value as 'Grand' | 'Major' | 'Minor' })
                }
              >
                <SelectTrigger id="edit-tier">
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Grand">Grand Prize</SelectItem>
                  <SelectItem value="Major">Major Prize</SelectItem>
                  <SelectItem value="Minor">Minor Prize</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Prize Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., AI-Powered Drone"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                placeholder="Brief description of the prize"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Current Stock</Label>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="p-2 rounded-md bg-muted">
                  <div className="text-muted-foreground">Total</div>
                  <div className="font-medium">{selectedPrize?.quantity ?? 0}</div>
                </div>
                <div className="p-2 rounded-md bg-muted">
                  <div className="text-muted-foreground">Remaining</div>
                  <div className="font-medium">{selectedPrize?.remaining ?? 0}</div>
                </div>
                <div className="p-2 rounded-md bg-muted">
                  <div className="text-muted-foreground">Claimed</div>
                  <div className="font-medium">{(selectedPrize ? (selectedPrize.quantity - selectedPrize.remaining) : 0)}</div>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="restock">Add Stock</Label>
              <Input
                id="restock"
                type="number"
                min={0}
                value={restockAmount}
                onChange={(e) => setRestockAmount(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <p className="text-xs text-muted-foreground">
                Enter how many new units you want to add to this prize. This increases both Total and Remaining.
              </p>
              <div className="text-xs text-muted-foreground">
                After save: Total {selectedPrize ? selectedPrize.quantity + restockAmount : restockAmount} • Remaining {selectedPrize ? selectedPrize.remaining + restockAmount : restockAmount}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-image">Prize Image</Label>
              <Input
                id="edit-image"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {imagePreview && (
                <div className="mt-2 relative w-full aspect-video rounded-md overflow-hidden border">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {selectedFile
                  ? 'New image selected. Will replace current image on save.'
                  : 'Upload a new image to replace the current one.'}
              </p>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedPrize(null);
                resetForm();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEditPrize} disabled={submitting || uploading}>
              {submitting || uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? 'Uploading...' : 'Updating...'}
                </>
              ) : (
                'Update Prize'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the prize &quot;{selectedPrize?.name}&quot;. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedPrize(null);
              }}
              disabled={submitting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePrize}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
