'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSchemeStore } from '@/stores/schemeStore';

// MapTiler API key - replace with your own or use environment variable
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || 'YOUR_MAPTILER_KEY';

interface MapViewProps {
  className?: string;
}

export default function MapView({ className = '' }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const corridor = useSchemeStore((state) => state.corridor);
  const isDrawingCorridor = useSchemeStore((state) => state.isDrawingCorridor);
  const setCorridor = useSchemeStore((state) => state.setCorridor);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
      center: [-1.5, 52.5], // Default to UK center
      zoom: 6,
    });

    // Add attribution control
    map.current.addControl(new maplibregl.AttributionControl(), 'bottom-right');

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add scale control
    map.current.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 200,
        unit: 'metric',
      }),
      'bottom-left'
    );

    // Add geolocate control
    map.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: false,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      setMapLoaded(true);

      // Add corridor source (empty initially)
      map.current!.addSource('corridor', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Corridor line layer
      map.current!.addLayer({
        id: 'corridor-line',
        type: 'line',
        source: 'corridor',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#2563eb',
          'line-width': 4,
          'line-opacity': 0.8,
        },
      });

      // Corridor carriageway polygon layer
      map.current!.addLayer({
        id: 'corridor-carriageway',
        type: 'fill',
        source: 'corridor',
        paint: {
          'fill-color': '#64748b',
          'fill-opacity': 0.3,
        },
        filter: ['==', ['get', 'type'], 'carriageway'],
      });

      // Corridor carriageway outline
      map.current!.addLayer({
        id: 'corridor-carriageway-outline',
        type: 'line',
        source: 'corridor',
        paint: {
          'line-color': '#475569',
          'line-width': 2,
        },
        filter: ['==', ['get', 'type'], 'carriageway'],
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update corridor on map when it changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('corridor') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (corridor) {
      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { type: 'centerline' },
            geometry: corridor.geometry,
          },
        ],
      });

      // Fit map to corridor bounds
      const bounds = new maplibregl.LngLatBounds();
      corridor.geometry.coordinates.forEach((coord) => {
        bounds.extend(coord as [number, number]);
      });
      map.current.fitBounds(bounds, { padding: 100 });
    } else {
      source.setData({
        type: 'FeatureCollection',
        features: [],
      });
    }
  }, [corridor, mapLoaded]);

  // Change cursor when drawing
  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = isDrawingCorridor ? 'crosshair' : '';
  }, [isDrawingCorridor]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Map loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="text-slate-500">Loading map...</div>
        </div>
      )}

      {/* Map overlay for instructions */}
      {mapLoaded && !corridor && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm text-slate-700">
            Search for a location or click on the map to start defining your scheme corridor
          </p>
        </div>
      )}
    </div>
  );
}
