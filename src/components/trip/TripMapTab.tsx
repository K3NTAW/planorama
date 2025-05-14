"use client";
import { useEffect, useState, useRef } from "react";
import { TripMap } from "@/components/trip/TripMap";
import { getAblyClient } from "@/lib/ablyClient";

interface Place {
  id: string;
  name: string;
  type?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
  files?: { url: string }[];
}
interface Accommodation {
  id: string;
  name: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export function TripMapTab({ tripId }: { tripId: string }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const ablyRef = useRef<any>(null);
  const unsubscribesRef = useRef<(() => void)[]>([]);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      const placesRes = await fetch(`/api/trips/${tripId}/places`);
      const placesData = await placesRes.json();
      setPlaces(Array.isArray(placesData) ? placesData : []);
      const accRes = await fetch(`/api/trips/${tripId}/accommodations`);
      const accData = await accRes.json();
      setAccommodations(Array.isArray(accData) ? accData : []);
    }
    fetchData();
  }, [tripId]);

  // Ably real-time subscription
  useEffect(() => {
    let isMounted = true;
    let ably: any = null;
    let unsubscribes: (() => void)[] = [];
    async function setupAbly() {
      ably = await getAblyClient();
      ablyRef.current = ably;
      const placesChannel = ably.channels.get(`places:${tripId}`);
      const accChannel = ably.channels.get(`accommodations:${tripId}`);
      const fetchAll = async () => {
        if (!isMounted) return;
        const placesRes = await fetch(`/api/trips/${tripId}/places`);
        const placesData = await placesRes.json();
        setPlaces(Array.isArray(placesData) ? placesData : []);
        const accRes = await fetch(`/api/trips/${tripId}/accommodations`);
        const accData = await accRes.json();
        setAccommodations(Array.isArray(accData) ? accData : []);
      };
      placesChannel.subscribe('place-created', fetchAll);
      placesChannel.subscribe('place-updated', fetchAll);
      placesChannel.subscribe('place-deleted', fetchAll);
      accChannel.subscribe('accommodation-created', fetchAll);
      accChannel.subscribe('accommodation-updated', fetchAll);
      accChannel.subscribe('accommodation-deleted', fetchAll);
      unsubscribes = [
        () => placesChannel.unsubscribe('place-created', fetchAll),
        () => placesChannel.unsubscribe('place-updated', fetchAll),
        () => placesChannel.unsubscribe('place-deleted', fetchAll),
        () => accChannel.unsubscribe('accommodation-created', fetchAll),
        () => accChannel.unsubscribe('accommodation-updated', fetchAll),
        () => accChannel.unsubscribe('accommodation-deleted', fetchAll),
      ];
      unsubscribesRef.current = unsubscribes;
    }
    setupAbly();
    return () => {
      isMounted = false;
      unsubscribesRef.current.forEach(fn => fn());
    };
  }, [tripId]);

  // Prepare map locations
  const mapLocations = [
    ...places.filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number' && p.latitude !== null && p.longitude !== null)
      .map(p => ({
        id: p.id,
        name: p.name,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        notes: p.notes,
        imageUrl: p.files?.[0]?.url,
        type: p.type || 'place',
      })),
    ...accommodations.filter(a => typeof a.latitude === 'number' && typeof a.longitude === 'number' && a.latitude !== null && a.longitude !== null)
      .map(a => ({
        id: a.id,
        name: a.name,
        latitude: Number(a.latitude),
        longitude: Number(a.longitude),
        notes: a.address,
        type: 'accommodation',
      })),
  ];

  return <TripMap locations={mapLocations} />;
} 