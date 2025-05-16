"use client";
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import Image from "next/image";
import { getAblyClient } from '@/lib/ablyClient';
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Plus, MapPin, Bed, Loader2, Loader, CheckCircle, UploadCloud, Settings, ArrowLeft, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useTripFilesStore } from "@/components/trip/TripFilesTab";
import { useParams, useRouter } from "next/navigation";
import { TripEditDialog } from "@/components/trip/TripEditDialog";

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  bannerUrl: string | null;
  accommodations?: Accommodation[];
}

interface PlaceForm {
  name: string;
  type: string;
  address?: string;
  websiteLink?: string;
  googleMapsLink?: string;
  date?: string;
  notes?: string;
}

interface AccommodationForm {
  name: string;
  address?: string;
  checkIn: string;
  checkOut: string;
  websiteLink?: string;
  googleMapsLink?: string;
  link?: string;
}

interface Accommodation {
  id: string;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  websiteLink?: string;
  googleMapsLink?: string;
  link?: string;
}

interface Place {
  id: string;
  name: string;
  type: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  files?: { url: string }[];
}

const PLACE_TYPES = [
  { value: "museum", label: "Museum" },
  { value: "restaurant", label: "Restaurant" },
  { value: "park", label: "Park" },
  { value: "hotel", label: "Hotel" },
  { value: "other", label: "Other" },
];

function extractLatLngFromGoogleMapsUrl(url: string): { lat: number, lng: number } | null {
  console.log("Extracting coordinates from URL:", url);
  
  // Try !3dLAT!4dLNG first (place marker)
  let match = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (match) {
    console.log("Found coordinates in !3d!4d format:", match[1], match[2]);
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  // Try @LAT,LNG (map center)
  match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    console.log("Found coordinates in @LAT,LNG format:", match[1], match[2]);
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  // Try /place/.../@LAT,LNG
  match = url.match(/\/place\/[^@]+@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    console.log("Found coordinates in /place/.../@LAT,LNG format:", match[1], match[2]);
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  // Try /search/.../@LAT,LNG
  match = url.match(/\/search\/[^@]+@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    console.log("Found coordinates in /search/.../@LAT,LNG format:", match[1], match[2]);
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  // Try /dir/.../@LAT,LNG
  match = url.match(/\/dir\/[^@]+@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    console.log("Found coordinates in /dir/.../@LAT,LNG format:", match[1], match[2]);
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  console.log("No coordinates found in URL");
  return null;
}

export default function TripHeaderClient({ initialTrip, tripId }: { initialTrip: Trip, tripId: string }) {
  const [trip, setTrip] = useState<Trip>(initialTrip);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'place' | 'accommodation' | 'file' | null>(null);
  const [placeType, setPlaceType] = useState<string>('');
  const [isPending, setIsPending] = useState(false);
  const [customType, setCustomType] = useState('');
  const placeForm = useForm<PlaceForm>();
  const accommodationForm = useForm<AccommodationForm>();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null);
  const [fileProgress, setFileProgress] = useState(0);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'places' | 'accommodations'>('places');
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const params = useParams();
  const router = useRouter();

  // Real-time Ably subscription
  useEffect(() => {
    let channel: any = null;
    let ably: any = null;
    let isMounted = true;
    async function setup() {
      ably = await getAblyClient();
      if (!isMounted) return;
      channel = ably.channels.get('trips');
      const handler = (msg: any) => {
        if (msg.data.id === tripId) {
          // Use the full trip data from the event
          setTrip(msg.data);
        }
      };
      channel.subscribe('trip-updated', handler);
    }
    setup();
    return () => {
      isMounted = false;
      if (channel) channel.unsubscribe('trip-updated');
    };
  }, [tripId]);

  // Fetch places when component mounts
  useEffect(() => {
    async function fetchPlaces() {
      try {
        const res = await fetch(`/api/trips/${tripId}/places`);
        if (res.ok) {
          const placesData = await res.json();
          setPlaces(placesData);
        }
      } catch (error) {
        console.error("Error fetching places:", error);
      }
    }
    fetchPlaces();
  }, [tripId]);

  // Optimistic update: update state if initialTrip changes
  useEffect(() => {
    setTrip(initialTrip);
  }, [initialTrip]);

  const handleSuccess = () => {
    setDialogOpen(false);
    setSelectedType(null);
    setPlaceType('');
    placeForm.reset();
    accommodationForm.reset();
  };

  const onSubmitPlace = async (data: PlaceForm) => {
    setIsPending(true);
    try {
      let latitude, longitude;
      if (data.googleMapsLink) {
        console.log("Google Maps Link:", data.googleMapsLink);
        const coords = extractLatLngFromGoogleMapsUrl(data.googleMapsLink);
        console.log("Extracted coords:", coords);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      }
      const typeToSend = customType || placeType;
      const res = await fetch(`/api/trips/${tripId}/places`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          type: typeToSend,
          link: data.websiteLink,
          latitude,
          longitude,
        }),
      });
      if (res.ok) {
        if (uploadedFile) {
          const newPlace = await res.json();
          await fetch(`/api/trips/${tripId}/places/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              placeId: newPlace.id,
              url: uploadedFile.url,
              name: uploadedFile.name,
            }),
          });
        }
        setUploadedFile(null);
        setFileProgress(0);
        toast({ title: "Place created", description: "The place was added successfully." });
        handleSuccess();
      } else {
        const error = await res.json().catch(() => ({}));
        toast({ title: "Failed to create place", description: error.error || "Something went wrong.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to create place", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  const onSubmitAccommodation = async (data: AccommodationForm) => {
    setIsPending(true);
    try {
      let latitude, longitude;
      if (data.googleMapsLink) {
        console.log("Google Maps Link:", data.googleMapsLink);
        const coords = extractLatLngFromGoogleMapsUrl(data.googleMapsLink);
        console.log("Extracted coords:", coords);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      }
      const res = await fetch(`/api/trips/${tripId}/accommodations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          link: data.link,
          latitude,
          longitude,
        }),
      });
      if (res.ok) {
        const newAccommodation = await res.json();
        setTrip(prevTrip => ({
          ...prevTrip,
          accommodations: [...(prevTrip.accommodations || []), newAccommodation],
        }));
        toast({ title: "Accommodation created", description: "The accommodation was added successfully." });
        handleSuccess();
      } else {
        const error = await res.json().catch(() => ({}));
        toast({ title: "Failed to create accommodation", description: error.error || "Something went wrong.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to create accommodation", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  const onSubmitFile = async (file: File) => {
    if (!file) return;
    const tempId = `file-${Date.now()}`;
    setFileUploading(true);
    setFileProgress(0);
    const progressInterval = setInterval(() => {
      setFileProgress(prev => Math.min(prev + Math.random() * 20, 95));
    }, 300);
    try {
      const result = await uploadToCloudinary(file, `trip-files/${tripId}`);
      clearInterval(progressInterval);
      if (result?.secure_url) {
        setFileProgress(100);
        // Save file to place or trip
        if (selectedPlaceId) {
          const res = await fetch(`/api/trips/${tripId}/places/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              placeId: selectedPlaceId,
              url: result.secure_url,
              name: file.name,
            }),
          });
          const data = await res.json();
          console.log('Place file saved:', data);
          // Add the file directly to the store
          const store = useTripFilesStore.getState();
          store.addPlaceFile(tripId, {
            id: data.id,
            url: result.secure_url,
            name: file.name,
            createdAt: data.createdAt,
            placeId: selectedPlaceId,
            placeName: places.find(p => p.id === selectedPlaceId)?.name || 'Unknown Place'
          });
        } else {
          const res = await fetch(`/api/trips/${tripId}/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: result.secure_url, name: file.name }),
          });
          const data = await res.json();
          console.log('Trip file saved:', data);
          // Add the file directly to the store
          const store = useTripFilesStore.getState();
          store.addTripFile(tripId, {
            id: data.id,
            url: result.secure_url,
            name: file.name,
            createdAt: data.createdAt
          });
        }
        setDialogOpen(false);
        setSelectedType(null);
        setUploadedFile(null);
        setFileProgress(0);
        setSelectedPlaceId("");
        toast({ title: "File uploaded", description: "The file was uploaded successfully." });
      } else {
        toast({ title: "Failed to upload file", description: "No secure URL returned.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast({ title: "Failed to upload file", description: "Something went wrong.", variant: "destructive" });
    } finally {
      clearInterval(progressInterval);
      setFileUploading(false);
      setFileProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      onSubmitFile(file);
    }
  };

  const handleFileDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsFileDragging(true);
  };

  const handleFileDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsFileDragging(false);
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsFileDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      onSubmitFile(file);
    }
  };

  return (
    <>
      <div className="flex justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-2">
          <TripEditDialog 
            tripId={tripId} 
            onTripUpdated={() => {
              // Refresh trip data after update
              fetch(`/api/trips/${tripId}`)
                .then(res => res.json())
                .then(data => setTrip(data))
                .catch(console.error);
            }} 
            onOpenChange={(open) => {
              if (open) {
                // Fetch trip data when dialog opens
                fetch(`/api/trips/${tripId}`)
                  .then(res => res.json())
                  .then(data => setTrip(data))
                  .catch(console.error);
              }
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/trips/${tripId}/settings`)}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {trip.bannerUrl && (
        <Image
          src={trip.bannerUrl}
          alt={trip.name}
          width={800}
          height={224}
          className="w-full max-w-full h-56 object-cover rounded-md mb-6 border border-border"
          priority
        />
      )}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between w-full max-w-full gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">{trip.name}</h1>
          <div className="text-lg text-gray-600 mb-1">Destination: {trip.destination}</div>
          <div className="text-gray-500 text-sm mb-2">
            {trip.startDate ? format(new Date(trip.startDate), 'yyyy-MM-dd') : ''}
            {trip.endDate ? ` - ${format(new Date(trip.endDate), 'yyyy-MM-dd')}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedType(null);
              setPlaceType('');
              placeForm.reset();
              accommodationForm.reset();
              setUploadedFile(null);
              setFileProgress(0);
              setSelectedPlaceId("");
            }
          }}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-card dark:text-white border border-gray-200 dark:border-gray-700">
              <DialogHeader className="dark:text-white">
                <DialogTitle>Add New Item</DialogTitle>
                <DialogDescription>
                  Choose what you would like to add to your trip.
                </DialogDescription>
              </DialogHeader>
              {!selectedType ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <Button
                      variant="outline"
                      className="h-24 w-full flex flex-col items-center justify-center gap-2"
                      onClick={() => setSelectedType('accommodation')}
                    >
                      <Bed className="h-8 w-8" />
                      <span>Add Accommodation</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-24 w-full flex flex-col items-center justify-center gap-2"
                      onClick={() => setSelectedType('file')}
                    >
                      <UploadCloud className="h-8 w-8" />
                      <span>Upload File</span>
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="h-24 w-full flex flex-col items-center justify-center gap-2"
                    onClick={() => setSelectedType('place')}
                  >
                    <MapPin className="h-8 w-8" />
                    <span>Add Place</span>
                  </Button>
                </div>
              ) : selectedType === 'file' ? (
                <div className="space-y-4">
                  <DialogDescription>
                    Upload a file to your trip. You can optionally assign it to a specific place.
                  </DialogDescription>
                  <div className="w-full">
                    <label className="block text-sm font-medium mb-1">Assign to Place (optional)</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={selectedPlaceId}
                      onChange={e => setSelectedPlaceId(e.target.value)}
                      disabled={fileUploading || places.length === 0}
                    >
                      <option value="">No place (trip-level file)</option>
                      {places.map(place => (
                        <option key={place.id} value={place.id}>{place.name}</option>
                      ))}
                    </select>
                  </div>
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-6 transition-all duration-200",
                      isFileDragging 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50",
                    )}
                    onDragOver={handleFileDragOver}
                    onDragLeave={handleFileDragLeave}
                    onDrop={handleFileDrop}
                  >
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className={cn(
                        "p-3 rounded-full bg-primary/10 text-primary transition-transform duration-200",
                        isFileDragging ? "scale-110" : ""
                      )}>
                        <UploadCloud className="h-8 w-8" />
                      </div>
                      <div className="text-center space-y-1">
                        <h3 className="font-semibold text-foreground">
                          {isFileDragging ? "Drop file here" : "Upload trip files"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {isFileDragging 
                            ? "Release to upload" 
                            : "Drag & drop files here or click to browse"
                          }
                        </p>
                      </div>
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        disabled={fileUploading}
                        className="mt-2"
                      >
                        {fileUploading ? (
                          <>
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>Select File</>
                        )}
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={fileUploading}
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      />
                      {fileProgress > 0 && (
                        <Progress value={fileProgress} className="w-full" />
                      )}
                    </div>
                  </div>
                  <DialogFooter className="flex flex-row gap-2 justify-end">
                    <DialogClose asChild>
                      <Button type="button" variant="secondary" onClick={() => {
                        setSelectedType(null);
                        setUploadedFile(null);
                        setFileProgress(0);
                        setSelectedPlaceId("");
                      }}>
                        Cancel
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </div>
              ) : selectedType === 'place' ? (
                <form onSubmit={placeForm.handleSubmit(onSubmitPlace)} className="space-y-2">
                  <DialogDescription>
                    Add a new place to your trip. Fill in the details below.
                  </DialogDescription>
                  <div>
                    <input
                      {...placeForm.register("name", { required: "Name is required" })}
                      placeholder="Name"
                      className="w-full border rounded px-3 py-2"
                    />
                    {placeForm.formState.errors.name && <div className="text-red-500 text-xs mt-1">{placeForm.formState.errors.name.message}</div>}
                  </div>
                  <div>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={placeType}
                      onChange={e => setPlaceType(e.target.value)}
                      required
                    >
                      <option value="">Select type</option>
                      {PLACE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    {placeType === "other" && (
                      <input
                        className="w-full border rounded px-3 py-2 mt-2"
                        value={customType}
                        onChange={e => setCustomType(e.target.value)}
                        placeholder="Enter custom type"
                        required
                      />
                    )}
                  </div>
                  <div>
                    <input
                      {...placeForm.register("address")}
                      placeholder="Address (optional)"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <input
                      {...placeForm.register("websiteLink")}
                      placeholder="Website Link (optional)"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <input
                      {...placeForm.register("googleMapsLink")}
                      placeholder="Google Maps Link (optional, for map)"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <input
                      type="date"
                      {...placeForm.register("date")}
                      placeholder="Date (optional)"
                      className="w-full border rounded px-3 py-2"
                    />
                    <div className="text-xs text-gray-500 mt-1">Set a date for this place to appear in your daily view.</div>
                  </div>
                  <div>
                    <textarea
                      {...placeForm.register("notes")}
                      placeholder="Notes (optional)"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div className="mt-4">
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        onDragOver={handleFileDragOver}
                        onDragLeave={handleFileDragLeave}
                        onDrop={handleFileDrop}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      />
                      <div
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 cursor-pointer",
                          isFileDragging && "bg-gray-50 dark:bg-gray-800"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {fileUploading ? (
                          <>
                            <Loader className="h-8 w-8 animate-spin text-gray-400" />
                            <div className="text-sm text-gray-500">Uploading...</div>
                            <Progress value={fileProgress} className="w-full" />
                          </>
                        ) : uploadedFile ? (
                          <>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                            <div className="text-sm text-gray-500">{uploadedFile.name}</div>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-8 w-8 text-gray-400" />
                            <div className="text-sm text-gray-500">
                              Drag and drop a file here, or click to select
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="flex flex-row gap-2 justify-end">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Add Place
                    </Button>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary" onClick={() => {
                        setSelectedType(null);
                        setPlaceType('');
                        placeForm.reset();
                        setUploadedFile(null);
                        setFileProgress(0);
                        setSelectedPlaceId("");
                      }}>
                        Cancel
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </form>
              ) : (
                <form onSubmit={accommodationForm.handleSubmit(onSubmitAccommodation)} className="space-y-4">
                  <DialogDescription>
                    Add a new accommodation to your trip. Fill in the details below.
                  </DialogDescription>
                  <div>
                    <input
                      {...accommodationForm.register("name", { required: "Name is required" })}
                      placeholder="Name"
                      className="w-full border rounded px-3 py-2"
                    />
                    {accommodationForm.formState.errors.name && <div className="text-red-500 text-xs mt-1">{accommodationForm.formState.errors.name.message}</div>}
                  </div>
                  <div>
                    <input
                      {...accommodationForm.register("address", { required: "Address is required" })}
                      placeholder="Address"
                      className="w-full border rounded px-3 py-2"
                    />
                    {accommodationForm.formState.errors.address && <div className="text-red-500 text-xs mt-1">{accommodationForm.formState.errors.address.message}</div>}
                  </div>
                  <div>
                    <input
                      type="datetime-local"
                      {...accommodationForm.register("checkIn", { required: "Check-in date is required" })}
                      placeholder="Check-in Date and Time"
                      className="w-full border rounded px-3 py-2"
                    />
                    {accommodationForm.formState.errors.checkIn && <div className="text-red-500 text-xs mt-1">{accommodationForm.formState.errors.checkIn.message}</div>}
                  </div>
                  <div>
                    <input
                      type="datetime-local"
                      {...accommodationForm.register("checkOut", { required: "Check-out date is required" })}
                      placeholder="Check-out Date and Time"
                      className="w-full border rounded px-3 py-2"
                    />
                    {accommodationForm.formState.errors.checkOut && <div className="text-red-500 text-xs mt-1">{accommodationForm.formState.errors.checkOut.message}</div>}
                  </div>
                  <div>
                    <input
                      {...accommodationForm.register("websiteLink")}
                      placeholder="Website Link (optional)"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <input
                      {...accommodationForm.register("googleMapsLink")}
                      placeholder="Google Maps Link (optional, for map)"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <input
                      {...accommodationForm.register("link")}
                      placeholder="Booking Link (optional)"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <DialogFooter className="flex flex-row gap-2 justify-end">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Add Accommodation
                    </Button>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary" onClick={() => {
                        setSelectedType(null);
                        accommodationForm.reset();
                      }}>
                        Cancel
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {trip.accommodations && trip.accommodations.length > 0 && (
        <Button
          variant={activeTab === 'accommodations' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('accommodations')}
          className="flex items-center gap-2"
        >
          <Bed className="h-4 w-4" />
          Accommodations
        </Button>
      )}
    </>
  );
} 