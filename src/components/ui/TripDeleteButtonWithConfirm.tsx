"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function TripDeleteButtonWithConfirm({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/trips/${tripId}`, { method: 'DELETE' });
      
      if (res.ok) {
        setOpen(false);
        toast({ 
          title: 'Trip deleted', 
          description: 'Your trip was successfully deleted.' 
        });
        router.push('/dashboard');
      } else {
        const data = await res.json();
        toast({ 
          title: 'Failed to delete trip', 
          description: data.error || 'Something went wrong.', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      toast({ 
        title: 'Failed to delete trip', 
        description: 'An unexpected error occurred.', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
      >
        <Trash2 size={16} className="mr-2" /> Delete Trip
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Trip</DialogTitle>
        </DialogHeader>
        <p className="mb-4">Are you sure you want to delete this trip? This action cannot be undone.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 