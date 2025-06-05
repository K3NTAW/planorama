"use client";
import { useEffect, useState, useTransition, useRef } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { create } from 'zustand';
import { getAblyClient } from '@/lib/ablyClient';
import { useToast } from "@/components/ui/use-toast";
import { Accommodation } from "@/types/trip";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import {
  Bed,
  Home,
  Hotel as HotelIcon,
  Building,
  MapPin,
  MoreVertical,
  ExternalLink,
  CalendarDays,
  Loader,
  Briefcase
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { z } from "zod";

interface TripAccommodationsState {
  accommodationsByTrip: Record<string, Accommodation[]>;
  loadingByTrip: Record<string, boolean>;
  fetchAccommodations: (tripId: string) => Promise<void>;
  addAccommodation: (tripId: string, acc: Accommodation) => void;
  updateAccommodation: (tripId: string, acc: Accommodation) => void;
  removeAccommodation: (tripId: string, accId: string) => void;
  setAccommodations: (tripId: string, accommodations: Accommodation[]) => void;
}

export const useTripAccommodationsStore = create<TripAccommodationsState>((set, get) => ({
  accommodationsByTrip: {},
  loadingByTrip: {},
  async fetchAccommodations(tripId) {
    set(state => ({ loadingByTrip: { ...state.loadingByTrip, [tripId]: true } }));
    const res = await fetch(`/api/trips/${tripId}/accommodations`);
    const data = await res.json();
    set(state => ({
      accommodationsByTrip: { ...state.accommodationsByTrip, [tripId]: data || [] },
      loadingByTrip: { ...state.loadingByTrip, [tripId]: false },
    }));
  },
  addAccommodation(tripId, acc) {
    set(state => {
      const existing = (state.accommodationsByTrip[tripId] || []);
      if (existing.some(a => a.id === acc.id)) {
        return {}; // No change
      }
      return {
        accommodationsByTrip: {
          ...state.accommodationsByTrip,
          [tripId]: [...existing, acc],
        }
      };
    });
  },
  updateAccommodation(tripId, acc) {
    set(state => ({
      accommodationsByTrip: {
        ...state.accommodationsByTrip,
        [tripId]: (state.accommodationsByTrip[tripId] || []).map(a => a.id === acc.id ? acc : a),
      },
    }));
  },
  removeAccommodation(tripId, accId) {
    set(state => ({
      accommodationsByTrip: {
        ...state.accommodationsByTrip,
        [tripId]: (state.accommodationsByTrip[tripId] || []).filter(a => a.id !== accId),
      },
    }));
  },
  setAccommodations(tripId, accommodations) {
    set(state => ({
      accommodationsByTrip: {
        ...state.accommodationsByTrip,
        [tripId]: accommodations,
      },
      loadingByTrip: {
        ...state.loadingByTrip,
        [tripId]: false,
      },
    }));
  },
}));

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

// Extend the Accommodation type for the form
interface AccommodationForm extends Omit<Accommodation, 'id'> {
  websiteLink?: string;
  googleMapsLink?: string;
}

// Define accommodationTypeDetails
export const accommodationTypeDetails: { [key: string]: { icon: React.ElementType, color: string, label: string } } = {
  hotel: { icon: Bed, color: "bg-blue-500", label: "Hotel" },
  airbnb: { icon: Home, color: "bg-red-500", label: "Airbnb" },
  hostel: { icon: HotelIcon, color: "bg-purple-500", label: "Hostel" },
  apartment: { icon: Building, color: "bg-purple-500", label: "Apartment" },
  other: { icon: Briefcase, color: "bg-gray-500", label: "Other" },
};
export const defaultAccommodationDetail = { icon: Briefcase, color: "bg-gray-500", label: "Other" };

// For the type dropdown in forms
const ACCOMMODATION_TYPES = Object.entries(accommodationTypeDetails).map(([value, { label }]) => ({ value, label }));

interface TripAccommodationsProps {
  tripId: string;
  inDialog?: boolean;
  onSuccess?: () => void;
}

export function TripAccommodations({ tripId, inDialog = false, onSuccess }: TripAccommodationsProps) {
  const [isPending, startTransition] = useTransition();
  const { accommodationsByTrip, loadingByTrip, fetchAccommodations, addAccommodation, updateAccommodation, removeAccommodation } = useTripAccommodationsStore();
  const accommodations = accommodationsByTrip[tripId] || [];
  const loading = loadingByTrip[tripId] ?? true;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AccommodationForm>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AccommodationForm>>({});
  const [editErrors, setEditErrors] = useState<{ name?: string; address?: string; checkIn?: string; checkOut?: string, type?: string }>({});
  const { resolvedTheme } = useTheme();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const accommodationsRef = useRef(accommodations);
  const { toast } = useToast();
  const [selectedEditType, setSelectedEditType] = useState("");
  const [customEditType, setCustomEditType] = useState("");

  useEffect(() => { accommodationsRef.current = accommodations; }, [accommodations]);

  useEffect(() => {
    if (!accommodationsByTrip[tripId]) {
      fetchAccommodations(tripId);
    }
  }, [tripId, fetchAccommodations, accommodationsByTrip]);

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
      const res = await fetch(`/api/trips/${tripId}/accommodations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          link: data.websiteLink,
          latitude,
          longitude,
          type: data.type === 'other' && data.customType ? data.customType : data.type,
        }),
      });
      if (res.ok) {
        const newAccommodation = await res.json();
        // Update the store
        addAccommodation(tripId, newAccommodation);
        reset();
        if (!inDialog) {
          setEditDialogOpen(false);
        } else {
          onSuccess?.();
        }
        toast({ title: "Accommodation created", description: "The accommodation was added successfully." });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Failed to create accommodation", description: data.error || "Something went wrong.", variant: "destructive" });
      }
    });
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/trips/${tripId}/accommodations`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      removeAccommodation(tripId, id);
      toast({ title: "Accommodation deleted", description: "The accommodation was deleted successfully." });
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: "Failed to delete accommodation", description: data.error || "Something went wrong.", variant: "destructive" });
    }
  };

  const handleEdit = (acc: Accommodation) => {
    setEditingId(acc.id);
    setEditForm({
      ...acc,
      websiteLink: acc.websiteLink || '',
      googleMapsLink: acc.googleMapsLink || '',
    });
    setEditErrors({});

    const isKnownType = ACCOMMODATION_TYPES.some(t => t.value === acc.type);
    if (isKnownType && acc.type) {
      setSelectedEditType(acc.type);
      setCustomEditType("");
    } else {
      setSelectedEditType("other");
      setCustomEditType(acc.type || "");
    }
    setEditDialogOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    // Validate
    const errors: { name?: string; address?: string; checkIn?: string; checkOut?: string, type?: string } = {};
    if (!editForm.name) errors.name = "Name is required";
    if (!editForm.address) errors.address = "Address is required";
    if (!selectedEditType) errors.type = "Type is required";
    if (selectedEditType === "other" && !customEditType) errors.type = "Custom type is required";
    if (!editForm.checkIn) errors.checkIn = "Check-in date is required";
    if (!editForm.checkOut) errors.checkOut = "Check-out date is required";
    
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return false;
    // Extract lat/lng
    let latitude, longitude;
    if (editForm.googleMapsLink) {
      const coords = extractLatLngFromGoogleMapsUrl(editForm.googleMapsLink);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }
    // Save
    const res = await fetch(`/api/trips/${tripId}/accommodations`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        websiteLink: editForm.websiteLink,
        latitude,
        longitude,
        type: selectedEditType === 'other' ? customEditType : selectedEditType,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      updateAccommodation(tripId, updated);
      setEditingId(null);
      setEditForm({});
      setEditErrors({});
      setSelectedEditType("");
      setCustomEditType("");
      setEditDialogOpen(false);
      toast({ title: "Accommodation updated", description: "The accommodation was updated successfully." });
      return true;
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: "Failed to update accommodation", description: data.error || "Something went wrong.", variant: "destructive" });
    }
    return false;
  };

  const handleEditDialogClose = () => {
    setEditingId(null);
    setEditForm({});
    setEditErrors({});
    setSelectedEditType("");
    setCustomEditType("");
    setEditDialogOpen(false);
  };

  if (loading && accommodations.length === 0) {
    return <AccommodationsSkeleton />;
  }

  return (
    <div className="relative">
      <div className="space-y-5">
        {accommodations.length === 0 && !loading ? (
          <div className="text-center py-10 text-muted-foreground">
            <Bed className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium">No accommodations added yet.</h3>
            <p className="mt-1 text-sm text-gray-500">Add accommodations to your trip to see them here.</p>
          </div>
        ) : (
          accommodations.map(acc => {
            const accTypeDetail = (acc.type && accommodationTypeDetails[acc.type.toLowerCase()]) || defaultAccommodationDetail;
            const IconComponent = accTypeDetail.icon;

            let checkInDisplay = "";
            let checkOutDisplay = "";
            try {
              if (acc.checkIn) {
                const dateObj = new Date(acc.checkIn);
                if (!isNaN(dateObj.getTime())) {
                  checkInDisplay = format(dateObj, (dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0) ? 'MMM d, p' : 'MMM d');
                }
              }
              if (acc.checkOut) {
                const dateObj = new Date(acc.checkOut);
                if (!isNaN(dateObj.getTime())) {
                  checkOutDisplay = format(dateObj, (dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0) ? 'MMM d, p' : 'MMM d');
                }
              }
            } catch (e) { /* console.error("Date formatting error:", e); */ }
            
            return (
              <div key={acc.id} className="flex items-start gap-x-4 relative">
                <div className="relative last:after:hidden after:absolute after:top-10 after:bottom-0 after:start-[1.125rem] after:w-px after:-translate-x-1/2 after:bg-gray-300 dark:after:bg-slate-700">
                  <div className="relative z-10 w-9 h-9 flex items-center justify-center">
                    <div className={cn("w-full h-full rounded-full flex items-center justify-center text-white", accTypeDetail.color)}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="grow bg-card shadow-lg rounded-lg p-4 pb-8 pr-10 relative min-w-0 flex-1 min-h-[150px]">
                  <div className="absolute top-3 right-2.5 z-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:bg-muted/50">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border-border shadow-lg">
                        <DropdownMenuItem onClick={() => handleEdit(acc)} className="hover:bg-muted/50 focus:bg-muted/50">
                          Edit Accommodation
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(acc.id)} className="text-red-600 dark:text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-500">
                          Delete Accommodation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-col">
                    {(checkInDisplay || checkOutDisplay) && (
                      <div className="text-sm font-medium text-blue-600 dark:text-blue-500 mb-1">
                        {checkInDisplay && <p>Check-in: {checkInDisplay}</p>}
                        {checkOutDisplay && <p>Check-out: {checkOutDisplay}</p>}
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-foreground mb-1.5 leading-tight pr-6">
                      {acc.name}
                    </h3>
                    {acc.type && <p className="text-xs text-muted-foreground mb-1.5">Type: {accTypeDetail.label}</p>}
                    {acc.address && (
                      <div className="flex items-center text-sm text-muted-foreground mb-2">
                        <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
                        <span>{acc.address}</span>
                      </div>
                    )}
                    {acc.notes && (
                      <p className="text-sm text-muted-foreground mb-2.5 leading-relaxed">
                        {acc.notes}
                      </p>
                    )}
                    {acc.link && (
                      <a
                        href={acc.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                      >
                        Booking Link <ExternalLink className="w-3 h-3"/>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <Dialog open={editDialogOpen} onOpenChange={open => { if (!open) handleEditDialogClose(); }}>
        <DialogContent className="bg-background dark:text-white border-border">
          <DialogHeader>
            <DialogTitle>Edit Accommodation</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleEditSave(); }} className="space-y-4">
            <div>
              <label htmlFor="edit-acc-name" className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
              <input id="edit-acc-name" name="name" value={editForm.name || ""} onChange={handleEditChange} placeholder="Accommodation Name" className="w-full border rounded-md px-3 py-2 bg-input text-foreground border-border focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2" />
              {editErrors.name && <div className="text-red-500 text-xs mt-1">{editErrors.name}</div>}
            </div>
            <div>
              <label htmlFor="edit-acc-type" className="block text-sm font-medium text-muted-foreground mb-1">Type</label>
              <select
                id="edit-acc-type"
                name="type"
                className="w-full border rounded-md px-3 py-2 bg-input text-foreground border-border focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2"
                value={selectedEditType}
                onChange={e => {
                  setSelectedEditType(e.target.value);
                  if (e.target.value !== 'other') setCustomEditType('');
                }}
              >
                <option value="">Select type</option>
                {ACCOMMODATION_TYPES.map(typeOpt => (
                  <option key={typeOpt.value} value={typeOpt.value}>{typeOpt.label}</option>
                ))}
              </select>
              {selectedEditType === "other" && (
                <input
                  type="text"
                  placeholder="Enter custom type"
                  value={customEditType}
                  onChange={e => setCustomEditType(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 mt-2 bg-input text-foreground border-border focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2"
                />
              )}
              {editErrors.type && <div className="text-red-500 text-xs mt-1">{editErrors.type}</div>}
            </div>
            <div>
              <label htmlFor="edit-acc-address" className="block text-sm font-medium text-muted-foreground mb-1">Address</label>
              <input id="edit-acc-address" name="address" value={editForm.address || ""} onChange={handleEditChange} placeholder="Address" className="w-full border rounded-md px-3 py-2 bg-input text-foreground border-border focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2" />
              {editErrors.address && <div className="text-red-500 text-xs mt-1">{editErrors.address}</div>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-acc-checkIn" className="block text-sm font-medium text-muted-foreground mb-1">Check-in</label>
                <input
                  id="edit-acc-checkIn"
                  type="datetime-local"
                  name="checkIn"
                  value={editForm.checkIn ? format(new Date(editForm.checkIn), "yyyy-MM-dd'T'HH:mm") : ""}
                  onChange={handleEditChange}
                  className="w-full border rounded-md px-3 py-2 bg-input text-foreground border-border focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2" />
                {editErrors.checkIn && <div className="text-red-500 text-xs mt-1">{editErrors.checkIn}</div>}
              </div>
              <div>
                <label htmlFor="edit-acc-checkOut" className="block text-sm font-medium text-muted-foreground mb-1">Check-out</label>
                <input
                  id="edit-acc-checkOut"
                  type="datetime-local"
                  name="checkOut"
                  value={editForm.checkOut ? format(new Date(editForm.checkOut), "yyyy-MM-dd'T'HH:mm") : ""}
                  onChange={handleEditChange}
                  className="w-full border rounded-md px-3 py-2 bg-input text-foreground border-border focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2" />
                {editErrors.checkOut && <div className="text-red-500 text-xs mt-1">{editErrors.checkOut}</div>}
              </div>
            </div>
            <div>
              <label htmlFor="edit-acc-link" className="block text-sm font-medium text-muted-foreground mb-1">Booking Link (optional)</label>
              <input id="edit-acc-link" name="link" value={editForm.link || ""} onChange={handleEditChange} placeholder="https://booking.example.com" className="w-full border rounded-md px-3 py-2 bg-input text-foreground border-border focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2" />
            </div>
            <div>
              <label htmlFor="edit-acc-notes" className="block text-sm font-medium text-muted-foreground mb-1">Notes (optional)</label>
              <textarea id="edit-acc-notes" name="notes" value={editForm.notes || ""} onChange={handleEditChange} placeholder="e.g., confirmation number, amenities" className="w-full border rounded-md px-3 py-2 bg-input text-foreground border-border focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2" />
            </div>
            <div>
              <label htmlFor="edit-acc-websiteLink" className="block text-sm font-medium text-muted-foreground mb-1">Website Link (optional)</label>
              <input id="edit-acc-websiteLink" name="websiteLink" value={editForm.websiteLink || ""} onChange={handleEditChange} placeholder="https://hotel.example.com" className="w-full border rounded-md px-3 py-2 bg-input text-foreground border-border focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2" />
            </div>
            <div>
              <label htmlFor="edit-acc-googleMapsLink" className="block text-sm font-medium text-muted-foreground mb-1">Google Maps Link (optional)</label>
              <input id="edit-acc-googleMapsLink" name="googleMapsLink" value={editForm.googleMapsLink || ""} onChange={handleEditChange} placeholder="Google Maps URL" className="w-full border rounded-md px-3 py-2 bg-input text-foreground border-border focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2" />
            </div>
            <DialogFooter className="flex flex-row gap-2 justify-end pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={handleEditDialogClose}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? <><Loader className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccommodationsSkeleton() {
  return (
    <div className="space-y-5">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-start gap-x-4 relative">
          <div className="relative last:after:hidden after:absolute after:top-10 after:bottom-0 after:start-[1.125rem] after:w-px after:-translate-x-1/2 after:bg-gray-200 dark:after:bg-slate-700">
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse"></div>
          </div>
          <div className="grow bg-muted/50 dark:bg-slate-800/50 shadow-lg rounded-lg p-4 pr-10 animate-pulse min-w-0 flex-1 min-h-[150px]">
            <div className="h-3 bg-muted-foreground/20 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-muted-foreground/20 rounded w-1/3 mb-2.5"></div>
            <div className="h-5 bg-muted-foreground/30 rounded w-3/4 mb-2.5"></div>
            <div className="h-4 bg-muted-foreground/20 rounded w-full mb-3"></div>
            <div className="h-3 bg-muted-foreground/20 rounded w-1/2 mt-1"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  // ... existing code ...
}); 