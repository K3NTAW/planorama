"use client";
import { useEffect, useState, useRef } from "react";
import { useDailyStore, Place, Accommodation } from '@/store/useDailyStore';
import { TripMap } from '@/components/trip/TripMap';
import { getAblyClient } from '@/lib/ablyClient';
import { placeTypeDetails, defaultPlaceDetail } from '@/components/ui/TripPlaces';
import { accommodationTypeDetails, defaultAccommodationDetail } from '@/components/ui/TripAccommodations';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Bed, MapPin, ExternalLink } from 'lucide-react';

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
      <h1 className="text-3xl font-bold mb-6">Daily Timeline</h1>
      {loading ? (
        <DailySkeleton />
      ) : (
        <div className="w-full max-w-2xl space-y-8">
          {todayAccommodations.length === 0 && todayPlaces.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Bed className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium">Nothing scheduled for today.</h3>
              <p className="mt-1 text-sm text-gray-500">Add items with today's date to see them here.</p>
            </div>
          ) : (
            <>
              {/* Accommodations Section */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">Accommodations</h2>
                {todayAccommodations.length > 0 ? (
                  <div className="space-y-5">
                    {todayAccommodations.map(acc => <DailyAccommodationCard key={acc.id} accommodation={acc} />)}
                  </div>
                ) : (
                  <div className="text-muted-foreground pl-5 pt-2">No accommodations for today.</div>
                )}
              </section>

              {/* Places Section */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">Places</h2>
                {todayPlaces.length > 0 ? (
                  <div className="space-y-5">
                    {todayPlaces.map(place => <DailyPlaceCard key={place.id} place={place} />)}
                  </div>
                ) : (
                  <div className="text-muted-foreground pl-5 pt-2">No places scheduled for today.</div>
                )}
              </section>
            </>
          )}

          {/* Map Section at the bottom */}
          {mapLocations.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-semibold mb-4 text-center">Today's Map</h2>
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

// Reusable card for places in the daily view
function DailyPlaceCard({ place }: { place: Place }) {
  const typeDetail = (place.type && placeTypeDetails[place.type.toLowerCase()]) || defaultPlaceDetail;
  const IconComponent = typeDetail.icon;

  let timeDisplay = "";
  if (place.date) {
    try {
      const dateObj = new Date(place.date);
      if (!isNaN(dateObj.getTime())) {
        timeDisplay = format(dateObj, (dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0) ? 'p' : 'MMM d');
      }
    } catch (e) { /* ignore */ }
  }

  return (
    <div key={place.id} className="flex items-start gap-x-4 relative">
      {/* Timeline Gutter */}
      <div className="relative last:after:hidden after:absolute after:top-10 after:bottom-0 after:start-[1.125rem] after:w-px after:-translate-x-1/2 after:bg-gray-300 dark:after:bg-slate-700">
        <div className="relative z-10 w-9 h-9 flex items-center justify-center">
          <div className={cn("w-full h-full rounded-full flex items-center justify-center text-white", typeDetail.color)}>
            <IconComponent className="w-5 h-5" />
          </div>
        </div>
      </div>
      {/* Card Content */}
      <div className="grow bg-card shadow-lg rounded-lg p-4 relative min-w-0 flex-1 min-h-[120px]">
        <div className="flex flex-col">
          {timeDisplay && <p className="text-sm font-medium text-blue-600 dark:text-blue-500 mb-0.5">{timeDisplay}</p>}
          <h3 className="text-lg font-semibold text-foreground mb-1.5 leading-tight">{place.name}</h3>
          {place.notes && <p className="text-sm text-muted-foreground mb-2.5 leading-relaxed">{place.notes}</p>}
          {place.address && <div className="flex items-center text-xs text-muted-foreground mt-1"><MapPin className="w-3.5 h-3.5 mr-1.5" /><span>{place.address}</span></div>}
          {place.link && <a href={place.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1">Visit website <ExternalLink className="w-3 h-3"/></a>}
        </div>
      </div>
    </div>
  );
}

// Reusable card for accommodations in the daily view
function DailyAccommodationCard({ accommodation }: { accommodation: Accommodation }) {
  const accTypeDetail = (accommodation.type && accommodationTypeDetails[accommodation.type.toLowerCase()]) || defaultAccommodationDetail;
  const IconComponent = accTypeDetail.icon;

  let checkInDisplay = "", checkOutDisplay = "";
  if (accommodation.checkIn) checkInDisplay = format(new Date(accommodation.checkIn), 'MMM d, p');
  if (accommodation.checkOut) checkOutDisplay = format(new Date(accommodation.checkOut), 'MMM d, p');

  return (
    <div key={accommodation.id} className="flex items-start gap-x-4 relative">
      <div className="relative last:after:hidden after:absolute after:top-10 after:bottom-0 after:start-[1.125rem] after:w-px after:-translate-x-1/2 after:bg-gray-300 dark:after:bg-slate-700">
        <div className="relative z-10 w-9 h-9 flex items-center justify-center">
          <div className={cn("w-full h-full rounded-full flex items-center justify-center text-white", accTypeDetail.color)}>
            <IconComponent className="w-5 h-5" />
          </div>
        </div>
      </div>
      <div className="grow bg-card shadow-lg rounded-lg p-4 relative min-w-0 flex-1 min-h-[150px]">
        <div className="flex flex-col">
          <div className="text-sm font-medium text-blue-600 dark:text-blue-500 mb-1">
            {checkInDisplay && <p>Check-in: {checkInDisplay}</p>}
            {checkOutDisplay && <p>Check-out: {checkOutDisplay}</p>}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1.5 leading-tight">{accommodation.name}</h3>
          {accommodation.type && <p className="text-xs text-muted-foreground mb-1.5">Type: {accommodationTypeDetails[accommodation.type.toLowerCase()]?.label || accommodation.type}</p>}
          {accommodation.address && <div className="flex items-center text-sm text-muted-foreground mb-2"><MapPin className="w-4 h-4 mr-1.5" /><span>{accommodation.address}</span></div>}
          {accommodation.notes && <p className="text-sm text-muted-foreground mb-2.5 leading-relaxed">{accommodation.notes}</p>}
          {accommodation.link && <a href={accommodation.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">Booking Link <ExternalLink className="w-3 h-3"/></a>}
        </div>
      </div>
    </div>
  );
}

function DailySkeleton() {
  return (
    <div className="w-full max-w-2xl space-y-8">
      {/* Accommodations Skeleton */}
      <section>
        <div className="h-8 w-48 bg-muted rounded mb-4 animate-pulse" />
        <div className="flex items-start gap-x-4 relative">
          <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0"></div>
          <div className="grow bg-muted/50 rounded-lg p-4 animate-pulse min-h-[120px] w-full"></div>
        </div>
      </section>
      {/* Places Skeleton */}
      <section>
        <div className="h-8 w-32 bg-muted rounded mb-4 animate-pulse" />
        <div className="space-y-5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-start gap-x-4 relative">
              <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0"></div>
              <div className="grow bg-muted/50 rounded-lg p-4 animate-pulse min-h-[120px] w-full"></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
} 