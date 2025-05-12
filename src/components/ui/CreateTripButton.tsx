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
import { UploadCloud, Loader, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Add the prop type
interface CreateTripButtonProps {
  onTripCreated?: () => void;
}

export function CreateTripButton({ onTripCreated }: CreateTripButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerProgress, setBannerProgress] = useState(0);
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [isBannerDragging, setIsBannerDragging] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  async function handleBannerUpload(file: File) {
    if (!file) return;
    setBannerUploading(true);
    setBannerProgress(0);
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    // Simulate progress
    const progressInterval = setInterval(() => {
      setBannerProgress((prev) => Math.min(prev + Math.random() * 20, 95));
    }, 300);
    try {
      const result = await uploadToCloudinary(file, "trip-banners");
      clearInterval(progressInterval);
      if (result?.secure_url) {
        setBannerUrl(result.secure_url);
        setBannerProgress(100);
      } else {
        setBannerUrl("");
        setBannerProgress(0);
      }
    } catch (e) {
      clearInterval(progressInterval);
      setBannerUrl("");
      setBannerProgress(0);
    } finally {
      setBannerUploading(false);
    }
  }

  function handleBannerFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleBannerUpload(file);
  }

  function handleBannerDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsBannerDragging(true);
  }
  function handleBannerDragLeave() {
    setIsBannerDragging(false);
  }
  function handleBannerDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsBannerDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleBannerUpload(file);
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;

      let bannerUrlToSend = bannerUrl;

      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          bannerUrl: bannerUrlToSend,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create trip");
      }

      toast({
        title: "Success",
        description: "Your trip has been created.",
      });

      // Reset form and state
      e.currentTarget.reset();
      setBannerFile(null);
      setBannerPreview(null);

      // Call the callback if provided
      if (onTripCreated) onTripCreated();

      // Navigate to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create New Trip</Button>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-card dark:text-white border border-gray-200 dark:border-gray-700">
        <DialogHeader className="dark:text-white">
          <DialogTitle>Create a New Trip</DialogTitle>
          <DialogDescription>
            Add the details for your new trip. You can add more information later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="grid w-full items-center gap-1.5">
              <Label>Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter trip title"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid w-full items-center gap-1.5">
              <Label>Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Enter trip description"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid w-full items-center gap-1.5">
              <Label>Banner Image</Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 transition-all duration-200 mb-2",
                  isBannerDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
                onDragOver={handleBannerDragOver}
                onDragLeave={handleBannerDragLeave}
                onDrop={handleBannerDrop}
                onClick={() => bannerInputRef.current?.click()}
                style={{ cursor: bannerUploading ? "not-allowed" : "pointer" }}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <UploadCloud className="h-8 w-8 text-primary mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {isBannerDragging
                      ? "Drop image here"
                      : "Drag & drop or click to select a banner image"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    ref={bannerInputRef}
                    onChange={handleBannerFileChange}
                    className="hidden"
                    disabled={bannerUploading}
                  />
                </div>
              </div>
              {bannerPreview && (
                <div className="mt-2 relative">
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="max-h-40 rounded-md object-cover border"
                  />
                  {bannerUploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-md">
                      <Loader className="h-8 w-8 text-white animate-spin mb-2" />
                      <Progress value={bannerProgress} className="w-2/3" />
                    </div>
                  )}
                  {!bannerUploading && bannerProgress === 100 && (
                    <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Trip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 