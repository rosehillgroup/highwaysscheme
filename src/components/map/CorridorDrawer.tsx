'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useSchemeStore } from '@/stores/schemeStore';
import type { Position } from 'geojson';

interface CorridorDrawerProps {
  map: maplibregl.Map | null;
  isActive: boolean;
  onComplete: () => void;
}

export default function CorridorDrawer({ map, isActive, onComplete }: CorridorDrawerProps) {
  const pointsRef = useRef<Position[]>([]);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [pointCount, setPointCount] = useState(0);
  const [corridorLength, setCorridorLength] = useState(0);
  const setCorridor = useSchemeStore((state) => state.setCorridor);

  // Clean up markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  }, []);

  // Update the drawing source
  const updateDrawingSource = useCallback(() => {
    if (!map) return;

    const source = map.getSource('corridor-drawing') as maplibregl.GeoJSONSource;
    if (!source) return;

    const features: GeoJSON.Feature[] = [];

    // Add points
    pointsRef.current.forEach((coord, index) => {
      features.push({
        type: 'Feature',
        properties: { type: 'point', index },
        geometry: { type: 'Point', coordinates: coord },
      });
    });

    // Add line if we have 2+ points
    if (pointsRef.current.length >= 2) {
      features.push({
        type: 'Feature',
        properties: { type: 'line' },
        geometry: { type: 'LineString', coordinates: pointsRef.current },
      });
    }

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [map]);

  // Add a point to the corridor
  const addPoint = useCallback((lngLat: maplibregl.LngLat) => {
    pointsRef.current.push([lngLat.lng, lngLat.lat]);
    setPointCount(pointsRef.current.length);

    // Update corridor length
    if (pointsRef.current.length >= 2) {
      const length = turf.length(turf.lineString(pointsRef.current), { units: 'meters' });
      setCorridorLength(Math.round(length));
    }

    // Add marker
    const markerEl = document.createElement('div');
    markerEl.className = 'corridor-point-marker';
    markerEl.style.cssText = `
      width: 12px;
      height: 12px;
      background: #2563eb;
      border: 2px solid white;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;

    const marker = new maplibregl.Marker({ element: markerEl })
      .setLngLat(lngLat)
      .addTo(map!);

    markersRef.current.push(marker);
    updateDrawingSource();
  }, [map, updateDrawingSource]);

  // Complete the corridor
  const completeCorridor = useCallback(() => {
    if (pointsRef.current.length < 2) {
      alert('Please add at least 2 points to define a corridor');
      return;
    }

    // Create the corridor
    const geometry: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: pointsRef.current,
    };

    setCorridor(geometry);

    // Clean up
    clearMarkers();
    pointsRef.current = [];
    setPointCount(0);
    setCorridorLength(0);
    updateDrawingSource();
    onComplete();
  }, [setCorridor, clearMarkers, updateDrawingSource, onComplete]);

  // Cancel drawing
  const cancelDrawing = useCallback(() => {
    clearMarkers();
    pointsRef.current = [];
    setPointCount(0);
    setCorridorLength(0);
    updateDrawingSource();
    onComplete();
  }, [clearMarkers, updateDrawingSource, onComplete]);

  // Set up drawing source and layers
  useEffect(() => {
    if (!map) return;

    // Add source if it doesn't exist
    if (!map.getSource('corridor-drawing')) {
      map.addSource('corridor-drawing', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Line layer
      map.addLayer({
        id: 'corridor-drawing-line',
        type: 'line',
        source: 'corridor-drawing',
        filter: ['==', ['get', 'type'], 'line'],
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#2563eb',
          'line-width': 3,
          'line-dasharray': [2, 2],
        },
      });

      // Points layer
      map.addLayer({
        id: 'corridor-drawing-points',
        type: 'circle',
        source: 'corridor-drawing',
        filter: ['==', ['get', 'type'], 'point'],
        paint: {
          'circle-radius': 6,
          'circle-color': '#2563eb',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });
    }
  }, [map]);

  // Handle click events when active
  useEffect(() => {
    if (!map || !isActive) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      addPoint(e.lngLat);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        completeCorridor();
      } else if (e.key === 'Escape') {
        cancelDrawing();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        // Remove last point
        if (pointsRef.current.length > 0) {
          pointsRef.current.pop();
          setPointCount(pointsRef.current.length);
          const lastMarker = markersRef.current.pop();
          lastMarker?.remove();
          updateDrawingSource();

          // Update corridor length
          if (pointsRef.current.length >= 2) {
            const length = turf.length(turf.lineString(pointsRef.current), { units: 'meters' });
            setCorridorLength(Math.round(length));
          } else {
            setCorridorLength(0);
          }
        }
      }
    };

    map.on('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      map.off('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [map, isActive, addPoint, completeCorridor, cancelDrawing, updateDrawingSource]);

  // Show/hide drawing UI
  if (!isActive) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 z-20">
      <div className="flex items-center gap-4">
        <div className="text-sm text-slate-600">
          <span className="font-medium">{pointCount}</span> points
          {pointCount >= 2 && (
            <span className="ml-2 text-slate-400">
              ({corridorLength} m)
            </span>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200" />

        <div className="flex gap-2">
          <button
            onClick={completeCorridor}
            disabled={pointCount < 2}
            className="px-3 py-1.5 text-xs font-medium bg-[#FF6B35] text-white rounded hover:bg-[#E55A2B] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete (Enter)
          </button>
          <button
            onClick={cancelDrawing}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
          >
            Cancel (Esc)
          </button>
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-400">
        Click to add points • Backspace to undo • Enter to complete
      </div>
    </div>
  );
}
