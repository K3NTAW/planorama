"use client";
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import Image from "next/image";
import { getAblyClient } from '@/lib/ablyClient';

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  bannerUrl: string | null;
}

export default function TripHeaderClient({ initialTrip, tripId }: { initialTrip: Trip, tripId: string }) {
  const [trip, setTrip] = useState<Trip>(initialTrip);

  // Real-time Ably subscription
  useEffect(() => {
    let channel: any = null;
    let ably: any = null;
    let isMounted = true;
    async function setup() {
      ably = await getAblyClient();
      if (!isMounted) return;
      channel = ably.channels.get('trips');
      const handler = (msg: any) => {
        if (msg.data.id === tripId) {
          setTrip(msg.data);
        }
      };
      channel.subscribe('trip-updated', handler);
    }
    setup();
    return () => {
      isMounted = false;
      if (channel) channel.unsubscribe('trip-updated');
    };
  }, [tripId]);

  // Optimistic update: update state if initialTrip changes
  useEffect(() => {
    setTrip(initialTrip);
  }, [initialTrip]);

  return (
    <>
      {trip.bannerUrl && (
        <Image
          src={trip.bannerUrl}
          alt={trip.name}
          width={800}
          height={224}
          className="w-full max-w-full h-56 object-cover rounded-md mb-6 border border-border"
          priority
        />
      )}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between w-full max-w-full gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">{trip.name}</h1>
          <div className="text-lg text-gray-600 mb-1">Destination: {trip.destination}</div>
          <div className="text-gray-500 text-sm mb-2">
            {trip.startDate ? format(new Date(trip.startDate), 'yyyy-MM-dd') : ''}
            {trip.endDate ? ` - ${format(new Date(trip.endDate), 'yyyy-MM-dd')}` : ''}
          </div>
        </div>
      </div>
    </>
  );
} 