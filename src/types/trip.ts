export interface Place {
  id: string;
  name: string;
  type: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
  files?: { url: string }[];
  address?: string;
  link?: string;
  websiteLink?: string;
  googleMapsLink?: string;
  date?: string;
}

export interface Accommodation {
  id: string;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  latitude?: number | null;
  longitude?: number | null;
  link?: string;
  websiteLink?: string;
  googleMapsLink?: string;
} 