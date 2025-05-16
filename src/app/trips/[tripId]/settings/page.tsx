"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { Loader, ArrowLeft, Settings } from "lucide-react";
import { TripCollaborators } from "@/components/trip/TripCollaborators";
import { TripEditDialog } from "@/components/trip/TripEditDialog";

export default function TripSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [tripName, setTripName] = useState<string>("");

  useEffect(() => {
    const fetchTripDetails = async () => {
      try {
        const res = await fetch(`/api/trips/${tripId}`);
        if (res.ok) {
          const data = await res.json();
          setTripName(data.name);
        }
      } catch (error) {
        console.error("Error fetching trip details:", error);
      }
    };

    fetchTripDetails();
  }, [tripId]);

  const handleDeleteTrip = async () => {
    if (!confirm("Are you sure you want to delete this trip? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "Trip deleted",
          description: "The trip was deleted successfully.",
        });
        router.push("/trips");
      } else {
        throw new Error("Failed to delete trip");
      }
    } catch (error) {
      console.error("Error deleting trip:", error);
      toast({
        title: "Failed to delete trip",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTripUpdated = async () => {
    // Refresh trip name after update
    const res = await fetch(`/api/trips/${tripId}`);
    if (res.ok) {
      const data = await res.json();
      setTripName(data.name);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-start justify-center">
      <div className="w-full max-w-2xl px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Collaborators Section */}
          <TripCollaborators tripId={tripId} />

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-700 text-lg">Danger Zone</CardTitle>
              <p className="text-sm text-muted-foreground">
                Actions in this section are irreversible. Please proceed with caution.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-medium text-base">Delete Trip</h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this trip and all its data. This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteTrip}
                  disabled={isDeleting}
                  className="w-full sm:w-auto"
                >
                  {isDeleting ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Trip"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 