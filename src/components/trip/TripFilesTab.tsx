"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { 
  File as FileIcon, 
  Trash2, 
  ExternalLink 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { create } from 'zustand';
import { getAblyClient } from '@/lib/ablyClient';
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "next-themes";

interface TripFilesTabProps {
  tripId: string;
}

interface TripFile {
  id: string;
  url: string;
  name: string;
  createdAt: string;
}

interface Place {
  id: string;
  name: string;
}

interface PlaceFile {
  id: string;
  url: string;
  name: string;
  createdAt: string;
  placeId: string;
  placeName: string;
}

interface TripFilesState {
  filesByTrip: Record<string, TripFile[]>;
  placeFilesByTrip: Record<string, PlaceFile[]>;
  placesByTrip: Record<string, Place[]>;
  loadingByTrip: Record<string, boolean>;
  fetchAll: (tripId: string) => Promise<void>;
  addTripFile: (tripId: string, file: TripFile) => void;
  addPlaceFile: (tripId: string, file: PlaceFile) => void;
  removeTripFile: (tripId: string, fileId: string) => void;
  removePlaceFile: (tripId: string, fileId: string) => void;
}

export const useTripFilesStore = create<TripFilesState>((set, get) => ({
  filesByTrip: {},
  placeFilesByTrip: {},
  placesByTrip: {},
  loadingByTrip: {},
  async fetchAll(tripId) {
    set(state => ({ loadingByTrip: { ...state.loadingByTrip, [tripId]: true } }));
    
    try {
      // Fetch trip files and place files in parallel
      const [filesRes, placeFilesRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/files`),
        fetch(`/api/trips/${tripId}/places/files`),
      ]);
      
      const files = await filesRes.json();
      const placeFiles = await placeFilesRes.json();
      
      // Transform place files to match expected format
      const transformedPlaceFiles = placeFiles.map((file: any) => ({
        id: file.id,
        url: file.url,
        name: file.name,
        createdAt: file.createdAt,
        placeId: file.place.id,
        placeName: file.place.name
      }));

      set(state => ({
        filesByTrip: { ...state.filesByTrip, [tripId]: files },
        placeFilesByTrip: { ...state.placeFilesByTrip, [tripId]: transformedPlaceFiles },
        loadingByTrip: { ...state.loadingByTrip, [tripId]: false },
      }));
    } catch (error) {
      console.error('Error fetching files:', error);
      set(state => ({ loadingByTrip: { ...state.loadingByTrip, [tripId]: false } }));
    }
  },
  addTripFile(tripId, file) {
    set(state => {
      const currentFiles = state.filesByTrip[tripId] || [];
      return {
        ...state,
        filesByTrip: { ...state.filesByTrip, [tripId]: [...currentFiles, file] },
        loadingByTrip: { ...state.loadingByTrip, [tripId]: false }
      };
    });
  },
  addPlaceFile(tripId, file) {
    set(state => {
      const currentFiles = state.placeFilesByTrip[tripId] || [];
      return {
        ...state,
        placeFilesByTrip: { ...state.placeFilesByTrip, [tripId]: [...currentFiles, file] },
        loadingByTrip: { ...state.loadingByTrip, [tripId]: false }
      };
    });
  },
  removeTripFile(tripId, fileId) {
    set(state => {
      const currentFiles = state.filesByTrip[tripId] || [];
      return {
        ...state,
        filesByTrip: { ...state.filesByTrip, [tripId]: currentFiles.filter(f => f.id !== fileId) },
        loadingByTrip: { ...state.loadingByTrip, [tripId]: false }
      };
    });
  },
  removePlaceFile(tripId, fileId) {
    set(state => {
      const currentFiles = state.placeFilesByTrip[tripId] || [];
      return {
        ...state,
        placeFilesByTrip: { ...state.placeFilesByTrip, [tripId]: currentFiles.filter(f => f.id !== fileId) },
        loadingByTrip: { ...state.loadingByTrip, [tripId]: false }
      };
    });
  }
}));

export function TripFilesTab({ tripId }: TripFilesTabProps) {
  const { filesByTrip, placeFilesByTrip, loadingByTrip, fetchAll, removeTripFile, removePlaceFile } = useTripFilesStore();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  // Memoize derived state
  const allFiles = useMemo(() => filesByTrip[tripId] || [], [filesByTrip, tripId]);
  const placeFiles = useMemo(() => placeFilesByTrip[tripId] || [], [placeFilesByTrip, tripId]);
  const loading = useMemo(() => loadingByTrip[tripId] ?? true, [loadingByTrip, tripId]);

  // Initial fetch
  useEffect(() => {
    if (!filesByTrip[tripId]) {
      fetchAll(tripId);
    }
  }, [tripId, fetchAll, filesByTrip]);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    const res = await fetch(`/api/trips/${tripId}/files`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: fileId }),
    });
    if (res.ok) {
      removeTripFile(tripId, fileId);
      toast({ title: "File deleted", description: "The file was deleted successfully." });
    } else {
      toast({ title: "Failed to delete file", description: "Something went wrong.", variant: "destructive" });
    }
  }, [tripId, removeTripFile, toast]);

  const handleDeletePlaceFile = useCallback(async (fileId: string) => {
    const res = await fetch(`/api/trips/${tripId}/places/files`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: fileId }),
    });
    if (res.ok) {
      removePlaceFile(tripId, fileId);
      toast({ title: "File deleted", description: "The file was deleted successfully." });
    } else {
      toast({ title: "Failed to delete file", description: "Something went wrong.", variant: "destructive" });
    }
  }, [tripId, removePlaceFile, toast]);

  if (loading) {
    return <FilesSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* All files list */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">All Files</h3>
        <div className="grid gap-4">
          {allFiles.map((file) => (
            <Card key={file.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-full",
                    resolvedTheme === 'dark' ? "bg-primary/20" : "bg-primary/10"
                  )}>
                    <FileIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(file.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteFile(file.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Place files list */}
      {placeFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Place Files</h3>
          <div className="grid gap-4">
            {placeFiles.map((file) => (
              <Card key={file.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full",
                      resolvedTheme === 'dark' ? "bg-primary/20" : "bg-primary/10"
                    )}>
                      <FileIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.placeName} • {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeletePlaceFile(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilesSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse bg-muted rounded p-4 h-20" />
      ))}
    </div>
  );
} 