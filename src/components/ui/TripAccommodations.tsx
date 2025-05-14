"use client";
import { useEffect, useState, useTransition, useRef } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { create } from 'zustand';
import { getAblyClient } from '@/lib/ablyClient';
import { useToast } from "@/components/ui/use-toast";

interface Accommodation {
  id: string;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  link?: string;
  websiteLink?: string;
  googleMapsLink?: string;
}

interface TripAccommodationsState {
  accommodationsByTrip: Record<string, Accommodation[]>;
  loadingByTrip: Record<string, boolean>;
  fetchAccommodations: (tripId: string) => Promise<void>;
  addAccommodation: (tripId: string, acc: Accommodation) => void;
  updateAccommodation: (tripId: string, acc: Accommodation) => void;
  removeAccommodation: (tripId: string, accId: string) => void;
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

export function TripAccommodations({ tripId }: { tripId: string }) {
  const [isPending, startTransition] = useTransition();
  const { accommodationsByTrip, loadingByTrip, fetchAccommodations, addAccommodation, updateAccommodation, removeAccommodation } = useTripAccommodationsStore();
  const accommodations = accommodationsByTrip[tripId] || [];
  const loading = loadingByTrip[tripId] ?? true;
  const { register, handleSubmit, reset } = useForm<AccommodationForm>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AccommodationForm>>({});
  const [editErrors, setEditErrors] = useState<{ name?: string; address?: string; checkIn?: string; checkOut?: string }>({});
  const { resolvedTheme } = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const accommodationsRef = useRef(accommodations);
  useEffect(() => { accommodationsRef.current = accommodations; }, [accommodations]);
  const { toast } = useToast();

  useEffect(() => {
    if (!accommodationsByTrip[tripId]) {
      fetchAccommodations(tripId);
    }
  }, [tripId, fetchAccommodations, accommodationsByTrip]);

  useEffect(() => {
    let channel: any = null;
    let unsubscribes: (() => void)[] = [];
    let ably: any = null;
    let isMounted = true;
    async function setupAbly() {
      console.log("Subscribing to Ably channel for trip", tripId);
      ably = await getAblyClient();
      channel = ably.channels.get(`accommodations:${tripId}`);
      const handleCreated = (msg: any) => {
        console.log("Ably event received (accommodation):", msg.data);
        console.log("Current accommodationsRef before add:", accommodationsRef.current);
        if (!(accommodationsRef.current || []).some(a => a.id === msg.data.id)) {
          addAccommodation(tripId, msg.data);
        }
      };
      const handleDeleted = (msg: any) => { removeAccommodation(tripId, msg.data.id); };
      const handleUpdated = (msg: any) => { updateAccommodation(tripId, msg.data); };
      channel.subscribe('accommodation-created', handleCreated);
      channel.subscribe('accommodation-deleted', handleDeleted);
      channel.subscribe('accommodation-updated', handleUpdated);
      unsubscribes = [
        () => channel.unsubscribe('accommodation-created', handleCreated),
        () => channel.unsubscribe('accommodation-deleted', handleDeleted),
        () => channel.unsubscribe('accommodation-updated', handleUpdated),
      ];
    }
    setupAbly();
    return () => {
      isMounted = false;
      unsubscribes.forEach(fn => fn());
      console.log("Unsubscribed from Ably channel for trip", tripId);
    };
  }, [tripId, addAccommodation, removeAccommodation, updateAccommodation]);

  const onSubmit = (data: any) => {
    startTransition(async () => {
      let latitude, longitude;
      if (data.googleMapsLink) {
        const coords = extractLatLngFromGoogleMapsUrl(data.googleMapsLink);
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
          websiteLink: data.websiteLink,
          latitude,
          longitude,
        }),
      });
      if (res.ok) {
        reset();
        setDialogOpen(false);
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
    setEditDialogOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    // Validate
    const errors: { name?: string; address?: string; checkIn?: string; checkOut?: string } = {};
    if (!editForm.name) errors.name = "Name is required";
    if (!editForm.address) errors.address = "Address is required";
    if (!editForm.checkIn) errors.checkIn = "Check-in is required";
    if (!editForm.checkOut) errors.checkOut = "Check-out is required";
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
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      updateAccommodation(tripId, updated);
      setEditingId(null);
      setEditForm({});
      setEditErrors({});
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
    setEditDialogOpen(false);
  };

  if (loading) {
    return <AccommodationsSkeleton />;
  }

  return (
    <div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => setDialogOpen(true)} className="mb-4">Add Accommodation</Button>
        </DialogTrigger>
        <DialogContent className="bg-white dark:bg-card dark:text-white border border-gray-200 dark:border-gray-700">
          <DialogHeader className="dark:text-white">
            <DialogTitle>Add Accommodation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            <div>
              <input {...register("name", { required: true })} placeholder="Name" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <input {...register("address", { required: true })} placeholder="Address" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <input type="datetime-local" {...register("checkIn", { required: true })} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <input type="datetime-local" {...register("checkOut", { required: true })} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <input {...register("link")} placeholder="Booking Link (optional)" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <input {...register("websiteLink")} placeholder="Website Link (optional)" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <input {...register("googleMapsLink")} placeholder="Google Maps Link (optional, for map)" className="w-full border rounded px-3 py-2" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>Add Accommodation</Button>
              <DialogClose asChild>
                <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Edit Accommodation Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={open => { if (!open) handleEditDialogClose(); }}>
        <DialogContent className="bg-white dark:bg-card dark:text-white border border-gray-200 dark:border-gray-700">
          <DialogHeader className="dark:text-white">
            <DialogTitle>Edit Accommodation</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleEditSave(); }} className="space-y-2">
            <div>
              <input name="name" value={editForm.name || ""} onChange={handleEditChange} placeholder="Name" className="w-full border rounded px-3 py-2" />
              {editErrors.name && <div className="text-red-500 text-xs mt-1">{editErrors.name}</div>}
            </div>
            <div>
              <input name="address" value={editForm.address || ""} onChange={handleEditChange} placeholder="Address" className="w-full border rounded px-3 py-2" />
              {editErrors.address && <div className="text-red-500 text-xs mt-1">{editErrors.address}</div>}
            </div>
            <div>
              <input type="datetime-local" name="checkIn" value={editForm.checkIn || ""} onChange={handleEditChange} className="w-full border rounded px-3 py-2" />
              {editErrors.checkIn && <div className="text-red-500 text-xs mt-1">{editErrors.checkIn}</div>}
            </div>
            <div>
              <input type="datetime-local" name="checkOut" value={editForm.checkOut || ""} onChange={handleEditChange} className="w-full border rounded px-3 py-2" />
              {editErrors.checkOut && <div className="text-red-500 text-xs mt-1">{editErrors.checkOut}</div>}
            </div>
            <div>
              <input name="link" value={editForm.link || ""} onChange={handleEditChange} placeholder="Booking Link (optional)" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <input name="websiteLink" value={editForm.websiteLink || ""} onChange={handleEditChange} placeholder="Website Link (optional)" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <input name="googleMapsLink" value={editForm.googleMapsLink || ""} onChange={handleEditChange} placeholder="Google Maps Link (optional, for map)" className="w-full border rounded px-3 py-2" />
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
      <div className="space-y-4">
        {accommodations.length === 0 ? (
          <div className="text-gray-500">No accommodations added yet.</div>
        ) : (
          accommodations.map(acc => (
            <div
              key={acc.id}
              className={`border rounded p-4 bg-white dark:bg-card flex justify-between items-start gap-4`}
            >
              <div className="flex-1">
                <div className="font-semibold text-lg">{acc.name}</div>
                <div className="text-gray-600">{acc.address}</div>
                <div className="text-gray-500 text-sm">
                  Check-in: {new Date(acc.checkIn).toLocaleString()}<br />
                  Check-out: {new Date(acc.checkOut).toLocaleString()}
                </div>
                {acc.link && <a href={acc.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Booking Link</a>}
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(acc)}>Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(acc.id)}>Delete</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AccommodationsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse bg-muted rounded p-4 h-20" />
      ))}
    </div>
  );
} 