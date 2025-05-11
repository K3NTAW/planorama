"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export function TripDeleteButton({ tripId, onDeleted }: { tripId: string; onDeleted: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const handleDelete = async () => {
    setIsLoading(true);
    await fetch(`/api/trips/${tripId}`, { method: 'DELETE' });
    setIsLoading(false);
    onDeleted();
  };
  return (
    <button
      onClick={handleDelete}
      disabled={isLoading}
      className="absolute top-2 right-2 p-1 rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
      title="Delete trip"
    >
      <Trash2 size={16} />
    </button>
  );
} 