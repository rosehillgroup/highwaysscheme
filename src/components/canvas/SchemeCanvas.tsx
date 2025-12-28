'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import { useSchemeStore } from '@/stores/schemeStore';
import { chainageToLngLat, getBearingAtChainage } from '@/lib/corridor/chainage';
import { ProductShape } from './ProductShapes';
import productsData from '@/data/products.json';
import type { Product, PlacedElement } from '@/types';

const productsMap = new Map(
  (productsData.products as Product[]).map((p) => [p.id, p])
);

interface SchemeCanvasProps {
  map: maplibregl.Map | null;
  placementMode: { productId: string } | null;
  onPlacementComplete: () => void;
}

// Scale factor: pixels per metre at current zoom
function getPixelsPerMetre(map: maplibregl.Map, lat: number): number {
  const metersPerPixel = (40075016.686 * Math.abs(Math.cos((lat * Math.PI) / 180))) /
    Math.pow(2, map.getZoom() + 8);
  return 1 / metersPerPixel;
}

export default function SchemeCanvas({
  map,
  placementMode,
  onPlacementComplete,
}: SchemeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewState, setViewState] = useState({ width: 0, height: 0 });
  const [pixelsPerMetre, setPixelsPerMetre] = useState(1);

  const corridor = useSchemeStore((state) => state.corridor);
  const elements = useSchemeStore((state) => state.elements);
  const selectedElementId = useSchemeStore((state) => state.selectedElementId);
  const selectElement = useSchemeStore((state) => state.selectElement);
  const addElement = useSchemeStore((state) => state.addElement);
  const updateElement = useSchemeStore((state) => state.updateElement);
  const removeElement = useSchemeStore((state) => state.removeElement);

  // Update view dimensions
  useEffect(() => {
    if (!map) return;

    const updateView = () => {
      const container = map.getContainer();
      setViewState({
        width: container.clientWidth,
        height: container.clientHeight,
      });

      const center = map.getCenter();
      setPixelsPerMetre(getPixelsPerMetre(map, center.lat));
    };

    updateView();
    map.on('move', updateView);
    map.on('zoom', updateView);
    map.on('resize', updateView);

    return () => {
      map.off('move', updateView);
      map.off('zoom', updateView);
      map.off('resize', updateView);
    };
  }, [map]);

  // Convert geographic coordinates to screen coordinates
  const geoToScreen = useCallback(
    (lngLat: [number, number]): [number, number] | null => {
      if (!map) return null;
      const point = map.project(lngLat);
      return [point.x, point.y];
    },
    [map]
  );

  // Handle click for placement mode
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!map || !corridor || !placementMode) return;

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Convert screen to geo coordinates
      const lngLat = map.unproject([x, y]);

      // Find nearest point on corridor and calculate chainage
      const line = corridor.geometry;
      const turf = require('@turf/turf');
      const pt = turf.point([lngLat.lng, lngLat.lat]);
      const snapped = turf.nearestPointOnLine(turf.lineString(line.coordinates), pt);

      const s = (snapped.properties.location ?? 0) * 1000; // km to m
      const t = 0; // Place on centreline by default
      const bearing = getBearingAtChainage(line, s);

      // Get the corridor bearing at this point and calculate relative rotation
      const rotation = 0; // Aligned with corridor

      addElement(placementMode.productId, { s, t, rotation }, 'discrete');
      onPlacementComplete();
    },
    [map, corridor, placementMode, addElement, onPlacementComplete]
  );

  // Handle element click for selection
  const handleElementClick = useCallback(
    (e: React.MouseEvent, elementId: string) => {
      e.stopPropagation();
      selectElement(elementId);
    },
    [selectElement]
  );

  // Render a placed element
  const renderElement = useCallback(
    (element: PlacedElement) => {
      if (!map || !corridor) return null;

      const product = productsMap.get(element.productId);
      if (!product) return null;

      // Convert chainage to geographic coordinates
      const lngLat = chainageToLngLat(corridor.geometry, element.position.s, element.position.t);
      if (!lngLat) return null;

      // Convert to screen coordinates
      const screenPos = geoToScreen(lngLat);
      if (!screenPos) return null;

      // Calculate rendered size based on product dimensions and scale
      const widthPx = (product.dimensions.length / 1000) * pixelsPerMetre;
      const heightPx = (product.dimensions.width / 1000) * pixelsPerMetre;

      // Don't render if too small
      if (widthPx < 4 || heightPx < 4) return null;

      // Calculate rotation (corridor bearing + element rotation)
      const corridorBearing = getBearingAtChainage(corridor.geometry, element.position.s);
      const totalRotation = corridorBearing + element.position.rotation;

      const isSelected = element.id === selectedElementId;

      return (
        <g
          key={element.id}
          transform={`translate(${screenPos[0] - widthPx / 2}, ${screenPos[1] - heightPx / 2})`}
          onClick={(e) => handleElementClick(e, element.id)}
          style={{ cursor: 'pointer' }}
        >
          <ProductShape
            product={product}
            width={widthPx}
            height={heightPx}
            rotation={totalRotation}
            selected={isSelected}
          />

          {/* Selection highlight */}
          {isSelected && (
            <rect
              x={-4}
              y={-4}
              width={widthPx + 8}
              height={heightPx + 8}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="4 2"
              rx={4}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      );
    },
    [map, corridor, pixelsPerMetre, geoToScreen, selectedElementId, handleElementClick]
  );

  // Don't render if no map or corridor
  if (!map || !corridor?.carriageway.confirmed) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none"
      width={viewState.width}
      height={viewState.height}
      style={{ pointerEvents: placementMode ? 'auto' : 'none' }}
      onClick={handleCanvasClick}
    >
      {/* Render all placed elements */}
      {Object.values(elements).map(renderElement)}

      {/* Placement cursor indicator */}
      {placementMode && (
        <g className="pointer-events-none">
          <circle
            cx={viewState.width / 2}
            cy={viewState.height / 2}
            r={20}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="4 2"
            opacity={0.5}
          />
        </g>
      )}
    </svg>
  );
}
