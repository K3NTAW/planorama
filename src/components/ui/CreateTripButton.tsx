"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";

interface CreateTripForm {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
}

export function CreateTripButton({ onTripCreated }: { onTripCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateTripForm>();

  const onSubmit = (data: CreateTripForm) => {
    startTransition(async () => {
      await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setOpen(false);
      reset();
      onTripCreated?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="mb-6">+ Create Trip</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a New Trip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Trip Name</label>
            <input {...register("name", { required: true })} className="w-full border rounded px-3 py-2" />
            {errors.name && <span className="text-red-500 text-xs">This field is required</span>}
          </div>
          <div>
            <label className="block mb-1 font-medium">Destination</label>
            <input {...register("destination", { required: true })} className="w-full border rounded px-3 py-2" />
            {errors.destination && <span className="text-red-500 text-xs">This field is required</span>}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block mb-1 font-medium">Start Date</label>
              <input type="date" {...register("startDate", { required: true })} className="w-full border rounded px-3 py-2" />
              {errors.startDate && <span className="text-red-500 text-xs">This field is required</span>}
            </div>
            <div className="flex-1">
              <label className="block mb-1 font-medium">End Date</label>
              <input type="date" {...register("endDate", { required: true })} className="w-full border rounded px-3 py-2" />
              {errors.endDate && <span className="text-red-500 text-xs">This field is required</span>}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>Create</Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 