"use client";
import { useEffect, useState, useTransition, useRef } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { UploadCloud, Loader, CheckCircle, File as FileIcon, ExternalLink, MoreVertical, Utensils, Landmark, Trees, Bed, Coffee, MapPin } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Dialog as Modal, DialogContent as ModalContent, DialogHeader as ModalHeader, DialogTitle as ModalTitle } from "@/components/ui/dialog";
import { TripFilesTab } from "@/components/trip/TripFilesTab";
import { create } from 'zustand';
import { getAblyClient } from '@/lib/ablyClient';
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "next-themes";
import { Place } from "@/types/trip";
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TripPlacesState {
  placesByTrip: Record<string, Place[]>;
  loadingByTrip: Record<string, boolean>;
  fetchPlaces: (tripId: string) => Promise<void>;
  setPlaces: (tripId: string, places: Place[]) => void;
  addPlace: (tripId: string, place: Place) => void;
  updatePlace: (tripId: string, place: Place) => void;
  removePlace: (tripId: string, placeId: string) => void;
}

export const useTripPlacesStore = create<TripPlacesState>((set, get) => ({
  placesByTrip: {},
  loadingByTrip: {},
  async fetchPlaces(tripId) {
    set(state => ({ loadingByTrip: { ...state.loadingByTrip, [tripId]: true } }));
    const res = await fetch(`/api/trips/${tripId}/places`);
    const data = await res.json();
    set(state => ({
      placesByTrip: { ...state.placesByTrip, [tripId]: data || [] },
      loadingByTrip: { ...state.loadingByTrip, [tripId]: false },
    }));
  },
  setPlaces(tripId, places) {
    set(state => ({ placesByTrip: { ...state.placesByTrip, [tripId]: places } }));
  },
  addPlace(tripId, place) {
    set(state => ({ placesByTrip: { ...state.placesByTrip, [tripId]: [...(state.placesByTrip[tripId] || []), place] } }));
  },
  updatePlace(tripId, place) {
    set(state => ({
      placesByTrip: {
        ...state.placesByTrip,
        [tripId]: (state.placesByTrip[tripId] || []).map(p => p.id === place.id ? place : p),
      },
    }));
  },
  removePlace(tripId, placeId) {
    set(state => ({
      placesByTrip: {
        ...state.placesByTrip,
        [tripId]: (state.placesByTrip[tripId] || []).filter(p => p.id !== placeId),
      },
    }));
  },
}));

// Extend the Place type for the form
interface PlaceForm extends Omit<Place, 'id' | 'link'> {
  websiteLink?: string;
  googleMapsLink?: string;
}

const PLACE_TYPES = [
  { value: "museum", label: "Museum" },
  { value: "restaurant", label: "Restaurant" },
  { value: "park", label: "Park" },
  { value: "hotel", label: "Hotel" },
  { value: "other", label: "Other" },
];

// Add placeTypeDetails and defaultPlaceDetail back
const placeTypeDetails: { [key: string]: { icon: React.ElementType, color: string } } = {
  restaurant: { icon: Utensils, color: "bg-orange-500" },
  cafe: { icon: Coffee, color: "bg-yellow-600" },
  museum: { icon: Landmark, color: "bg-indigo-500" },
  park: { icon: Trees, color: "bg-green-500" },
  hotel: { icon: Bed, color: "bg-blue-500" },
  other: { icon: MapPin, color: "bg-gray-500" },
};
const defaultPlaceDetail = { icon: MapPin, color: "bg-gray-500" };

interface TripPlacesProps {
  tripId: string;
  inDialog?: boolean;
  onSuccess?: () => void;
}

export function TripPlaces({ tripId, inDialog = false, onSuccess }: TripPlacesProps) {
  const [isPending, startTransition] = useTransition();
  const { placesByTrip, loadingByTrip, fetchPlaces, addPlace, updatePlace, removePlace } = useTripPlacesStore();
  const places = placesByTrip[tripId] || [];
  const loading = loadingByTrip[tripId] ?? true;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PlaceForm>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlaceForm>>({});
  const [editErrors, setEditErrors] = useState<{ name?: string; type?: string }>({});
  const { resolvedTheme } = useTheme();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const placesRef = useRef(places);
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState("");
  const [customType, setCustomType] = useState("");

  useEffect(() => { placesRef.current = places; }, [places]);

  useEffect(() => {
    if (!placesByTrip[tripId]) {
      fetchPlaces(tripId);
    }
  }, [tripId, fetchPlaces, placesByTrip]);

  const onSubmit = (data: any) => {
    startTransition(async () => {
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
      const typeToSend = selectedType === "other" ? customType : selectedType;
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
        reset();
        setEditDialogOpen(false);
        setSelectedType("");
        setCustomType("");
        toast({ title: "Place created", description: "The place was added successfully." });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Failed to create place", description: data.error || "Something went wrong.", variant: "destructive" });
      }
    });
  };

  function extractLatLngFromGoogleMapsUrl(url: string): { lat: number, lng: number } | null {
    // Try !3dLAT!4dLNG first (place marker)
    let match = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    // Fallback to @LAT,LNG (map center)
    match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    return null;
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/trips/${tripId}/places`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      removePlace(tripId, id);
      toast({ title: "Place deleted", description: "The place was deleted successfully." });
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: "Failed to delete place", description: data.error || "Something went wrong.", variant: "destructive" });
    }
  };

  const handleEdit = (place: Place) => {
    setEditingId(place.id);
    setEditForm({
      ...place,
      websiteLink: place.link || '',
      googleMapsLink: place.googleMapsLink || '',
    });
    setEditErrors({});
    if (PLACE_TYPES.some(t => t.value === place.type)) {
      setSelectedType(place.type);
      setCustomType("");
    } else {
      setSelectedType("other");
      setCustomType(place.type || "");
    }
    setEditDialogOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    // Validate
    const errors: { name?: string; type?: string } = {};
    if (!editForm.name) errors.name = "Name is required";
    if (!selectedType) errors.type = "Type is required";
    if (selectedType === "other" && !customType) errors.type = "Custom type is required";
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return false;
    // Extract lat/lng
    let latitude, longitude;
    if (editForm.googleMapsLink) {
      console.log("Google Maps Link (edit):", editForm.googleMapsLink);
      const coords = extractLatLngFromGoogleMapsUrl(editForm.googleMapsLink);
      console.log("Extracted coords (edit):", coords);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }
    const typeToSend = selectedType === "other" ? customType : selectedType;
    // Save
    const res = await fetch(`/api/trips/${tripId}/places`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        type: typeToSend,
        link: editForm.websiteLink,
        latitude,
        longitude,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      updatePlace(tripId, updated);
      setEditingId(null);
      setEditForm({});
      setEditErrors({});
      setEditDialogOpen(false);
      setSelectedType("");
      setCustomType("");
      toast({ title: "Place updated", description: "The place was updated successfully." });
      return true;
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: "Failed to update place", description: data.error || "Something went wrong.", variant: "destructive" });
    }
    return false;
  };

  const handleEditDialogClose = () => {
    setEditingId(null);
    setEditForm({});
    setEditErrors({});
    setEditDialogOpen(false);
  };

  if (loading && places.length === 0) {
    return <PlacesSkeleton />;
  }

  return (
    <div className="relative">
      <div className="space-y-5">
        {places.length === 0 && !loading ? (
          <div className="text-center py-10 text-muted-foreground">
            <MapPin className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium">No places added yet.</h3>
            <p className="mt-1 text-sm text-gray-500">Add places to your trip to see them here.</p>
          </div>
        ) : (
          places.map((place, index) => {
            const typeDetail = (place.type && placeTypeDetails[place.type.toLowerCase()]) || defaultPlaceDetail;
            const IconComponent = typeDetail.icon;
            
            let timeDisplay = "";
            if (place.date) {
              try {
                const dateObj = new Date(place.date);
                if (!isNaN(dateObj.getTime())) {
                  if (dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0 || dateObj.getSeconds() !== 0) {
                    timeDisplay = format(dateObj, 'MMM d, p');
                  } else {
                    timeDisplay = format(dateObj, 'MMM d');
                  }
                }
              } catch (e) {
                // console.error("Error formatting date:", e); 
              }
            }

            return (
              <div key={place.id} className="flex items-start gap-x-4 relative">
                <div className="relative last:after:hidden after:absolute after:top-10 after:bottom-0 after:start-[1.125rem] after:w-px after:-translate-x-1/2 after:bg-gray-300 dark:after:bg-slate-700">
                  <div className="relative z-10 w-9 h-9 flex items-center justify-center">
                    <div className={cn("w-full h-full rounded-full flex items-center justify-center text-white", typeDetail.color || defaultPlaceDetail.color)}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="grow bg-card shadow-lg rounded-lg p-4 pr-10 relative min-w-0 flex-1 min-h-[120px]">
                  <div className="absolute top-3 right-2.5 z-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:bg-muted/50">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border-border shadow-lg">
                        <DropdownMenuItem onClick={() => handleEdit(place)} className="hover:bg-muted/50 focus:bg-muted/50">
                          Edit Place
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(place.id)} className="text-red-600 dark:text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-500">
                          Delete Place
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-col">
                    {timeDisplay && (
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-500 mb-0.5">{timeDisplay}</p>
                    )}
                    <h3 className="text-lg font-semibold text-foreground mb-1.5 leading-tight pr-6">
                      {place.name}
                    </h3>
                    {place.notes && (
                      <p className="text-sm text-muted-foreground mb-2.5 leading-relaxed">
                        {place.notes}
                      </p>
                    )}
                    {place.address && (
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                        <span>{place.address}</span>
                      </div>
                    )}
                    {place.link && (
                      <a 
                        href={place.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        Visit website <ExternalLink className="w-3 h-3"/>
                      </a>
                    )}
                  </div>
                  
                  <div className="absolute bottom-3 right-3 z-10">
                     <PlaceFileButton placeId={place.id} tripId={tripId} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <Dialog open={editDialogOpen} onOpenChange={open => { if (!open) handleEditDialogClose(); }}>
        <DialogContent className="bg-white dark:bg-card dark:text-white border border-gray-200 dark:border-gray-700">
          <DialogHeader className="dark:text-white">
            <DialogTitle>Edit Place</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleEditSave().then(() => handleEditDialogClose()); }} className="space-y-2">
            <div>
              <input name="name" value={editForm.name || ""} onChange={handleEditChange} placeholder="Name" className="w-full border rounded px-3 py-2" />
              {editErrors.name && <div className="text-red-500 text-xs mt-1">{editErrors.name}</div>}
            </div>
            <div>
              <select
                className="w-full border rounded px-3 py-2"
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                required
              >
                <option value="">Select type</option>
                {PLACE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {selectedType === "other" && (
                <input
                  className="w-full border rounded px-3 py-2 mt-2"
                  value={customType}
                  onChange={e => setCustomType(e.target.value)}
                  placeholder="Enter custom type"
                  required
                />
              )}
              {editErrors.type && <div className="text-red-500 text-xs mt-1">{editErrors.type}</div>}
            </div>
            <div>
              <input name="address" value={editForm.address || ""} onChange={handleEditChange} placeholder="Address (optional)" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <input name="websiteLink" value={editForm.websiteLink || ""} onChange={handleEditChange} placeholder="Website Link (optional)" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <input name="googleMapsLink" value={editForm.googleMapsLink || ""} onChange={handleEditChange} placeholder="Google Maps Link (optional, for map)" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <input
                type="date"
                name="date"
                value={editForm.date || ""}
                onChange={handleEditChange}
                placeholder="Date (optional)"
                className="w-full border rounded px-3 py-2"
              />
              <div className="text-xs text-gray-500 mt-1">Set a date for this place to appear in your daily view.</div>
            </div>
            <div>
              <textarea name="notes" value={editForm.notes || ""} onChange={handleEditChange} placeholder="Notes (optional)" className="w-full border rounded px-3 py-2" />
            </div>
            <DialogFooter className="flex flex-row gap-2 justify-end">
              <Button type="submit">Save</Button>
              <DialogClose asChild>
                <Button type="button" variant="secondary" onClick={handleEditDialogClose}>Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component to fetch and show file button for a place
function PlaceFileButton({ placeId, tripId }: { placeId: string; tripId: string }) {
  const [files, setFiles] = useState<{ url: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  useEffect(() => {
    fetch(`/api/trips/${tripId}/places/files?placeId=${placeId}`)
      .then(res => res.json())
      .then(files => {
        if (Array.isArray(files) && files.length > 0) setFiles(files);
      });
  }, [placeId, tripId]);
  if (!files.length) return null;
  return (
    <>
      <button
        className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-800 text-white shadow-lg flex items-center justify-center hover:bg-zinc-700 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 border border-zinc-700/40"
        aria-label="Show place files"
        onClick={() => setOpen(true)}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
      >
        <FileIcon className="w-5 h-5" />
      </button>
      {/* List dialog */}
      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent className="max-w-full w-full sm:w-[400px] p-0 flex flex-col">
          <ModalHeader className="p-4 border-b border-border bg-background sticky top-0 z-20">
            <ModalTitle className="truncate text-lg">Place Files</ModalTitle>
            <button className="absolute right-4 top-4 text-lg" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </ModalHeader>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {files.map(file => (
              <div key={file.url} className="border rounded-lg p-3 bg-secondary/40 flex items-center gap-3 cursor-pointer hover:bg-secondary/60 transition" onClick={() => setPreviewFile(file)}>
                <FileIcon className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 font-medium text-base truncate">{file.name}</div>
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ))}
            {files.length === 0 && <div className="text-muted-foreground">No files for this place.</div>}
          </div>
        </ModalContent>
      </Modal>
      {/* Preview dialog */}
      <Modal open={!!previewFile} onOpenChange={open => { if (!open) setPreviewFile(null); }}>
        <ModalContent className="max-w-full w-full sm:w-[500px] h-[80dvh] p-0 flex flex-col">
          <ModalHeader className="p-4 border-b border-border bg-background sticky top-0 z-20">
            <ModalTitle className="truncate text-lg">{previewFile?.name}</ModalTitle>
            <button className="absolute right-4 top-4 text-lg" onClick={() => setPreviewFile(null)} aria-label="Close">✕</button>
          </ModalHeader>
          {previewFile && (
            <div className="flex-1 flex flex-col items-center justify-center p-2 overflow-auto">
              <iframe src={previewFile.url} className="w-full h-full min-h-[60dvh] border rounded-lg" title={previewFile.name} />
              <a href={previewFile.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 mt-4 text-base font-medium" aria-label="Download or open in new tab">
                <ExternalLink className="h-5 w-5" /> Download / Open in new tab
              </a>
            </div>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

function PlacesSkeleton() {
  return (
    <div className="space-y-5">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-start gap-x-4 relative">
          <div className="relative last:after:hidden after:absolute after:top-10 after:bottom-0 after:start-[1.125rem] after:w-px after:-translate-x-1/2 after:bg-gray-200 dark:after:bg-slate-700">
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse"></div>
          </div>
          <div className="grow bg-muted/50 dark:bg-slate-800/50 shadow-lg rounded-lg p-4 pr-10 animate-pulse min-w-0 flex-1 min-h-[120px]">
            <div className="h-4 bg-muted-foreground/20 rounded w-1/3 mb-2"></div>
            <div className="h-5 bg-muted-foreground/30 rounded w-3/4 mb-2.5"></div>
            <div className="h-10 bg-muted-foreground/20 rounded w-full mb-3"></div>
            <div className="h-3 bg-muted-foreground/20 rounded w-1/2 mt-1"></div>
          </div>
        </div>
      ))}
    </div>
  );
} 