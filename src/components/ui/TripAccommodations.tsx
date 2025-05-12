"use client";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

interface Accommodation {
  id: string;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  link?: string;
}

export function TripAccommodations({ tripId }: { tripId: string }) {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, reset } = useForm<Omit<Accommodation, 'id'>>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Accommodation>>({});
  const [editErrors, setEditErrors] = useState<{ name?: string; address?: string; checkIn?: string; checkOut?: string }>({});
  const { resolvedTheme } = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/trips/${tripId}/accommodations`)
      .then(res => res.json())
      .then(setAccommodations);
  }, [tripId]);

  const onSubmit = (data: Omit<Accommodation, 'id'>) => {
    startTransition(async () => {
      const res = await fetch(`/api/trips/${tripId}/accommodations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newAccommodation = await res.json();
        setAccommodations(prev => [...prev, newAccommodation]);
        reset();
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
      setAccommodations(prev => prev.filter(acc => acc.id !== id));
    }
  };

  const handleEdit = (acc: Accommodation) => {
    setEditingId(acc.id);
    setEditForm({ ...acc });
    setEditErrors({});
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
    if (Object.keys(errors).length > 0) return;
    // Save
    const res = await fetch(`/api/trips/${tripId}/accommodations`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setAccommodations(prev => prev.map(a => a.id === updated.id ? updated : a));
      setEditingId(null);
      setEditForm({});
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({});
    setEditErrors({});
  };

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
            <DialogFooter>
              <Button type="submit" disabled={isPending}>Add Accommodation</Button>
              <DialogClose asChild>
                <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
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
              {editingId === acc.id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input name="name" value={editForm.name || ""} onChange={handleEditChange} placeholder="Name" className="w-full border rounded px-3 py-2" />
                      {editErrors.name && <div className="text-red-500 text-xs mt-1">{editErrors.name}</div>}
                    </div>
                    <div className="flex-1">
                      <input name="address" value={editForm.address || ""} onChange={handleEditChange} placeholder="Address" className="w-full border rounded px-3 py-2" />
                      {editErrors.address && <div className="text-red-500 text-xs mt-1">{editErrors.address}</div>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input type="datetime-local" name="checkIn" value={editForm.checkIn || ""} onChange={handleEditChange} className="flex-1 border rounded px-3 py-2" />
                    <input type="datetime-local" name="checkOut" value={editForm.checkOut || ""} onChange={handleEditChange} className="flex-1 border rounded px-3 py-2" />
                  </div>
                  <input name="link" value={editForm.link || ""} onChange={handleEditChange} placeholder="Booking Link (optional)" className="w-full border rounded px-3 py-2" />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={handleEditSave} type="button">Save</Button>
                    <Button size="sm" variant="secondary" onClick={handleEditCancel} type="button">Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <div className="font-semibold text-lg">{acc.name}</div>
                  <div className="text-gray-600">{acc.address}</div>
                  <div className="text-gray-500 text-sm">
                    Check-in: {new Date(acc.checkIn).toLocaleString()}<br />
                    Check-out: {new Date(acc.checkOut).toLocaleString()}
                  </div>
                  {acc.link && <a href={acc.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Booking Link</a>}
                </div>
              )}
              {editingId === acc.id ? null : (
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(acc)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(acc.id)}>Delete</Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
} 