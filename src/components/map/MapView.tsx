'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSchemeStore } from '@/stores/schemeStore';
import { generateCarriagewayPolygon, generateCycleLanePolygon } from '@/lib/corridor/chainage';
import CorridorDrawer from './CorridorDrawer';

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || '';

// Free OpenStreetMap raster tiles (no API key required)
const FREE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// Use MapTiler if key is available, otherwise use free OSM tiles
const getMapStyle = () => {
  if (MAPTILER_KEY) {
    console.log('Using MapTiler with key:', MAPTILER_KEY.substring(0, 4) + '...');
    // Use OpenStreetMap style - more compatible with MapLibre
    return `https://api.maptiler.com/maps/openstreetmap/style.json?key=${MAPTILER_KEY}`;
  }
  console.log('No MapTiler key, using free OSM tiles');
  return FREE_STYLE;
};

export interface MapViewHandle {
  flyTo: (center: [number, number], zoom?: number) => void;
  fitBounds: (bounds: [[number, number], [number, number]], padding?: number) => void;
}

interface MapViewProps {
  className?: string;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(({ className = '' }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const corridor = useSchemeStore((state) => state.corridor);
  const isDrawingCorridor = useSchemeStore((state) => state.isDrawingCorridor);
  const setIsDrawingCorridor = useSchemeStore((state) => state.setIsDrawingCorridor);

  // Expose map controls via ref
  useImperativeHandle(ref, () => ({
    flyTo: (center: [number, number], zoom: number = 14) => {
      map.current?.flyTo({ center, zoom, duration: 1500 });
    },
    fitBounds: (bounds: [[number, number], [number, number]], padding: number = 100) => {
      map.current?.fitBounds(bounds, { padding, duration: 1500 });
    },
  }), []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getMapStyle(),
      center: [-1.5, 52.5],
      zoom: 6,
    });

    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(
      new maplibregl.ScaleControl({ maxWidth: 200, unit: 'metric' }),
      'bottom-left'
    );
    map.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      'top-right'
    );

    // Handle missing images gracefully
    map.current.on('styleimagemissing', (e) => {
      const id = e.id;
      // Create a transparent 1x1 pixel placeholder
      if (!map.current!.hasImage(id)) {
        map.current!.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
      }
    });

    map.current.on('load', () => {
      setMapLoaded(true);

      // Add corridor source
      map.current!.addSource('corridor', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Carriageway fill
      map.current!.addLayer({
        id: 'corridor-carriageway-fill',
        type: 'fill',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'carriageway'],
        paint: {
          'fill-color': '#475569',
          'fill-opacity': 0.4,
        },
      });

      // Carriageway outline
      map.current!.addLayer({
        id: 'corridor-carriageway-outline',
        type: 'line',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'carriageway'],
        paint: {
          'line-color': '#334155',
          'line-width': 2,
        },
      });

      // Cycle lane fill
      map.current!.addLayer({
        id: 'corridor-cyclelane-fill',
        type: 'fill',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'cyclelane'],
        paint: {
          'fill-color': '#16a34a',
          'fill-opacity': 0.3,
        },
      });

      // Cycle lane outline
      map.current!.addLayer({
        id: 'corridor-cyclelane-outline',
        type: 'line',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'cyclelane'],
        paint: {
          'line-color': '#15803d',
          'line-width': 1.5,
        },
      });

      // Centreline
      map.current!.addLayer({
        id: 'corridor-centreline',
        type: 'line',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'centreline'],
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#2563eb',
          'line-width': 3,
        },
      });

      // Start/End markers
      map.current!.addLayer({
        id: 'corridor-endpoints',
        type: 'circle',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'endpoint'],
        paint: {
          'circle-radius': 8,
          'circle-color': ['case', ['==', ['get', 'endpoint'], 'start'], '#22c55e', '#ef4444'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update corridor visualization
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('corridor') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (corridor) {
      const features: GeoJSON.Feature[] = [];

      // Centreline
      features.push({
        type: 'Feature',
        properties: { type: 'centreline' },
        geometry: corridor.geometry,
      });

      // Start/End points
      const coords = corridor.geometry.coordinates;
      features.push({
        type: 'Feature',
        properties: { type: 'endpoint', endpoint: 'start' },
        geometry: { type: 'Point', coordinates: coords[0] },
      });
      features.push({
        type: 'Feature',
        properties: { type: 'endpoint', endpoint: 'end' },
        geometry: { type: 'Point', coordinates: coords[coords.length - 1] },
      });

      // Carriageway polygon (if width confirmed)
      if (corridor.carriageway.confirmed) {
        const carriageCoords = generateCarriagewayPolygon(
          corridor.geometry,
          corridor.carriageway.width
        );
        if (carriageCoords.length > 0) {
          features.push({
            type: 'Feature',
            properties: { type: 'carriageway' },
            geometry: { type: 'Polygon', coordinates: [carriageCoords] },
          });
        }
      }

      // Cycle lane polygon
      if (corridor.cycleLane?.enabled && corridor.carriageway.confirmed) {
        const cycleCoords = generateCycleLanePolygon(
          corridor.geometry,
          corridor.carriageway.width,
          corridor.cycleLane.width,
          corridor.cycleLane.side,
          corridor.cycleLane.bufferWidth
        );
        if (cycleCoords.length > 0) {
          features.push({
            type: 'Feature',
            properties: { type: 'cyclelane' },
            geometry: { type: 'Polygon', coordinates: [cycleCoords] },
          });
        }
      }

      source.setData({ type: 'FeatureCollection', features });

      // Fit to corridor bounds
      const bounds = new maplibregl.LngLatBounds();
      corridor.geometry.coordinates.forEach((coord) => {
        bounds.extend(coord as [number, number]);
      });
      map.current.fitBounds(bounds, { padding: 100, duration: 1000 });
    } else {
      source.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [corridor, mapLoaded]);

  // Update cursor when drawing
  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = isDrawingCorridor ? 'crosshair' : '';
  }, [isDrawingCorridor]);

  const handleDrawComplete = useCallback(() => {
    setIsDrawingCorridor(false);
  }, [setIsDrawingCorridor]);

  return (
    <div className={`relative w-full h-full min-h-0 ${className}`} style={{ height: '100%' }}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="flex items-center gap-2 text-slate-500">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading map...
          </div>
        </div>
      )}

      {/* Instructions when no corridor */}
      {mapLoaded && !corridor && !isDrawingCorridor && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm text-slate-700">
            Search for a location, then click the draw tool to define your scheme corridor
          </p>
        </div>
      )}

      {/* Corridor Drawer */}
      <CorridorDrawer
        map={map.current}
        isActive={isDrawingCorridor}
        onComplete={handleDrawComplete}
      />
    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView;
