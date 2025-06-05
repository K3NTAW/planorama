"use client";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { format } from "date-fns";
import { CreateTripButton } from "@/components/ui/CreateTripButton";
import Image from "next/image";
import { create } from 'zustand';
import { Button } from "@/components/ui/button";
import Ably from 'ably';
import { useTripCollaboratorsStore } from "@/components/trip/TripCollaborators";
import { useTripAccommodationsStore } from "@/components/ui/TripAccommodations";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User as UserIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  bannerUrl: string | null;
  userId: string;
}

interface TripsState {
  trips: Trip[];
  loading: boolean;
  fetchTrips: () => Promise<void>;
  addTrip: (trip: Trip) => void;
  removeTrip: (tripId: string) => void;
}

export const useTripsStore = create<TripsState>((set, get) => ({
  trips: [],
  loading: true,
  async fetchTrips() {
    set({ loading: true });
    const res = await fetch("/api/trips");
    const data = await res.json();
    set({ trips: data || [], loading: false });
  },
  addTrip(trip) {
    set(state => ({ trips: [...state.trips, trip] }));
  },
  removeTrip(tripId) {
    set(state => ({ trips: state.trips.filter(trip => trip.id !== tripId) }));
  },
}));

export function TripList({ userId, userName }: { userId: string, userName?: string }) {
  const { trips, loading, fetchTrips, addTrip, removeTrip } = useTripsStore();
  const { collaboratorsByTrip, fetchCollaborators } = useTripCollaboratorsStore();
  const { accommodationsByTrip, fetchAccommodations } = useTripAccommodationsStore();
  useEffect(() => {
    if (trips.length === 0) {
      fetchTrips();
    }
  }, [fetchTrips, trips.length]);

  // Fetch collaborators and accommodations for each trip (for mobile card)
  useEffect(() => {
    trips.forEach((trip) => {
      if (!collaboratorsByTrip[trip.id]) fetchCollaborators(trip.id);
      if (!accommodationsByTrip[trip.id]) fetchAccommodations(trip.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips]);

  // Ably real-time subscription for trip-created
  useEffect(() => {
    let ably: any = null;
    let channel: any = null;
    let unsubscribes: (() => void)[] = [];
    let isMounted = true;
    async function setupAbly() {
      const res = await fetch('/api/ably-token');
      if (!res.ok) return;
      const tokenRequest = await res.json();
      console.log('Ably tokenRequest:', tokenRequest);
      // Try using authUrl instead of token for Ably initialization
      ably = new Ably.Realtime({ authUrl: '/api/ably-token' });
      channel = ably.channels.get('trips');
      const handleTripCreated = (msg: any) => { addTrip(msg.data); };
      const handleTripDeleted = (msg: any) => { removeTrip(msg.data.id); };
      const handleTripUpdated = (msg: any) => {
        const updatedTrip = msg.data;
        removeTrip(updatedTrip.id);
        addTrip(updatedTrip);
      };
      channel.subscribe('trip-created', handleTripCreated);
      channel.subscribe('trip-deleted', handleTripDeleted);
      channel.subscribe('trip-updated', handleTripUpdated);
      unsubscribes = [
        () => channel.unsubscribe('trip-created', handleTripCreated),
        () => channel.unsubscribe('trip-deleted', handleTripDeleted),
        () => channel.unsubscribe('trip-updated', handleTripUpdated),
      ];
    }
    setupAbly();
    return () => {
      isMounted = false;
      unsubscribes.forEach(fn => fn());
      if (ably) ably.close();
    };
  }, [addTrip, removeTrip]);

  // Called after a trip is created
  async function handleTripCreated() {
    await fetchTrips();
  }

  // Called after a trip is deleted
  function handleTripDeleted(deletedTripId: string) {
    removeTrip(deletedTripId);
  }

  return (
    <div className="max-w-3xl w-full mx-auto px-2 sm:px-4 md:px-6 py-6 overflow-x-hidden">
      {/* Greeting Section */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-foreground mb-1">Hello{userName ? `, ${userName}` : ''}</h2>
        <div className="text-xl text-muted-foreground font-medium">Ready for your next adventure?</div>
      </div>
      {/* Action Buttons Row */}
      <div className="flex gap-4 mb-8">
        {/* New Trip */}
        <div className="flex-1 min-h-[180px]">
          <NewTripCard onTripCreated={handleTripCreated} />
        </div>
        {/* Explore */}
        <div className="flex-1 min-h-[180px]">
          <button className="bg-white dark:bg-card rounded-2xl flex flex-col items-center justify-center py-6 shadow-sm w-full h-full">
            <div className="mb-2 flex items-center justify-center">
              <div className="bg-green-600 dark:bg-green-700 rounded-full w-16 h-16 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /></svg>
              </div>
            </div>
            <span className="text-base font-semibold text-foreground">Explore</span>
          </button>
        </div>
      </div>
      <h1 className="text-3xl font-bold mb-6">Your Trips</h1>
      <div className="grid gap-4 w-full max-w-full">
        {loading ? (
          <TripsSkeleton />
        ) : trips.length === 0 ? (
          <div className="text-gray-500">No trips found. Start by creating a new trip!</div>
        ) : (
          trips.map((trip: Trip) => {
            const isOwner = trip.userId === userId;
            // Mobile-specific data
            const collaborators = collaboratorsByTrip[trip.id] || [];
            const accommodations = accommodationsByTrip[trip.id] || [];
            return (
              <Card key={trip.id} className="relative w-full max-w-full">
                {/* MOBILE CARD DESIGN */}
                <div className="block sm:hidden">
                  <div className="relative rounded-t-xl overflow-hidden">
                    {trip.bannerUrl && (
                      <Image
                        src={trip.bannerUrl}
                        alt={trip.name}
                        width={600}
                        height={160}
                        className="w-full h-40 object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute left-0 bottom-0 p-4 w-full">
                      <div className="text-white font-bold text-lg drop-shadow mb-1">{trip.name}</div>
                      <div className="flex items-center text-white text-sm font-medium gap-2 mb-1">
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          {trip.startDate ? format(new Date(trip.startDate), 'MMM d') : ''} - {trip.endDate ? format(new Date(trip.endDate), 'MMM d') : ''}
                        </span>
                      </div>
                      <div className="flex items-center text-white text-sm font-medium gap-1 drop-shadow">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21C12 21 7 16.5 7 12.5C7 9.46243 9.46243 7 12.5 7C15.5376 7 18 9.46243 18 12.5C18 16.5 12 21 12 21Z" /><circle cx="12" cy="12" r="2.5" /></svg>
                        <span>{trip.destination}</span>
                      </div>
                    </div>
                  </div>
                  {/* Unified info card area */}
                  <div className="bg-card text-card-foreground rounded-b-xl shadow-sm px-4 pt-4 pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-5a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        <span className="font-medium text-gray-600 text-base">{1 + collaborators.length} people</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 10V6a5 5 0 0110 0v4" /></svg>
                        <span className="font-medium text-gray-600 text-base">{accommodations.length} stays</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      {/* Avatars */}
                      <div className="flex -space-x-2">
                        {collaborators.slice(0, 3).map((c, i) => (
                          <Avatar key={c.userId} className="h-7 w-7 border-2 border-white">
                            <AvatarImage src={c.user?.avatarUrl || ''} alt={c.user?.firstName || ''} />
                            <AvatarFallback>{c.user?.firstName?.[0] || <UserIcon size={14} />}</AvatarFallback>
                          </Avatar>
                        ))}
                        {collaborators.length === 0 && (
                          <Avatar className="h-7 w-7 border-2 border-white opacity-60">
                            <AvatarFallback><UserIcon size={14} /></AvatarFallback>
                          </Avatar>
                        )}
                        {collaborators.length > 3 && (
                          <span className="h-7 w-7 flex items-center justify-center rounded-full bg-gray-200 text-xs font-semibold border-2 border-white">+{collaborators.length - 3}</span>
                        )}
                      </div>
                      <span className="ml-2 text-gray-500 text-sm font-medium">{collaborators.length} collaborator{collaborators.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="flex justify-end">
                      <Button asChild size="sm" className="text-sm font-medium px-4 py-1.5">
                        <Link href={`/trips/${trip.id}`}>View Details</Link>
                      </Button>
                    </div>
                  </div>
                </div>
                {/* DESKTOP CARD (unchanged) */}
                <div className="hidden sm:block">
                  <CardHeader>
                    {trip.bannerUrl && (
                      <Image
                        src={trip.bannerUrl}
                        alt={trip.name}
                        width={600}
                        height={160}
                        className="w-full max-w-full h-40 object-cover rounded-t-md mb-2 border border-border"
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <CardTitle>{trip.name}</CardTitle>
                      {!isOwner && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800 border border-yellow-300">Collaborator</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full max-w-full">
                      <div>
                        <div className="text-gray-600">Destination: {trip.destination}</div>
                        <div className="text-gray-500 text-sm">
                          {trip.startDate ? format(new Date(trip.startDate), 'yyyy-MM-dd') : ''}
                          {trip.endDate ? ` - ${format(new Date(trip.endDate), 'yyyy-MM-dd')}` : ''}
                        </div>
                      </div>
                      <Button asChild className="mt-2 md:mt-0">
                        <Link href={`/trips/${trip.id}`}>View Details</Link>
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })
        )}
      </div>
      <div className="h-24" /> {/* Spacer for bottom navigation */}
    </div>
  );
}

function TripsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse bg-muted rounded p-6 h-32" />
      ))}
    </div>
  );
}

// NewTripCard component with CreateTripButton logic inline
function NewTripCard({ onTripCreated }: { onTripCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerProgress, setBannerProgress] = useState(0);
  const [isBannerDragging, setIsBannerDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setBannerPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsBannerDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsBannerDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsBannerDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setBannerPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      let bannerUrl = null;

      if (bannerFile) {
        setBannerUploading(true);
        try {
          // Simulate progress
          const progressInterval = setInterval(() => {
            setBannerProgress((prev) => Math.min(prev + Math.random() * 20, 95));
          }, 300);

          const result = await uploadToCloudinary(bannerFile, "trip-banners");
          clearInterval(progressInterval);

          if (result?.secure_url) {
            bannerUrl = result.secure_url;
            setBannerProgress(100);
          } else {
            toast({
              title: "Failed to upload banner",
              description: "There was an error uploading your banner image. Please try again.",
              variant: "destructive",
            });
            return;
          }
          setBannerUploading(false);
        } catch (error) {
          setBannerUploading(false);
          toast({
            title: "Failed to upload banner",
            description: "There was an error uploading your banner image. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      // Format dates as ISO strings
      const startDate = formData.get("startDate") as string;
      const endDate = formData.get("endDate") as string;

      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          destination: formData.get("destination"),
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          bannerUrl,
        }),
      });

      if (res.ok) {
        const trip = await res.json();
        setOpen(false);
        toast({
          title: "Trip created",
          description: "Your trip was created successfully.",
        });
        if (onTripCreated) {
          onTripCreated();
        }
        router.push(`/trips/${trip.id}`);
      } else {
        const data = await res.json();
        toast({
          title: "Failed to create trip",
          description: data.error || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to create trip",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="w-full h-full bg-white dark:bg-card rounded-2xl flex flex-col items-center justify-center py-6 shadow-sm focus:outline-none hover:bg-gray-50 dark:hover:bg-muted transition"
          onClick={() => setOpen(true)}
          type="button"
        >
          <div className="mb-2 flex items-center justify-center">
            <div className="bg-blue-700 dark:bg-blue-800 rounded-full w-16 h-16 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </div>
          </div>
          <span className="text-base font-semibold text-foreground mt-2">New Trip</span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Trip</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new trip.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="grid w-full items-center gap-1.5">
              <Label>Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter trip name"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid w-full items-center gap-1.5">
              <Label>Destination</Label>
              <Input
                id="destination"
                name="destination"
                placeholder="Enter destination"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid w-full items-center gap-1.5">
              <Label>Start Date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid w-full items-center gap-1.5">
              <Label>End Date</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Banner Image (optional)</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                isBannerDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
                bannerPreview ? "p-0" : ""
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              {bannerUploading ? (
                <div className="space-y-2">
                  <Loader className="animate-spin mx-auto" />
                  <div className="text-sm text-gray-500">Uploading...</div>
                  <Progress value={bannerProgress} className="w-full" />
                </div>
              ) : bannerPreview ? (
                <div className="relative">
                  <img
                    src={bannerPreview}
                    alt="Banner Preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveBanner();
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadCloud className="mx-auto h-8 w-8 text-gray-400" />
                  <div className="text-sm text-gray-500">
                    Drag and drop an image, or click to select
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || bannerUploading}>
              {isLoading ? "Creating..." : "Create Trip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 