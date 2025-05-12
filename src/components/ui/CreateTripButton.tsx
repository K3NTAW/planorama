"use client";
import { useState } from "react";
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

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBannerFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;

      let bannerUrl = "";
      if (bannerFile) {
        const uploaded = await uploadToCloudinary(bannerFile);
        if (uploaded && "secure_url" in uploaded) {
          bannerUrl = uploaded.secure_url;
        }
      }

      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          bannerUrl,
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
              <Input
                id="banner"
                name="banner"
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
              />
              {bannerPreview && (
                <div className="mt-2">
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="max-h-40 rounded-md object-cover"
                  />
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