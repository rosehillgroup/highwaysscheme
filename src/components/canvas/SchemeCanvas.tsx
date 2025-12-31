'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useSchemeStore } from '@/stores/schemeStore';
import { chainageToLngLat, getBearingAtChainage, getCorridorSection } from '@/lib/corridor/chainage';
import { resolveRun } from '@/lib/products/runResolver';
import { ProductShape } from './ProductShapes';
import productsData from '@/data/products.json';
import type { Product, PlacedElement } from '@/types';

const productsMap = new Map(
  (productsData.products as Product[]).map((p) => [p.id, p])
);

interface SchemeCanvasProps {
  map: maplibregl.Map | null;
  placementMode: { productId: string; isRun?: boolean } | null;
  onPlacementComplete: () => void;
}

// Scale factor: pixels per metre at current zoom
function getPixelsPerMetre(map: maplibregl.Map, lat: number): number {
  const metersPerPixel =
    (40075016.686 * Math.abs(Math.cos((lat * Math.PI) / 180))) /
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
  const viewMode = useSchemeStore((state) => state.viewMode);
  const sectionWindow = useSchemeStore((state) => state.sectionWindow);

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

  // Handle click for discrete placement mode
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!map || !corridor || !placementMode || placementMode.isRun) return;

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Convert screen to geo coordinates
      const lngLat = map.unproject([x, y]);

      // Find nearest point on corridor and calculate chainage
      const line = corridor.geometry;
      const pt = turf.point([lngLat.lng, lngLat.lat]);
      const snapped = turf.nearestPointOnLine(turf.lineString(line.coordinates), pt);

      const s = (snapped.properties.location ?? 0) * 1000; // km to m
      const t = 0; // Place on centreline by default

      addElement(placementMode.productId, { s, t, rotation: 0 }, 'discrete');
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

  // Render a discrete element
  const renderDiscreteElement = useCallback(
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

      const isSelected = element.id === selectedElementId;

      // If too small to show detail, render a marker instead
      if (widthPx < 4 || heightPx < 4) {
        return (
          <g
            key={element.id}
            onClick={(e) => handleElementClick(e, element.id)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={screenPos[0]}
              cy={screenPos[1]}
              r={isSelected ? 10 : 6}
              fill={isSelected ? '#2563eb' : '#475569'}
              stroke={isSelected ? '#1d4ed8' : '#334155'}
              strokeWidth={2}
            />
            {isSelected && (
              <circle
                cx={screenPos[0]}
                cy={screenPos[1]}
                r={14}
                fill="none"
                stroke="#2563eb"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            )}
          </g>
        );
      }

      // Calculate rotation (corridor bearing + element rotation)
      // Subtract 90° because SVG 0° is east (right) but bearing 0° is north (up)
      const corridorBearing = getBearingAtChainage(corridor.geometry, element.position.s);
      const totalRotation = corridorBearing - 90 + element.position.rotation;

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

  // Render a run element (multiple segments)
  const renderRunElement = useCallback(
    (element: PlacedElement) => {
      if (!map || !corridor || !element.runConfig) return null;

      const product = productsMap.get(element.productId);
      if (!product) return null;

      const resolved = resolveRun(element.runConfig, product);
      const isSelected = element.id === selectedElementId;

      return (
        <g key={element.id} onClick={(e) => handleElementClick(e, element.id)} style={{ cursor: 'pointer' }}>
          {resolved.segments.map((segment, index) => {
            // Get the center point of the segment
            const centerS = (segment.startS + segment.endS) / 2;
            const offset = element.runConfig!.offset || 0;

            const lngLat = chainageToLngLat(corridor.geometry, centerS, offset);
            if (!lngLat) return null;

            const screenPos = geoToScreen(lngLat);
            if (!screenPos) return null;

            // Find the module to get dimensions
            const productModule = product.modules?.find((m) => m.id === segment.moduleId);
            const segmentLength = productModule
              ? productModule.dimensions.length / 1000
              : segment.endS - segment.startS;
            const segmentWidth = productModule
              ? productModule.dimensions.width / 1000
              : product.dimensions.width / 1000;

            const widthPx = segmentLength * pixelsPerMetre;
            const heightPx = segmentWidth * pixelsPerMetre;

            if (widthPx < 2 || heightPx < 2) return null;

            // Subtract 90° because SVG 0° is east (right) but bearing 0° is north (up)
            const corridorBearing = getBearingAtChainage(corridor.geometry, centerS);
            const rotation = corridorBearing - 90;

            return (
              <g
                key={`${element.id}-${index}`}
                transform={`translate(${screenPos[0] - widthPx / 2}, ${screenPos[1] - heightPx / 2})`}
              >
                <ProductShape
                  product={product}
                  width={widthPx}
                  height={heightPx}
                  rotation={rotation}
                  selected={isSelected}
                />
              </g>
            );
          })}

          {/* Selection highlight for entire run */}
          {isSelected && (
            <RunSelectionHighlight
              element={element}
              corridor={corridor}
              geoToScreen={geoToScreen}
              pixelsPerMetre={pixelsPerMetre}
            />
          )}
        </g>
      );
    },
    [map, corridor, pixelsPerMetre, geoToScreen, selectedElementId, handleElementClick]
  );

  // Render an element based on type
  const renderElement = useCallback(
    (element: PlacedElement) => {
      if (element.type === 'run' && element.runConfig) {
        return renderRunElement(element);
      }
      return renderDiscreteElement(element);
    },
    [renderDiscreteElement, renderRunElement]
  );

  // Filter elements based on view mode
  const visibleElements = useMemo(() => {
    const allElements = Object.values(elements);

    if (viewMode === 'overview') {
      return allElements;
    }

    // Section view: filter to elements within the section window
    return allElements.filter((element) => {
      if (element.type === 'run' && element.runConfig) {
        // Check if run overlaps with section window
        return (
          element.runConfig.startS < sectionWindow.end &&
          element.runConfig.endS > sectionWindow.start
        );
      }
      // Discrete element: check if its position is within window
      return (
        element.position.s >= sectionWindow.start &&
        element.position.s <= sectionWindow.end
      );
    });
  }, [elements, viewMode, sectionWindow]);

  // Don't render if no map or corridor
  if (!map || !corridor?.carriageway.confirmed) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 z-10"
      width={viewState.width}
      height={viewState.height}
      style={{ pointerEvents: placementMode && !placementMode.isRun ? 'auto' : 'none' }}
      onClick={handleCanvasClick}
    >
      {/* Render visible elements */}
      {visibleElements.map(renderElement)}

      {/* Section window indicator in section mode */}
      {viewMode === 'section' && (
        <text
          x={10}
          y={viewState.height - 10}
          className="text-xs fill-slate-500 font-mono"
        >
          Section: {sectionWindow.start.toFixed(0)}m - {sectionWindow.end.toFixed(0)}m
        </text>
      )}
    </svg>
  );
}

// Helper component for run selection highlight
function RunSelectionHighlight({
  element,
  corridor,
  geoToScreen,
  pixelsPerMetre,
}: {
  element: PlacedElement;
  corridor: NonNullable<ReturnType<typeof useSchemeStore.getState>['corridor']>;
  geoToScreen: (lngLat: [number, number]) => [number, number] | null;
  pixelsPerMetre: number;
}) {
  if (!element.runConfig) return null;

  const startLngLat = chainageToLngLat(
    corridor.geometry,
    element.runConfig.startS,
    element.runConfig.offset || 0
  );
  const endLngLat = chainageToLngLat(
    corridor.geometry,
    element.runConfig.endS,
    element.runConfig.offset || 0
  );

  if (!startLngLat || !endLngLat) return null;

  const startScreen = geoToScreen(startLngLat);
  const endScreen = geoToScreen(endLngLat);

  if (!startScreen || !endScreen) return null;

  return (
    <>
      {/* Start marker */}
      <circle
        cx={startScreen[0]}
        cy={startScreen[1]}
        r={8}
        fill="#22c55e"
        stroke="#ffffff"
        strokeWidth={2}
        style={{ pointerEvents: 'none' }}
      />
      {/* End marker */}
      <circle
        cx={endScreen[0]}
        cy={endScreen[1]}
        r={8}
        fill="#ef4444"
        stroke="#ffffff"
        strokeWidth={2}
        style={{ pointerEvents: 'none' }}
      />
      {/* Connection line */}
      <line
        x1={startScreen[0]}
        y1={startScreen[1]}
        x2={endScreen[0]}
        y2={endScreen[1]}
        stroke="#2563eb"
        strokeWidth={2}
        strokeDasharray="6 3"
        style={{ pointerEvents: 'none' }}
      />
    </>
  );
}
