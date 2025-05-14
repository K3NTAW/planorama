"use client";
import { useEffect, useState, useTransition, useRef } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { UploadCloud, Loader, CheckCircle, File as FileIcon, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Dialog as Modal, DialogContent as ModalContent, DialogHeader as ModalHeader, DialogTitle as ModalTitle } from "@/components/ui/dialog";
import { TripFilesTab } from "@/components/trip/TripFilesTab";
import { create } from 'zustand';
import { getAblyClient } from '@/lib/ablyClient';

interface Place {
  id: string;
  name: string;
  type: string;
  address?: string;
  link?: string;
  notes?: string;
  date?: string;
}

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

export function TripPlaces({ tripId }: { tripId: string }) {
  const [isPending, startTransition] = useTransition();
  const { placesByTrip, loadingByTrip, fetchPlaces, addPlace, updatePlace, removePlace, setPlaces } = useTripPlacesStore();
  const places = placesByTrip[tripId] || [];
  const loading = loadingByTrip[tripId] ?? true;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PlaceForm>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlaceForm>>({});
  const [editErrors, setEditErrors] = useState<{ name?: string; type?: string }>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileProgress, setFileProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileModalUrl, setFileModalUrl] = useState<string | null>(null);
  const [showFilesDialog, setShowFilesDialog] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const placesRef = useRef(places);
  const [selectedType, setSelectedType] = useState("");
  const [customType, setCustomType] = useState("");

  useEffect(() => { placesRef.current = places; }, [places]);

  useEffect(() => {
    if (!placesByTrip[tripId]) {
      fetchPlaces(tripId);
    }
  }, [tripId, fetchPlaces, placesByTrip]);

  useEffect(() => {
    let channel: any = null;
    let unsubscribes: (() => void)[] = [];
    let ably: any = null;
    let isMounted = true;
    async function setupAbly() {
      console.log("Subscribing to Ably channel for trip", tripId);
      ably = await getAblyClient();
      channel = ably.channels.get(`places:${tripId}`);
      const handlePlaceCreated = (msg: any) => {
        console.log("Ably event received", msg.data);
        if (!(placesRef.current || []).some(p => p.id === msg.data.id)) {
          addPlace(tripId, msg.data);
        }
      };
      const handlePlaceDeleted = (msg: any) => { removePlace(tripId, msg.data.id); };
      const handlePlaceUpdated = (msg: any) => { updatePlace(tripId, msg.data); };
      channel.subscribe('place-created', handlePlaceCreated);
      channel.subscribe('place-deleted', handlePlaceDeleted);
      channel.subscribe('place-updated', handlePlaceUpdated);
      unsubscribes = [
        () => channel.unsubscribe('place-created', handlePlaceCreated),
        () => channel.unsubscribe('place-deleted', handlePlaceDeleted),
        () => channel.unsubscribe('place-updated', handlePlaceUpdated),
      ];
    }
    setupAbly();
    return () => {
      isMounted = false;
      unsubscribes.forEach(fn => fn());
      // Do not close the singleton ably client here, just unsubscribe
    };
  }, [tripId, addPlace, removePlace, updatePlace]);

  async function handleFileUpload(file: File) {
    if (!file) return;
    setFileUploading(true);
    setFileProgress(0);
    // Simulate progress
    const progressInterval = setInterval(() => {
      setFileProgress((prev) => Math.min(prev + Math.random() * 20, 95));
    }, 300);
    try {
      const result = await uploadToCloudinary(file, `place-files/${tripId}`);
      clearInterval(progressInterval);
      if (result?.secure_url) {
        setUploadedFile({ url: result.secure_url, name: file.name });
        setFileProgress(100);
      } else {
        setUploadedFile(null);
        setFileProgress(0);
      }
    } catch (e) {
      clearInterval(progressInterval);
      setUploadedFile(null);
      setFileProgress(0);
    } finally {
      setFileUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }
  function handleFileDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsFileDragging(true);
  }
  function handleFileDragLeave() {
    setIsFileDragging(false);
  }
  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsFileDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }

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
        reset();
        setDialogOpen(false);
        setSelectedType("");
        setCustomType("");
      }
    });
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/trips/${tripId}/places`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      removePlace(tripId, id);
    }
  };

  const handleEdit = (place: Place) => {
    setEditingId(place.id);
    setEditForm({
      ...place,
      websiteLink: place.link || '',
      googleMapsLink: '', // You may want to prefill this if you store it
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
      return true;
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
    return <PlacesSkeleton />;
  }

  return (
    <div className="relative">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => setDialogOpen(true)} className="mb-4">Add Place</Button>
        </DialogTrigger>
        <DialogContent className="bg-white dark:bg-card dark:text-white border border-gray-200 dark:border-gray-700">
          <DialogHeader className="dark:text-white">
            <DialogTitle>Add a Place</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            <div>
              <input {...register("name", { required: "Name is required" })} placeholder="Name" className="w-full border rounded px-3 py-2" />
              {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name.message}</div>}
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
              {errors.type && <div className="text-red-500 text-xs mt-1">{errors.type.message}</div>}
            </div>
            <div>
              <input {...register("address") } placeholder="Address (optional)" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <input {...register("websiteLink")} placeholder="Website Link (optional)" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <input {...register("googleMapsLink")} placeholder="Google Maps Link (optional, for map)" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <input
                type="date"
                {...register("date")}
                placeholder="Date (optional)"
                className="w-full border rounded px-3 py-2"
                value={editingId && editForm.date ? new Date(editForm.date).toISOString().slice(0, 10) : editForm.date || ""}
                onChange={handleEditChange}
              />
              <div className="text-xs text-gray-500 mt-1">Set a date for this place to appear in your daily view.</div>
            </div>
            <div>
              <textarea {...register("notes") } placeholder="Notes (optional)" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-medium mb-1">Attach a file (optional)</label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 transition-all duration-200 mb-2",
                  isFileDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
                onDragOver={handleFileDragOver}
                onDragLeave={handleFileDragLeave}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{ cursor: fileUploading ? "not-allowed" : "pointer" }}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <UploadCloud className="h-8 w-8 text-primary mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {isFileDragging
                      ? "Drop file here"
                      : "Drag & drop or click to select a file (e.g. ticket, PDF)"}
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={fileUploading}
                  />
                </div>
              </div>
              {uploadedFile && (
                <div className="mt-2 relative border rounded p-2 flex items-center gap-2 bg-secondary/40">
                  <FileIcon className="h-6 w-6 text-muted-foreground" />
                  <span className="truncate flex-1">{uploadedFile.name}</span>
                  {fileUploading && (
                    <Loader className="h-5 w-5 text-primary animate-spin" />
                  )}
                  {!fileUploading && fileProgress === 100 && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  <Progress value={fileProgress} className="w-1/3 ml-2" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>Add Place</Button>
              <DialogClose asChild>
                <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <div className="space-y-4">
        {places.length === 0 ? (
          <div className="text-gray-500">No places added yet.</div>
        ) : (
          places.map(place => (
            <div key={place.id} className="border rounded p-4 bg-white dark:bg-card flex justify-between items-start gap-4 relative">
              <div className="flex-1">
                <div className="font-semibold text-lg">{place.name} <span className="text-sm text-gray-400">({place.type})</span></div>
                {place.address && <div className="text-gray-600">{place.address}</div>}
                {place.link && <a href={place.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Link</a>}
                {place.notes && <div className="text-gray-500 text-sm mt-1">{place.notes}</div>}
                {place.date && <div className="text-gray-500 text-sm">Date: {new Date(place.date).toISOString().slice(0, 10)}</div>}
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(place)}>Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(place.id)}>Delete</Button>
              </div>
              <div className="absolute bottom-2 right-2 z-10">
                <PlaceFileButton placeId={place.id} tripId={tripId} />
              </div>
            </div>
          ))
        )}
      </div>
      {/* File modal */}
      <Modal open={!!fileModalUrl} onOpenChange={open => !open && setFileModalUrl(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>View or Download File</ModalTitle>
          </ModalHeader>
          {fileModalUrl && (
            <div className="flex flex-col items-center gap-4">
              <iframe src={fileModalUrl} className="w-full h-96 border rounded" title="Place File Preview" />
              <a href={fileModalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                <ExternalLink className="h-4 w-4" /> Download / Open in new tab
              </a>
            </div>
          )}
        </ModalContent>
      </Modal>
      {/* Edit Place Dialog */}
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
                value={editingId && editForm.date ? new Date(editForm.date).toISOString().slice(0, 10) : editForm.date || ""}
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
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse bg-muted rounded p-4 h-20" />
      ))}
    </div>
  );
} 