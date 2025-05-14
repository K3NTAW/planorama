"use client";
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export interface TripMapLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  notes?: string;
  imageUrl?: string;
  type?: string; // e.g., 'place' or 'accommodation'
}

interface TripMapProps {
  locations: TripMapLocation[];
}

export const TripMap: React.FC<TripMapProps> = ({ locations }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    console.log('TripMap locations:', locations);
    console.log('Map container:', mapContainer.current);
    if (!mapContainer.current) return;
    if (mapRef.current) return; // Prevent re-initialization
    if (!locations.length) return;

    // Detect dark mode
    const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

    // Center on the first location or a default
    const center: [number, number] = locations.length
      ? [locations[0].longitude, locations[0].latitude]
      : [2.3522, 48.8566]; // Paris fallback

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center,
      zoom: 12,
    });
    mapRef.current = map;

    locations.forEach(loc => {
      if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return;
      const el = document.createElement('div');
      el.className = 'trip-map-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.background = loc.type === 'accommodation' ? '#2563eb' : '#22c55e';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'white';
      el.innerHTML = loc.type === 'accommodation' ? '🏨' : '📍';

      const popupHtml = `
        <div class="popup-content${isDark ? ' dark' : ''}" style="min-width:180px;max-width:240px;">
          <div style="font-weight:bold;font-size:1.1em;">${loc.name}</div>
          ${loc.notes ? `<div style='margin:6px 0;'>${loc.notes}</div>` : ''}
          ${loc.imageUrl ? `<img src='${loc.imageUrl}' alt='${loc.name}' style='width:100%;border-radius:8px;margin-bottom:6px;' />` : ''}
          <a href="https://maps.google.com/?q=${loc.latitude},${loc.longitude}" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:underline;">Get Directions</a>
        </div>
      `;
      new mapboxgl.Marker(el)
        .setLngLat([loc.longitude, loc.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML(popupHtml))
        .addTo(map);
    });

    // Clean up on unmount
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [locations]);

  return (
    <div style={{ width: '100%', height: 400, borderRadius: 12, overflow: 'hidden', margin: '0 auto' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <style>{`
        .trip-map-marker { cursor: pointer; }
        .mapboxgl-popup-content { font-family: inherit; }
        .popup-content.dark, .dark .mapboxgl-popup-content {
          background: #18181b !important;
          color: #fff !important;
        }
        .popup-content.dark a, .dark .mapboxgl-popup-content a {
          color: #60a5fa !important;
        }
      `}</style>
    </div>
  );
}; 