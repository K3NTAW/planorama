"use client";
import React, { useEffect, useState } from "react";
import { ShareTripButton } from "@/components/ui/ShareTripButton";
import { TripDeleteButtonWithConfirm } from "@/components/ui/TripDeleteButtonWithConfirm";
import { create, StateCreator } from 'zustand';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, User as UserIcon, UploadCloud, Loader, CheckCircle } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { uploadToCloudinary } from "@/lib/cloudinary";

interface Collaborator {
  userId: string;
  user?: { firstName?: string; lastName?: string; email?: string; avatarUrl?: string };
  canEdit?: boolean;
}

interface TripCollaboratorsState {
  collaboratorsByTrip: Record<string, Collaborator[]>;
  loadingByTrip: Record<string, boolean>;
  fetchCollaborators: (tripId: string) => Promise<void>;
}

export const useTripCollaboratorsStore = create<TripCollaboratorsState>(((set: any, get: any) => ({
  collaboratorsByTrip: {},
  loadingByTrip: {},
  async fetchCollaborators(tripId: string) {
    set((state: TripCollaboratorsState) => ({ loadingByTrip: { ...state.loadingByTrip, [tripId]: true } }));
    const res = await fetch(`/api/trips/${tripId}/share`);
    const data = res.ok ? await res.json() : [];
    set((state: TripCollaboratorsState) => ({
      collaboratorsByTrip: { ...state.collaboratorsByTrip, [tripId]: Array.isArray(data) ? data : [] },
      loadingByTrip: { ...state.loadingByTrip, [tripId]: false },
    }));
  },
})) as StateCreator<TripCollaboratorsState>);

export function TripSettingsTab({ tripId }: { tripId: string }) {
  const { collaboratorsByTrip, loadingByTrip, fetchCollaborators } = useTripCollaboratorsStore();
  const collaborators: Collaborator[] = collaboratorsByTrip[tripId] || [];
  const loading: boolean = loadingByTrip[tripId] ?? true;
  const { toast } = useToast();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [trip, setTrip] = useState<null | {
    id: string;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    bannerUrl: string | null;
  }>(null);
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

  useEffect(() => {
    if (!collaboratorsByTrip[tripId]) {
      fetchCollaborators(tripId);
    }
  }, [tripId, fetchCollaborators, collaboratorsByTrip]);

  const fetchTripData = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`);
      const data = await res.json();
      setTrip(data);
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

  const handleEditOpen = async () => {
    await fetchTripData();
    setEditOpen(true);
  };

  const handleRemoveBanner = () => {
    setEditForm(prev => ({ ...prev, bannerUrl: '' }));
    setBannerPreview(null);
    setBannerFile(null);
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this collaborator?')) return;
    setRemovingId(userId);
    const res = await fetch(`/api/trips/${tripId}/share`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId }),
    });
    setRemovingId(null);
    if (res.ok) {
      fetchCollaborators(tripId);
      toast({ title: 'Collaborator removed' });
    } else {
      toast({ title: 'Failed to remove', variant: 'destructive' });
    }
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
      setTrip(updated);
      setEditOpen(false);
      toast({ title: 'Trip updated', description: 'Trip details updated successfully.' });
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

  if (loading) {
    return <CollaboratorsSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg w-full mx-auto p-2 sm:p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Invite Collaborators</CardTitle>
        </CardHeader>
        <CardContent>
          <ShareTripButton tripId={tripId} />
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Collaborators</CardTitle>
        </CardHeader>
        <CardContent>
          {collaborators.length === 0 ? (
            <div className="text-gray-500 text-sm">No collaborators yet.</div>
          ) : (
            <ul className="flex flex-col gap-3">
              {collaborators.map((c: Collaborator) => (
                <li key={c.userId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={c.user?.avatarUrl || ''} alt={c.user?.firstName || ''} />
                    <AvatarFallback>
                      {c.user?.firstName?.[0] || <UserIcon size={18} />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.user?.firstName || ''} {c.user?.lastName || ''}</div>
                    <div className="text-xs text-gray-500 truncate">{c.user?.email}</div>
                  </div>
                  {c.canEdit && (
                    <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800 border border-green-300">Can Edit</span>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="ml-2"
                    onClick={() => handleRemove(c.userId)}
                    disabled={removingId === c.userId}
                    aria-label="Remove collaborator"
                  >
                    <Trash2 size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg text-red-700">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={handleEditOpen} disabled={isLoadingData} className="w-full">
                {isLoadingData ? 'Loading...' : 'Edit Trip'}
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
          <TripDeleteButtonWithConfirm tripId={tripId} />
        </CardContent>
      </Card>
    </div>
  );
}

function CollaboratorsSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-8 w-40 bg-muted rounded mb-2 animate-pulse" />
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>
      <div>
        <div className="h-8 w-40 bg-muted rounded mb-2 animate-pulse" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
      <div className="mt-8">
        <div className="h-8 w-40 bg-muted rounded mb-2 animate-pulse" />
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
} 