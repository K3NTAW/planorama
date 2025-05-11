"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function TripDeleteButtonWithConfirm({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsLoading(true);
    await fetch(`/api/trips/${tripId}`, { method: 'DELETE' });
    setIsLoading(false);
    setOpen(false);
    router.push('/dashboard');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ml-2 px-3 py-1 rounded bg-red-100 hover:bg-red-200 text-red-600 flex items-center gap-1"
        title="Delete trip"
      >
        <Trash2 size={16} /> Delete
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold mb-2">Delete Trip</h2>
            <p className="mb-4">Are you sure you want to delete this trip? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 