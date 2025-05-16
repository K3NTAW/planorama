"use client";
import React, { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader, UploadCloud, CheckCircle, Trash2, Pencil } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { uploadToCloudinary } from "@/lib/cloudinary";

interface TripEditDialogProps {
  tripId: string;
  onTripUpdated?: () => void;
  onOpenChange?: (open: boolean) => void;
}

export function TripEditDialog({ tripId, onTripUpdated, onOpenChange }: TripEditDialogProps) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    bannerUrl: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerProgress, setBannerProgress] = useState(0);
  const [isBannerDragging, setIsBannerDragging] = useState(false);

  const fetchTripData = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`);
      const data = await res.json();
      setEditForm({
        name: data.name || '',
        destination: data.destination || '',
        startDate: data.startDate ? data.startDate.slice(0, 10) : '',
        endDate: data.endDate ? data.endDate.slice(0, 10) : '',
        bannerUrl: data.bannerUrl || '',
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleEditOpen = () => {
    setEditOpen(true);
    onOpenChange?.(true);
    // Fetch data after dialog is opened
    fetchTripData();
  };

  const handleEditClose = () => {
    setEditOpen(false);
    onOpenChange?.(false);
  };

  const handleRemoveBanner = () => {
    setEditForm(prev => ({ ...prev, bannerUrl: '' }));
    setBannerPreview(null);
    setBannerFile(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    const res = await fetch(`/api/trips/${tripId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editForm,
        bannerUrl: editForm.bannerUrl || null,
      }),
    });
    setEditLoading(false);
    if (res.ok) {
      const updated = await res.json();
      setEditOpen(false);
      toast({ title: 'Trip updated', description: 'Trip details updated successfully.' });
      onTripUpdated?.();
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: 'Failed to update trip', description: data.error || 'Something went wrong.', variant: 'destructive' });
    }
  };

  async function handleBannerUpload(file: File) {
    if (!file) return;
    setBannerUploading(true);
    setBannerProgress(0);
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    // Simulate progress
    const progressInterval = setInterval(() => {
      setBannerProgress((prev) => Math.min(prev + Math.random() * 20, 95));
    }, 300);
    try {
      const result = await uploadToCloudinary(file, "trip-banners");
      clearInterval(progressInterval);
      if (result?.secure_url) {
        setEditForm((prev) => ({ ...prev, bannerUrl: result.secure_url }));
        setBannerProgress(100);
      } else {
        setEditForm((prev) => ({ ...prev, bannerUrl: "" }));
        setBannerProgress(0);
      }
    } catch (e) {
      clearInterval(progressInterval);
      setEditForm((prev) => ({ ...prev, bannerUrl: "" }));
      setBannerProgress(0);
    } finally {
      setBannerUploading(false);
    }
  }

  function handleBannerFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleBannerUpload(file);
  }

  function handleBannerDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsBannerDragging(true);
  }

  function handleBannerDragLeave() {
    setIsBannerDragging(false);
  }

  function handleBannerDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsBannerDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleBannerUpload(file);
  }

  return (
    <Dialog open={editOpen} onOpenChange={(open) => {
      if (open) {
        handleEditOpen();
      } else {
        handleEditClose();
      }
    }}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader className="animate-spin text-blue-500 mb-4" />
            <span className="text-sm text-gray-500">Loading trip data...</span>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Edit Trip</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" value={editForm.name} onChange={handleEditChange} required />
              </div>
              <div>
                <Label htmlFor="destination">Destination</Label>
                <Input id="destination" name="destination" value={editForm.destination} onChange={handleEditChange} required />
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" name="startDate" type="date" value={editForm.startDate} onChange={handleEditChange} required />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" name="endDate" type="date" value={editForm.endDate} onChange={handleEditChange} required />
              </div>
              <div>
                <Label>Banner Image</Label>
                <div
                  className={cn(
                    "relative flex flex-col items-center justify-center border-2 border-dashed rounded-md p-4 cursor-pointer transition-colors",
                    isBannerDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
                  )}
                  onDragOver={handleBannerDragOver}
                  onDragLeave={handleBannerDragLeave}
                  onDrop={handleBannerDrop}
                  onClick={() => document.getElementById('edit-banner-input')?.click()}
                  style={{ minHeight: 120 }}
                >
                  <input
                    id="edit-banner-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerFileChange}
                  />
                  {bannerUploading ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <Loader className="animate-spin text-blue-500" />
                      <Progress value={bannerProgress} className="w-full" />
                      <span className="text-xs text-gray-500">Uploading...</span>
                    </div>
                  ) : editForm.bannerUrl ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <Image
                        src={editForm.bannerUrl}
                        alt="Banner Preview"
                        width={400}
                        height={100}
                        className="rounded border"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={14} /> Uploaded</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveBanner();
                          }}
                        >
                          <Trash2 size={14} className="mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : bannerPreview ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <Image
                        src={bannerPreview}
                        alt="Banner Preview"
                        width={400}
                        height={100}
                        className="rounded border"
                      />
                      <span className="text-xs text-gray-500">Preview</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <UploadCloud size={32} className="text-gray-400" />
                      <span className="text-xs text-gray-500">Drag & drop or click to upload</span>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</Button>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
} 