"use client";
import { useEffect, useState, useRef } from "react";
import { useDailyStore } from '@/store/useDailyStore';
import { TripMap } from '@/components/trip/TripMap';
import { getAblyClient } from '@/lib/ablyClient';

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#18181B' },
  ],
};

export default function DailyPage() {
  const { todayPlaces, todayAccommodations, loading, fetchToday } = useDailyStore();
  const ablyRef = useRef<any>(null);
  const unsubscribesRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (todayPlaces.length === 0 && todayAccommodations.length === 0) {
      fetchToday();
    }
  }, [fetchToday, todayPlaces.length, todayAccommodations.length]);

  // Real-time Ably subscription for daily view
  useEffect(() => {
    let isMounted = true;
    let ably: any = null;
    let channels: any[] = [];
    let unsubscribes: (() => void)[] = [];
    async function setupAbly() {
      ably = await getAblyClient();
      ablyRef.current = ably;
      // Get all unique trip IDs from today's places and accommodations
      const tripIds = Array.from(new Set([
        ...todayPlaces.map(p => p.tripId).filter(Boolean),
        ...todayAccommodations.map(a => a.tripId).filter(Boolean),
      ]));
      channels = [
        ...tripIds.map(id => ably.channels.get(`places:${id}`)),
        ...tripIds.map(id => ably.channels.get(`accommodations:${id}`)),
      ];
      const handleEvent = () => { if (isMounted) fetchToday(); };
      channels.forEach(channel => {
        channel.subscribe('place-created', handleEvent);
        channel.subscribe('place-updated', handleEvent);
        channel.subscribe('place-deleted', handleEvent);
        channel.subscribe('accommodation-created', handleEvent);
        channel.subscribe('accommodation-updated', handleEvent);
        channel.subscribe('accommodation-deleted', handleEvent);
        unsubscribes.push(
          () => channel.unsubscribe('place-created', handleEvent),
          () => channel.unsubscribe('place-updated', handleEvent),
          () => channel.unsubscribe('place-deleted', handleEvent),
          () => channel.unsubscribe('accommodation-created', handleEvent),
          () => channel.unsubscribe('accommodation-updated', handleEvent),
          () => channel.unsubscribe('accommodation-deleted', handleEvent),
        );
      });
      unsubscribesRef.current = unsubscribes;
    }
    setupAbly();
    return () => {
      isMounted = false;
      unsubscribesRef.current.forEach(fn => fn());
    };
  }, [todayPlaces, todayAccommodations, fetchToday]);

  // Prepare map locations
  const mapLocations = [
    ...todayPlaces.filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number' && p.latitude !== null && p.longitude !== null)
      .map(p => ({
        id: p.id,
        name: p.name,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        notes: p.notes,
        type: p.type || 'place',
      })),
    ...todayAccommodations.filter(a => typeof a.latitude === 'number' && typeof a.longitude === 'number' && a.latitude !== null && a.longitude !== null)
      .map(a => ({
        id: a.id,
        name: a.name,
        latitude: Number(a.latitude),
        longitude: Number(a.longitude),
        notes: a.address,
        type: 'accommodation',
      })),
  ];

  return (
    <div className="flex flex-col items-center min-h-[80vh] w-full max-w-full px-2 sm:px-4 md:px-6 py-6 bg-background overflow-x-hidden">
      <h1 className="text-3xl font-bold mb-4">Daily</h1>
      {loading ? (
        <DailySkeleton />
      ) : (
        <div className="w-full max-w-xl space-y-8">
          {/* Accommodations Section */}
          <div>
            <h2 className="text-2xl font-semibold mb-2">Accommodations</h2>
            {todayAccommodations.length === 0 ? (
              <div className="text-muted-foreground text-lg">No accommodations for today.</div>
            ) : (
              <div className="space-y-4">
                {todayAccommodations.map(acc => (
                  <div key={acc.id} className="border rounded p-4 bg-white dark:bg-card flex flex-col gap-2">
                    <div className="font-semibold text-lg">{acc.name}</div>
                    <div className="text-gray-600">{acc.address}</div>
                    <div className="text-gray-500 text-sm">
                      Check-in: {new Date(acc.checkIn).toLocaleString()}<br />
                      Check-out: {new Date(acc.checkOut).toLocaleString()}
                    </div>
                    {acc.link && <a href={acc.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Booking Link</a>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Places Section */}
          <div>
            <h2 className="text-2xl font-semibold mb-2">Places</h2>
            {todayPlaces.length === 0 ? (
              <div className="text-muted-foreground text-lg">No places scheduled for today.</div>
            ) : (
              <div className="space-y-4">
                {todayPlaces.map(place => (
                  <div key={place.id} className="border rounded p-4 bg-white dark:bg-card flex flex-col gap-2">
                    <div className="font-semibold text-lg">{place.name} <span className="text-sm text-gray-400">({place.type})</span></div>
                    {place.address && <div className="text-gray-600">{place.address}</div>}
                    {place.link && <a href={place.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Link</a>}
                    {place.notes && <div className="text-gray-500 text-sm mt-1">{place.notes}</div>}
                    {place.date && <div className="text-gray-500 text-sm">Date: {place.date}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Map Section at the bottom */}
          {mapLocations.length > 0 && (
            <div className="mt-8">
              <TripMap locations={mapLocations} />
            </div>
          )}
        </div>
      )}
      {/* Extra bottom padding for nav bar */}
      <div className="h-24" />
    </div>
  );
}

function DailySkeleton() {
  return (
    <div className="w-full max-w-xl space-y-8">
      <div>
        <div className="h-8 w-40 bg-muted rounded mb-2 animate-pulse" />
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
      <div>
        <div className="h-8 w-40 bg-muted rounded mb-2 animate-pulse" />
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
} 