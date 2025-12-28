'use client';

import { useState, useCallback, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useSchemeStore } from '@/stores/schemeStore';
import { getDefaultRunConfig, resolveRun, runToQuantities } from '@/lib/products/runResolver';
import { snapToCorridorCentreline } from '@/lib/corridor/chainage';
import productsData from '@/data/products.json';
import type { Product } from '@/types';

const productsMap = new Map(
  (productsData.products as Product[]).map((p) => [p.id, p])
);

interface RunPlacementProps {
  map: maplibregl.Map;
  productId: string;
  onComplete: () => void;
  onCancel: () => void;
}

type PlacementState = 'start' | 'end' | 'complete';

export default function RunPlacement({
  map,
  productId,
  onComplete,
  onCancel,
}: RunPlacementProps) {
  const [state, setState] = useState<PlacementState>('start');
  const [startPoint, setStartPoint] = useState<{ lngLat: [number, number]; chainage: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ lngLat: [number, number]; chainage: number } | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ lngLat: [number, number]; chainage: number } | null>(null);

  const corridor = useSchemeStore((state) => state.corridor);
  const addElement = useSchemeStore((state) => state.addElement);
  const updateElement = useSchemeStore((state) => state.updateElement);

  const product = productsMap.get(productId);

  // Handle map click
  const handleClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (!corridor) return;

      const snapped = snapToCorridorCentreline(corridor.geometry, [e.lngLat.lng, e.lngLat.lat]);

      if (state === 'start') {
        setStartPoint(snapped);
        setState('end');
      } else if (state === 'end' && startPoint) {
        setEndPoint(snapped);

        // Create the run element
        const runStartS = Math.min(startPoint.chainage, snapped.chainage);
        const runEndS = Math.max(startPoint.chainage, snapped.chainage);

        if (product) {
          const runConfig = getDefaultRunConfig(product, runStartS, runEndS, 0);
          const resolved = resolveRun(runConfig, product);

          const elementId = addElement(
            productId,
            { s: runStartS, t: 0, rotation: 0 },
            'run'
          );

          // Update with run config and resolved quantities
          updateElement(elementId, {
            runConfig,
            resolved: runToQuantities(resolved),
          });
        }

        setState('complete');
        onComplete();
      }
    },
    [corridor, state, startPoint, product, productId, addElement, updateElement, onComplete]
  );

  // Handle mouse move for preview
  const handleMouseMove = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (!corridor || state === 'complete') return;

      const snapped = snapToCorridorCentreline(corridor.geometry, [e.lngLat.lng, e.lngLat.lat]);
      setHoverPoint(snapped);
    },
    [corridor, state]
  );

  // Set up event listeners
  useEffect(() => {
    map.on('click', handleClick);
    map.on('mousemove', handleMouseMove);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleClick);
      map.off('mousemove', handleMouseMove);
      map.getCanvas().style.cursor = '';
    };
  }, [map, handleClick, handleMouseMove]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // Update preview layer
  useEffect(() => {
    if (!map.getSource('run-preview')) {
      map.addSource('run-preview', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'run-preview-line',
        type: 'line',
        source: 'run-preview',
        paint: {
          'line-color': '#8b5cf6',
          'line-width': 6,
          'line-opacity': 0.6,
        },
      });

      map.addLayer({
        id: 'run-preview-points',
        type: 'circle',
        source: 'run-preview',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 8,
          'circle-color': '#8b5cf6',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });
    }

    const source = map.getSource('run-preview') as maplibregl.GeoJSONSource;
    const features: GeoJSON.Feature[] = [];

    // Start point
    if (startPoint) {
      features.push({
        type: 'Feature',
        properties: { type: 'start' },
        geometry: { type: 'Point', coordinates: startPoint.lngLat },
      });
    }

    // Preview line from start to hover/end
    if (startPoint && (hoverPoint || endPoint) && corridor) {
      const targetPoint = endPoint || hoverPoint;
      if (targetPoint) {
        const startS = Math.min(startPoint.chainage, targetPoint.chainage);
        const endS = Math.max(startPoint.chainage, targetPoint.chainage);

        // Get section of corridor between start and end
        const line = turf.lineString(corridor.geometry.coordinates);
        const sliced = turf.lineSliceAlong(line, startS / 1000, endS / 1000, { units: 'kilometers' });

        features.push({
          type: 'Feature',
          properties: { type: 'preview' },
          geometry: sliced.geometry,
        });

        features.push({
          type: 'Feature',
          properties: { type: 'end' },
          geometry: { type: 'Point', coordinates: targetPoint.lngLat },
        });
      }
    }

    source.setData({ type: 'FeatureCollection', features });

    return () => {
      if (map.getLayer('run-preview-line')) map.removeLayer('run-preview-line');
      if (map.getLayer('run-preview-points')) map.removeLayer('run-preview-points');
      if (map.getSource('run-preview')) map.removeSource('run-preview');
    };
  }, [map, corridor, startPoint, endPoint, hoverPoint]);

  // Calculate preview length
  const previewLength = startPoint && hoverPoint
    ? Math.abs(hoverPoint.chainage - startPoint.chainage)
    : 0;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 z-20">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              state === 'start' ? 'bg-purple-500 animate-pulse' : 'bg-green-500'
            }`}
          />
          <span className="text-sm text-slate-700">
            {state === 'start' ? 'Click to set start point' : 'Click to set end point'}
          </span>
        </div>

        {previewLength > 0 && (
          <>
            <div className="h-4 w-px bg-slate-200" />
            <div className="text-sm">
              <span className="text-slate-500">Length:</span>{' '}
              <span className="font-medium text-slate-900">{previewLength.toFixed(1)} m</span>
            </div>
          </>
        )}

        <div className="h-4 w-px bg-slate-200" />

        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
        >
          Cancel (Esc)
        </button>
      </div>

      {product && (
        <div className="mt-2 text-xs text-slate-500">
          Placing: <span className="font-medium">{product.name}</span>
          {product.layoutMode === 'segmented' && (
            <span className="ml-2 text-purple-600">(Segmented)</span>
          )}
        </div>
      )}
    </div>
  );
}
