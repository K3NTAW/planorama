"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { TripPlaces } from "@/components/ui/TripPlaces";
import { TripAccommodations } from "@/components/ui/TripAccommodations";
import { TripFilesTab } from "@/components/trip/TripFilesTab";
import { TripMapTab } from "@/components/trip/TripMapTab";
import { TripSettingsTab } from "@/components/trip/TripSettingsTab";
import { useTripPlacesStore } from "@/components/ui/TripPlaces";
import { useTripAccommodationsStore } from "@/components/ui/TripAccommodations";
import { useTripFilesStore } from "@/components/trip/TripFilesTab";
import { getAblyClient } from "@/lib/ablyClient";

function FilesSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse bg-muted rounded p-4 h-20" />
      ))}
    </div>
  );
}

interface TripTabsProps {
  tripId: string;
  initialPlacesCount: number;
  initialAccommodationsCount: number;
  initialFilesCount: number;
}

interface Place {
  id: string;
  name: string;
  type: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  files?: { url: string }[];
}

interface Accommodation {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export function TripTabs({ tripId, initialPlacesCount, initialAccommodationsCount, initialFilesCount }: TripTabsProps) {
  const [showPlacesTab, setShowPlacesTab] = useState(initialPlacesCount > 0);
  const [showMapTab, setShowMapTab] = useState(false);
  const [showFilesTab, setShowFilesTab] = useState(initialFilesCount > 0);
  const [showAccommodationTab, setShowAccommodationTab] = useState(initialAccommodationsCount > 0);
  const { accommodationsByTrip, setAccommodations, loadingByTrip: accommodationsLoading } = useTripAccommodationsStore();
  const { placesByTrip, setPlaces, loadingByTrip: placesLoading } = useTripPlacesStore();
  const { filesByTrip, placeFilesByTrip, loadingByTrip: filesLoading, fetchAll: fetchAllFiles } = useTripFilesStore();
  const isMounted = useRef(true);

  // Memoize the data to prevent unnecessary re-renders
  const accommodations = useMemo(() => accommodationsByTrip[tripId] || [], [accommodationsByTrip, tripId]);
  const places = useMemo(() => placesByTrip[tripId] || [], [placesByTrip, tripId]);
  const tripFiles = useMemo(() => filesByTrip[tripId] || [], [filesByTrip, tripId]);
  const placeFiles = useMemo(() => placeFilesByTrip[tripId] || [], [placeFilesByTrip, tripId]);

  // Memoize the handlers to prevent unnecessary re-renders
  const handlePlacesUpdate = useCallback((msg: any) => {
    if (!isMounted.current) return;
    if (msg.data.type === 'place-created') {
      setPlaces(tripId, [...places, msg.data]);
      setShowPlacesTab(true);
    } else if (msg.data.type === 'place-updated') {
      setPlaces(tripId, places.map(p => p.id === msg.data.id ? msg.data : p));
    } else if (msg.data.type === 'place-deleted') {
      const newPlaces = places.filter(p => p.id !== msg.data.id);
      setPlaces(tripId, newPlaces);
      setShowPlacesTab(newPlaces.length > 0);
    }
  }, [tripId, places, setPlaces]);

  const handleAccommodationsUpdate = useCallback((msg: any) => {
    if (!isMounted.current) return;
    if (msg.data.type === 'accommodation-created') {
      setAccommodations(tripId, [...accommodations, msg.data]);
      setShowAccommodationTab(true);
    } else if (msg.data.type === 'accommodation-updated') {
      setAccommodations(tripId, accommodations.map(a => a.id === msg.data.id ? msg.data : a));
    } else if (msg.data.type === 'accommodation-deleted') {
      const newAccommodations = accommodations.filter(a => a.id !== msg.data.id);
      setAccommodations(tripId, newAccommodations);
      setShowAccommodationTab(newAccommodations.length > 0);
    }
  }, [tripId, accommodations, setAccommodations]);

  const handleFilesUpdate = useCallback((msg: any) => {
    if (!isMounted.current) return;
    const store = useTripFilesStore.getState();
    if (msg.data.type === 'file-created') {
      store.addTripFile(tripId, msg.data);
      // Get the latest state after the update
      const { filesByTrip, placeFilesByTrip } = useTripFilesStore.getState();
      const tripFiles = filesByTrip[tripId] || [];
      const placeFiles = placeFilesByTrip[tripId] || [];
      setShowFilesTab(tripFiles.length > 0 || placeFiles.length > 0);
    } else if (msg.data.type === 'file-deleted') {
      store.removeTripFile(tripId, msg.data.id);
      // Get the latest state after the update
      const { filesByTrip, placeFilesByTrip } = useTripFilesStore.getState();
      const tripFiles = filesByTrip[tripId] || [];
      const placeFiles = placeFilesByTrip[tripId] || [];
      setShowFilesTab(tripFiles.length > 0 || placeFiles.length > 0);
    }
  }, [tripId]);

  // Real-time Ably subscription
  useEffect(() => {
    let channel: any = null;
    let ably: any = null;

    async function setup() {
      if (!isMounted.current) return;
      ably = await getAblyClient();
      if (!isMounted.current) return;
      
      // Subscribe to the main trips channel for tab visibility
      const tripsChannel = ably.channels.get('trips');
      const tripsHandler = (msg: any) => {
        if (!isMounted.current) return;
        if (msg.data.id === tripId) {
          setShowPlacesTab(msg.data.places?.length > 0);
          setShowAccommodationTab(msg.data.accommodations?.length > 0);
          setShowFilesTab(msg.data.files?.length > 0);
        }
      };
      tripsChannel.subscribe('trip-updated', tripsHandler);

      // Subscribe to places channel
      const placesChannel = ably.channels.get(`places:${tripId}`);
      placesChannel.subscribe(['place-created', 'place-updated', 'place-deleted'], handlePlacesUpdate);

      // Subscribe to accommodations channel
      const accChannel = ably.channels.get(`accommodations:${tripId}`);
      accChannel.subscribe(['accommodation-created', 'accommodation-updated', 'accommodation-deleted'], handleAccommodationsUpdate);

      // Subscribe to files channel
      const filesChannel = ably.channels.get(`files:${tripId}`);
      filesChannel.subscribe(['file-created', 'file-deleted'], handleFilesUpdate);

      return () => {
        tripsChannel.unsubscribe('trip-updated', tripsHandler);
        placesChannel.unsubscribe(['place-created', 'place-updated', 'place-deleted'], handlePlacesUpdate);
        accChannel.unsubscribe(['accommodation-created', 'accommodation-updated', 'accommodation-deleted'], handleAccommodationsUpdate);
        filesChannel.unsubscribe(['file-created', 'file-deleted'], handleFilesUpdate);
      };
    }

    const cleanup = setup();

    return () => {
      isMounted.current = false;
      cleanup?.then(fn => fn?.());
    };
  }, [tripId, handlePlacesUpdate, handleAccommodationsUpdate, handleFilesUpdate]);

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        // First fetch accommodations and places
        const [accommodationsRes, placesRes] = await Promise.all([
          fetch(`/api/trips/${tripId}/accommodations`),
          fetch(`/api/trips/${tripId}/places`),
        ]);
        const accommodationsData = await accommodationsRes.json();
        const placesData = await placesRes.json();
        
        if (!isMounted.current) return;
        
        // Update the stores with the fetched data
        setAccommodations(tripId, accommodationsData);
        setPlaces(tripId, placesData);
        
        // Now fetch files
        await fetchAllFiles(tripId);
        
        // Get the latest files data after fetching
        const { filesByTrip, placeFilesByTrip } = useTripFilesStore.getState();
        const tripFiles = filesByTrip[tripId] || [];
        const placeFiles = placeFilesByTrip[tripId] || [];
        
        // Show files tab if there are files
        setShowFilesTab(tripFiles.length > 0 || placeFiles.length > 0);
        
        // Update tab visibility based on fetched data
        setShowAccommodationTab(accommodationsData.length > 0);
        setShowPlacesTab(placesData.length > 0);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();

    return () => {
      isMounted.current = false;
    };
  }, [tripId, setAccommodations, setPlaces, fetchAllFiles]);

  return (
    <Tabs defaultValue="places" className="w-full max-w-full">
      <TabsList className="mb-4 w-full max-w-full overflow-x-auto">
        {showPlacesTab && <TabsTrigger value="places">Places</TabsTrigger>}
        {showAccommodationTab && <TabsTrigger value="accommodation">Accommodation</TabsTrigger>}
        {showFilesTab && <TabsTrigger value="files">Files</TabsTrigger>}
        {showMapTab && <TabsTrigger value="map">Map</TabsTrigger>}
      </TabsList>
      {showPlacesTab && (
        <TabsContent value="places">
          <div className="w-full max-w-full">
            {placesLoading[tripId] ? (
              <div className="space-y-4 p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-muted rounded p-4 h-24" />
                ))}
              </div>
            ) : (
              <TripPlaces tripId={tripId} />
            )}
          </div>
        </TabsContent>
      )}
      {showAccommodationTab && (
        <TabsContent value="accommodation">
          <div className="w-full max-w-full">
            {accommodationsLoading[tripId] ? (
              <div className="space-y-4 p-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-muted rounded p-4 h-32" />
                ))}
              </div>
            ) : (
              <TripAccommodations tripId={tripId} />
            )}
          </div>
        </TabsContent>
      )}
      {showFilesTab && (
        <TabsContent value="files">
          <TripFilesTab tripId={tripId} />
        </TabsContent>
      )}
      {showMapTab && (
        <TabsContent value="map">
          <Card className="w-full max-w-full p-2 md:p-4">
            <TripMapTab tripId={tripId} />
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
} 