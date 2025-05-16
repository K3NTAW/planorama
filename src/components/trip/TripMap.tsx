"use client";
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Hotel, Filter, Navigation, ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export interface TripMapLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  notes?: string;
  imageUrl?: string;
  type?: string; // e.g., 'place' or 'accommodation'
  date?: string;
}

interface TripMapProps {
  locations: TripMapLocation[];
}

export const TripMap: React.FC<TripMapProps> = ({ locations }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showRoutes, setShowRoutes] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<TripMapLocation | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  // Filter locations based on selected type
  const filteredLocations = selectedType 
    ? locations.filter(loc => {
        if (selectedType === 'place') {
          return loc.type !== 'accommodation';
        } else if (selectedType === 'accommodation') {
          return loc.type === 'accommodation';
        }
        return true;
      })
    : locations;

  useEffect(() => {
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
      style: isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v11',
      center,
      zoom: 12,
    });
    mapRef.current = map;

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add clustering
    map.on('load', () => {
      // Add a source for the locations
      map.addSource('locations', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: filteredLocations.map(loc => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [loc.longitude, loc.latitude]
            },
            properties: {
              id: loc.id,
              name: loc.name,
              type: loc.type,
              notes: loc.notes,
              imageUrl: loc.imageUrl
            }
          }))
        },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 30
      });

      // Add cluster layers
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'locations',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            5, '#f1f075',
            10, '#f28cb1'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            15,
            5, 20,
            10, 25
          ]
        }
      });

      // Add cluster count
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'locations',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        }
      });

      // Add unclustered point layer
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'locations',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'type'],
            'accommodation', '#2563eb',
            '#22c55e'
          ],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      });

      // Add click handler for clusters
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        if (features.length > 0) {
          const clusterId = features[0].properties?.cluster_id;
          if (typeof clusterId === 'number') {
            const source = map.getSource('locations') as mapboxgl.GeoJSONSource;
            source.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err || zoom === null) return;
              map.easeTo({
                center: (features[0].geometry as any).coordinates,
                zoom: zoom
              });
            });
          }
        }
      });

      // Add click handler for points
      map.on('click', 'unclustered-point', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['unclustered-point']
        });
        if (features.length > 0 && features[0].properties) {
          const properties = features[0].properties;
          const location = locations.find(loc => loc.id === properties.id);
          if (location) {
            // Create popup
            new mapboxgl.Popup()
              .setLngLat([location.longitude, location.latitude])
              .setHTML(`
                <div class="p-3 min-w-[200px]">
                  <div class="flex justify-between items-start mb-2">
                    <h3 class="font-semibold text-lg">${location.name}</h3>
                    <button class="popup-close text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  ${location.notes ? `<p class="text-sm text-gray-600 dark:text-gray-300 mb-3">${location.notes}</p>` : ''}
                  ${location.imageUrl ? `<img src="${location.imageUrl}" alt="${location.name}" class="w-full h-32 object-cover rounded mb-3" />` : ''}
                  <a href="https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     class="inline-flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
                    </svg>
                    Get Directions
                  </a>
                </div>
              `)
              .addTo(map);

            // Add click handler for the custom close button
            setTimeout(() => {
              const closeButton = document.querySelector('.popup-close');
              if (closeButton) {
                closeButton.addEventListener('click', () => {
                  const popup = document.querySelector('.mapboxgl-popup');
                  if (popup) {
                    popup.remove();
                  }
                });
              }
            }, 0);
          }
        }
      });

      // Add hover effects
      map.on('mouseenter', 'clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'clusters', () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', 'unclustered-point', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'unclustered-point', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    // Clean up on unmount
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [locations, selectedType]);

  // Update routes when showRoutes changes
  useEffect(() => {
    if (!mapRef.current || !showRoutes) return;

    const map = mapRef.current;
    const coordinates = filteredLocations.map(loc => [loc.longitude, loc.latitude] as [number, number]);

    // Remove existing route layer if it exists
    if (map.getLayer('route')) {
      map.removeLayer('route');
    }
    if (map.getSource('route')) {
      map.removeSource('route');
    }

    // Function to fetch route between two points
    const fetchRoute = async (start: [number, number], end: [number, number]) => {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();
      return data.routes[0];
    };

    // Function to calculate total route
    const calculateRoute = async () => {
      if (coordinates.length < 2) return;

      let totalDistance = 0;
      let totalDuration = 0;
      const routeCoordinates: number[][] = [];

      // Calculate route between consecutive points
      for (let i = 0; i < coordinates.length - 1; i++) {
        const route = await fetchRoute(coordinates[i], coordinates[i + 1]);
        if (route) {
          totalDistance += route.distance;
          totalDuration += route.duration;
          routeCoordinates.push(...route.geometry.coordinates);
        }
      }

      // Add route layer
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates
          }
        }
      });

      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#888',
          'line-width': 8,
          'line-opacity': 0.5
        }
      });

      // Update route info
      setRouteInfo({
        distance: `${(totalDistance / 1000).toFixed(1)} km`,
        duration: `${(totalDuration / 3600).toFixed(1)} hours`
      });
    };

    calculateRoute();

    return () => {
      if (map.getLayer('route')) {
        map.removeLayer('route');
      }
      if (map.getSource('route')) {
        map.removeSource('route');
      }
    };
  }, [showRoutes, filteredLocations]);

  return (
    <div className="relative">
      <div style={{ width: '100%', height: 400, borderRadius: 12, overflow: 'hidden', margin: '0 auto' }}>
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Controls */}
      <div className="absolute top-4 left-4 space-y-2">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card className="p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <Filter className="w-4 h-4 mr-1" />
                Map Options
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant={selectedType === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType(null)}
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    All
                  </Button>
                  <Button
                    variant={selectedType === 'place' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType('place')}
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    Places
                  </Button>
                  <Button
                    variant={selectedType === 'accommodation' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType('accommodation')}
                  >
                    <Hotel className="w-4 h-4 mr-1" />
                    Stays
                  </Button>
                </div>

                <Button
                  variant={showRoutes ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowRoutes(!showRoutes)}
                  className="w-full"
                >
                  <Navigation className="w-4 h-4 mr-1" />
                  {showRoutes ? 'Hide Route' : 'Show Route'}
                </Button>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Route Info */}
      {showRoutes && routeInfo && (
        <Card className="absolute bottom-4 left-4 p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <div className="text-sm">
            <div>Distance: {routeInfo.distance}</div>
            <div>Est. Duration: {routeInfo.duration}</div>
          </div>
        </Card>
      )}

      <style>{`
        .mapboxgl-popup-content { 
          font-family: inherit;
          padding: 0;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }
        .mapboxgl-popup-close-button {
          display: none;
        }
        .dark .mapboxgl-popup-content {
          background: #18181b !important;
          color: #fff !important;
        }
        .popup-close {
          padding: 4px;
          border-radius: 0.25rem;
          transition: all 0.2s;
        }
        .popup-close:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        .dark .popup-close:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}; 