"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { format } from "date-fns";
import { CreateTripButton } from "@/components/ui/CreateTripButton";
import Image from "next/image";

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  bannerUrl: string | null;
  userId: string;
}

export function TripList({ userId }: { userId: string }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTrips() {
    setLoading(true);
    const res = await fetch("/api/trips");
    const data = await res.json();
    setTrips(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchTrips();
  }, []);

  // Called after a trip is created
  async function handleTripCreated() {
    await fetchTrips();
  }

  // Called after a trip is deleted
  function handleTripDeleted(deletedTripId: string) {
    setTrips(prev => prev.filter(trip => trip.id !== deletedTripId));
  }

  return (
    <div className="max-w-3xl w-full mx-auto px-2 sm:px-4 md:px-6 py-6 overflow-x-hidden">
      <h1 className="text-3xl font-bold mb-6">Your Trips</h1>
      <div className="mb-6">
        <CreateTripButton onTripCreated={handleTripCreated} />
      </div>
      <div className="grid gap-4 w-full max-w-full">
        {loading ? (
          <div className="text-gray-500">Loading...</div>
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
                    <Link href={`/trips/${trip.id}`} className="mt-2 md:mt-0 text-blue-600 hover:underline">View Details</Link>
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