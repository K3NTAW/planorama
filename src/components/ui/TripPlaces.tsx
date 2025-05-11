"use client";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";

interface Place {
  id: string;
  name: string;
  type: string;
  address?: string;
  link?: string;
  notes?: string;
}

export function TripPlaces({ tripId }: { tripId: string }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Omit<Place, 'id'>>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Place>>({});
  const [editErrors, setEditErrors] = useState<{ name?: string; type?: string }>({});

  useEffect(() => {
    fetch(`/api/trips/${tripId}/places`)
      .then(res => res.json())
      .then(data => setPlaces(data || []));
  }, [tripId]);

  const onSubmit = (data: Omit<Place, 'id'>) => {
    startTransition(async () => {
      const res = await fetch(`/api/trips/${tripId}/places`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newPlace = await res.json();
        setPlaces(prev => [...prev, newPlace]);
        reset();
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
      setPlaces(prev => prev.filter(place => place.id !== id));
    }
  };

  const handleEdit = (place: Place) => {
    setEditingId(place.id);
    setEditForm({ ...place });
    setEditErrors({});
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    // Validate
    const errors: { name?: string; type?: string } = {};
    if (!editForm.name) errors.name = "Name is required";
    if (!editForm.type) errors.type = "Type is required";
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;
    // Save
    const res = await fetch(`/api/trips/${tripId}/places`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setPlaces(prev => prev.map(p => p.id === updated.id ? updated : p));
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 mb-6">
        <div className="flex gap-2">
          <div className="flex-1">
            <input {...register("name", { required: "Name is required" })} placeholder="Name" className="w-full border rounded px-3 py-2" />
            {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name.message}</div>}
          </div>
          <div className="flex-1">
            <input {...register("type", { required: "Type is required" })} placeholder="Type (e.g. Museum, Restaurant)" className="w-full border rounded px-3 py-2" />
            {errors.type && <div className="text-red-500 text-xs mt-1">{errors.type.message}</div>}
          </div>
        </div>
        <div className="flex gap-2">
          <input {...register("address")} placeholder="Address (optional)" className="flex-1 border rounded px-3 py-2" />
          <input {...register("link")} placeholder="Link (optional)" className="flex-1 border rounded px-3 py-2" />
        </div>
        <textarea {...register("notes")} placeholder="Notes (optional)" className="w-full border rounded px-3 py-2" />
        <Button type="submit" disabled={isPending}>Add Place</Button>
      </form>
      <div className="space-y-4">
        {places.length === 0 ? (
          <div className="text-gray-500">No places added yet.</div>
        ) : (
          places.map(place => (
            <div key={place.id} className="border rounded p-4 bg-white flex justify-between items-start gap-4">
              {editingId === place.id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input name="name" value={editForm.name || ""} onChange={handleEditChange} placeholder="Name" className="w-full border rounded px-3 py-2" />
                      {editErrors.name && <div className="text-red-500 text-xs mt-1">{editErrors.name}</div>}
                    </div>
                    <div className="flex-1">
                      <input name="type" value={editForm.type || ""} onChange={handleEditChange} placeholder="Type" className="w-full border rounded px-3 py-2" />
                      {editErrors.type && <div className="text-red-500 text-xs mt-1">{editErrors.type}</div>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input name="address" value={editForm.address || ""} onChange={handleEditChange} placeholder="Address (optional)" className="flex-1 border rounded px-3 py-2" />
                    <input name="link" value={editForm.link || ""} onChange={handleEditChange} placeholder="Link (optional)" className="flex-1 border rounded px-3 py-2" />
                  </div>
                  <textarea name="notes" value={editForm.notes || ""} onChange={handleEditChange} placeholder="Notes (optional)" className="w-full border rounded px-3 py-2" />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={handleEditSave} type="button">Save</Button>
                    <Button size="sm" variant="secondary" onClick={handleEditCancel} type="button">Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <div className="font-semibold text-lg">{place.name} <span className="text-sm text-gray-400">({place.type})</span></div>
                  {place.address && <div className="text-gray-600">{place.address}</div>}
                  {place.link && <a href={place.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Link</a>}
                  {place.notes && <div className="text-gray-500 text-sm mt-1">{place.notes}</div>}
                </div>
              )}
              {editingId === place.id ? null : (
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(place)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(place.id)}>Delete</Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
} 