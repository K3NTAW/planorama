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
  bannerUrl?: string;
}

export function CreateTripButton({ onTripCreated }: { onTripCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateTripForm>();
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setBannerFile(file);
    setBannerPreview(file ? URL.createObjectURL(file) : null);
  };

  const uploadToCloudinary = async (file: File): Promise<string | null> => {
    setUploading(true);
    // 1. Get signature
    const sigRes = await fetch("/api/cloudinary-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: "trip-banners" }),
    });
    if (!sigRes.ok) return null;
    const { cloudName, apiKey, timestamp, signature, folder } = await sigRes.json();
    // 2. Upload to Cloudinary
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", folder);
    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });
    setUploading(false);
    if (!uploadRes.ok) return null;
    const data = await uploadRes.json();
    return data.secure_url as string;
  };

  const onSubmit = (data: CreateTripForm) => {
    startTransition(async () => {
      let bannerUrl: string | undefined = data.bannerUrl;
      if (bannerFile) {
        const uploaded = await uploadToCloudinary(bannerFile);
        if (uploaded) bannerUrl = uploaded;
      }
      await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, bannerUrl }),
      });
      setOpen(false);
      reset();
      setBannerFile(null);
      setBannerPreview(null);
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
          <div>
            <label className="block mb-1 font-medium">Banner Image</label>
            <input type="file" accept="image/*" onChange={handleBannerChange} className="w-full" />
            {bannerPreview && (
              <img src={bannerPreview} alt="Banner Preview" className="mt-2 rounded w-full max-h-40 object-cover" />
            )}
            {uploading && <div className="text-xs text-blue-600 mt-1">Uploading image...</div>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || uploading}>Create</Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 