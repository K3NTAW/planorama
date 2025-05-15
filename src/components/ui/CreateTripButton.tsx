"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { UploadCloud, Loader, CheckCircle, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Add the prop type
interface CreateTripButtonProps {
  onTripCreated?: () => void;
}

export function CreateTripButton({ onTripCreated }: CreateTripButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerProgress, setBannerProgress] = useState(0);
  const [isBannerDragging, setIsBannerDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setBannerPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsBannerDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsBannerDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsBannerDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setBannerPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      let bannerUrl = null;

      if (bannerFile) {
        setBannerUploading(true);
        try {
          // Simulate progress
          const progressInterval = setInterval(() => {
            setBannerProgress((prev) => Math.min(prev + Math.random() * 20, 95));
          }, 300);

          const result = await uploadToCloudinary(bannerFile, "trip-banners");
          clearInterval(progressInterval);
          
          if (result?.secure_url) {
            bannerUrl = result.secure_url;
            setBannerProgress(100);
          } else {
            toast({
              title: "Failed to upload banner",
              description: "There was an error uploading your banner image. Please try again.",
              variant: "destructive",
            });
            return;
          }
          setBannerUploading(false);
        } catch (error) {
          setBannerUploading(false);
          toast({
            title: "Failed to upload banner",
            description: "There was an error uploading your banner image. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      // Format dates as ISO strings
      const startDate = formData.get("startDate") as string;
      const endDate = formData.get("endDate") as string;

      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          destination: formData.get("destination"),
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          bannerUrl,
        }),
      });

      if (res.ok) {
        const trip = await res.json();
        setOpen(false);
        toast({
          title: "Trip created",
          description: "Your trip was created successfully.",
        });
        if (onTripCreated) {
          onTripCreated();
        }
        router.push(`/trips/${trip.id}`);
      } else {
        const data = await res.json();
        toast({
          title: "Failed to create trip",
          description: data.error || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to create trip",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Trip</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Trip</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new trip.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="grid w-full items-center gap-1.5">
              <Label>Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter trip name"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid w-full items-center gap-1.5">
              <Label>Destination</Label>
              <Input
                id="destination"
                name="destination"
                placeholder="Enter destination"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid w-full items-center gap-1.5">
              <Label>Start Date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid w-full items-center gap-1.5">
              <Label>End Date</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Banner Image (optional)</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                isBannerDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
                bannerPreview ? "p-0" : ""
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              {bannerUploading ? (
                <div className="space-y-2">
                  <Loader className="animate-spin mx-auto" />
                  <div className="text-sm text-gray-500">Uploading...</div>
                  <Progress value={bannerProgress} className="w-full" />
                </div>
              ) : bannerPreview ? (
                <div className="relative">
                  <img
                    src={bannerPreview}
                    alt="Banner Preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveBanner();
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadCloud className="mx-auto h-8 w-8 text-gray-400" />
                  <div className="text-sm text-gray-500">
                    Drag and drop an image, or click to select
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || bannerUploading}>
              {isLoading ? "Creating..." : "Create Trip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 