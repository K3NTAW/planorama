"use client";
import { useEffect, useState } from "react";

interface Place {
  id: string;
  name: string;
  type: string;
  address?: string;
  link?: string;
  notes?: string;
  date?: string;
}

interface Accommodation {
  id: string;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  link?: string;
}

export default function DailyPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTodayData() {
      setLoading(true);
      // Fetch all trips
      const tripsRes = await fetch("/api/trips");
      if (!tripsRes.ok) return setLoading(false);
      const trips = await tripsRes.json();
      // Fetch all places and accommodations for each trip
      const allPlaces: Place[] = [];
      const allAccommodations: Accommodation[] = [];
      await Promise.all(
        trips.map(async (trip: { id: string }) => {
          // Places
          const placesRes = await fetch(`/api/trips/${trip.id}/places`);
          if (placesRes.ok) {
            const tripPlaces = await placesRes.json();
            if (Array.isArray(tripPlaces)) {
              allPlaces.push(...tripPlaces);
            }
          }
          // Accommodations
          const accRes = await fetch(`/api/trips/${trip.id}/accommodations`);
          if (accRes.ok) {
            const tripAccs = await accRes.json();
            if (Array.isArray(tripAccs)) {
              allAccommodations.push(...tripAccs);
            }
          }
        })
      );
      // Use local date for today
      const todayObj = new Date();
      const today = todayObj.getFullYear() + "-" +
        String(todayObj.getMonth() + 1).padStart(2, "0") + "-" +
        String(todayObj.getDate()).padStart(2, "0");
      // Debug log
      console.log("All accommodations:", allAccommodations, "Today:", today);
      setPlaces(allPlaces.filter(p => p.date === today));
      setAccommodations(
        allAccommodations.filter(acc => {
          // Show if today is between checkIn and checkOut (inclusive)
          return acc.checkIn.slice(0, 10) <= today && acc.checkOut.slice(0, 10) >= today;
        })
      );
      setLoading(false);
    }
    fetchTodayData();
  }, []);

  return (
    <div className="flex flex-col items-center min-h-[80vh] w-full max-w-full px-2 sm:px-4 md:px-6 py-6 bg-background overflow-x-hidden">
      <h1 className="text-3xl font-bold mb-4">Daily</h1>
      {loading ? (
        <div className="text-muted-foreground text-lg">Loading...</div>
      ) : (
        <div className="w-full max-w-xl space-y-8">
          {/* Accommodations Section */}
          <div>
            <h2 className="text-2xl font-semibold mb-2">Accommodations</h2>
            {accommodations.length === 0 ? (
              <div className="text-muted-foreground text-lg">No accommodations for today.</div>
            ) : (
              <div className="space-y-4">
                {accommodations.map(acc => (
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
            {places.length === 0 ? (
              <div className="text-muted-foreground text-lg">No places scheduled for today.</div>
            ) : (
              <div className="space-y-4">
                {places.map(place => (
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
        </div>
      )}
    </div>
  );
} 