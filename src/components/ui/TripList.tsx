"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { format } from "date-fns";
import { CreateTripButton } from "@/components/ui/CreateTripButton";
import Image from "next/image";
import { create } from 'zustand';
import { Button } from "@/components/ui/button";
import Ably from 'ably';

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  bannerUrl: string | null;
  userId: string;
}

interface TripsState {
  trips: Trip[];
  loading: boolean;
  fetchTrips: () => Promise<void>;
  addTrip: (trip: Trip) => void;
  removeTrip: (tripId: string) => void;
}

export const useTripsStore = create<TripsState>((set, get) => ({
  trips: [],
  loading: true,
  async fetchTrips() {
    set({ loading: true });
    const res = await fetch("/api/trips");
    const data = await res.json();
    set({ trips: data || [], loading: false });
  },
  addTrip(trip) {
    set(state => ({ trips: [...state.trips, trip] }));
  },
  removeTrip(tripId) {
    set(state => ({ trips: state.trips.filter(trip => trip.id !== tripId) }));
  },
}));

export function TripList({ userId }: { userId: string }) {
  const { trips, loading, fetchTrips, addTrip, removeTrip } = useTripsStore();
  useEffect(() => {
    if (trips.length === 0) {
      fetchTrips();
    }
  }, [fetchTrips, trips.length]);

  // Ably real-time subscription for trip-created
  useEffect(() => {
    let ably: any = null;
    let channel: any = null;
    let unsubscribes: (() => void)[] = [];
    let isMounted = true;
    async function setupAbly() {
      const res = await fetch('/api/ably-token');
      if (!res.ok) return;
      const tokenRequest = await res.json();
      ably = new Ably.Realtime({ token: tokenRequest });
      channel = ably.channels.get('trips');
      const handleTripCreated = (msg: any) => { addTrip(msg.data); };
      const handleTripDeleted = (msg: any) => { removeTrip(msg.data.id); };
      const handleTripUpdated = (msg: any) => {
        const updatedTrip = msg.data;
        removeTrip(updatedTrip.id);
        addTrip(updatedTrip);
      };
      channel.subscribe('trip-created', handleTripCreated);
      channel.subscribe('trip-deleted', handleTripDeleted);
      channel.subscribe('trip-updated', handleTripUpdated);
      unsubscribes = [
        () => channel.unsubscribe('trip-created', handleTripCreated),
        () => channel.unsubscribe('trip-deleted', handleTripDeleted),
        () => channel.unsubscribe('trip-updated', handleTripUpdated),
      ];
    }
    setupAbly();
    return () => {
      isMounted = false;
      unsubscribes.forEach(fn => fn());
      if (ably) ably.close();
    };
  }, [addTrip, removeTrip]);

  // Called after a trip is created
  async function handleTripCreated() {
    await fetchTrips();
  }

  // Called after a trip is deleted
  function handleTripDeleted(deletedTripId: string) {
    removeTrip(deletedTripId);
  }

  return (
    <div className="max-w-3xl w-full mx-auto px-2 sm:px-4 md:px-6 py-6 overflow-x-hidden">
      <h1 className="text-3xl font-bold mb-6">Your Trips</h1>
      <div className="mb-6">
        <CreateTripButton onTripCreated={handleTripCreated} />
      </div>
      <div className="grid gap-4 w-full max-w-full">
        {loading ? (
          <TripsSkeleton />
        ) : trips.length === 0 ? (
          <div className="text-gray-500">No trips found. Start by creating a new trip!</div>
        ) : (
          trips.map((trip: Trip) => {
            const isOwner = trip.userId === userId;
            return (
              <Card key={trip.id} className="relative w-full max-w-full">
                <CardHeader>
                  {trip.bannerUrl && (
                    <Image
                      src={trip.bannerUrl}
                      alt={trip.name}
                      width={600}
                      height={160}
                      className="w-full max-w-full h-40 object-cover rounded-t-md mb-2 border border-border"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <CardTitle>{trip.name}</CardTitle>
                    {!isOwner && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800 border border-yellow-300">Collaborator</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full max-w-full">
                    <div>
                      <div className="text-gray-600">Destination: {trip.destination}</div>
                      <div className="text-gray-500 text-sm">
                        {trip.startDate ? format(new Date(trip.startDate), 'yyyy-MM-dd') : ''}
                        {trip.endDate ? ` - ${format(new Date(trip.endDate), 'yyyy-MM-dd')}` : ''}
                      </div>
                    </div>
                    <Button asChild className="mt-2 md:mt-0">
                      <Link href={`/trips/${trip.id}`}>View Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function TripsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse bg-muted rounded p-6 h-32" />
      ))}
    </div>
  );
} 