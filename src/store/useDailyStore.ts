import { create } from 'zustand';

export interface Place {
  id: string;
  name: string;
  type: string;
  address?: string;
  link?: string;
  notes?: string;
  date?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Accommodation {
  id: string;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  link?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface DailyState {
  todayPlaces: Place[];
  todayAccommodations: Accommodation[];
  loading: boolean;
  fetchToday: () => Promise<void>;
}

export const useDailyStore = create<DailyState>((set, get) => ({
  todayPlaces: [],
  todayAccommodations: [],
  loading: true,
  async fetchToday() {
    set({ loading: true });
    const tripsRes = await fetch("/api/trips");
    if (!tripsRes.ok) return set({ loading: false });
    const trips = await tripsRes.json();
    const allPlaces: Place[] = [];
    const allAccommodations: Accommodation[] = [];
    await Promise.all(
      trips.map(async (trip: { id: string }) => {
        // Places
        const placesRes = await fetch(`/api/trips/${trip.id}/places`);
        if (placesRes.ok) {
          const tripPlaces: Place[] = await placesRes.json();
          if (Array.isArray(tripPlaces)) {
            allPlaces.push(...tripPlaces);
          }
        }
        // Accommodations
        const accRes = await fetch(`/api/trips/${trip.id}/accommodations`);
        if (accRes.ok) {
          const tripAccs: Accommodation[] = await accRes.json();
          if (Array.isArray(tripAccs)) {
            allAccommodations.push(...tripAccs);
          }
        }
      })
    );
    const todayObj = new Date();
    const today = todayObj.getFullYear() + "-" +
      String(todayObj.getMonth() + 1).padStart(2, "0") + "-" +
      String(todayObj.getDate()).padStart(2, "0");
    set({
      todayPlaces: allPlaces.filter((p: Place) => p.date && p.date.slice(0, 10) === today),
      todayAccommodations: allAccommodations.filter((acc: Accommodation) => acc.checkIn.slice(0, 10) <= today && acc.checkOut.slice(0, 10) >= today),
      loading: false,
    });
  },
})); 