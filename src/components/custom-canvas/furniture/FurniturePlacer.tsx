'use client';

import React, { useState, useCallback, useEffect, memo, useMemo } from 'react';
import type { CanvasPoint, CanvasViewport, FurnitureType } from '@/types/canvas';
import { getFurniturePath, getReflectiveBand } from '@/lib/canvas/furniturePatterns';
import furnitureData from '@/data/furniture.json';

interface FurniturePlacerProps {
  viewport: CanvasViewport;
  furnitureType: FurnitureType;
  gridSize: number;
  snapToGrid: boolean;
  onPlace: (position: CanvasPoint, rotation: number) => void;
  onCancel: () => void;
}

// Get furniture definition from data
function getFurnitureDefinition(furnitureId: string) {
  return furnitureData.items.find((f) => f.id === furnitureId);
}

/**
 * FurniturePlacer - Interactive furniture placement tool
 *
 * Usage:
 * - Move mouse to position furniture
 * - Click to place
 * - R key to rotate
 * - Escape to cancel
 */
const FurniturePlacer = memo(function FurniturePlacer({
  viewport,
  furnitureType,
  gridSize,
  snapToGrid,
  onPlace,
  onCancel,
}: FurniturePlacerProps) {
  const [cursorPosition, setCursorPosition] = useState<CanvasPoint | null>(null);
  const [rotation, setRotation] = useState(0);

  const pixelsPerMetre = 100 * viewport.zoom;
  const definition = getFurnitureDefinition(furnitureType);

  const furniturePath = useMemo(() => {
    if (!definition) return null;
    return getFurniturePath(
      furnitureType,
      definition.width,
      definition.height,
      definition.color,
      definition.reflective,
      definition.reflectiveColor,
      definition.illuminated,
      definition.lightColor
    );
  }, [furnitureType, definition]);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number, containerRect: DOMRect): CanvasPoint => {
      const relX = screenX - containerRect.left;
      const relY = screenY - containerRect.top;

      let canvasX = relX / pixelsPerMetre + viewport.pan.x;
      let canvasY = relY / pixelsPerMetre + viewport.pan.y;

      // Snap to grid if enabled
      if (snapToGrid) {
        canvasX = Math.round(canvasX / gridSize) * gridSize;
        canvasY = Math.round(canvasY / gridSize) * gridSize;
      }

      return { x: canvasX, y: canvasY };
    },
    [viewport, pixelsPerMetre, snapToGrid, gridSize]
  );

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setRotation((prev) => (prev + 45) % 360);
      } else if (e.key === 'Enter' && cursorPosition) {
        e.preventDefault();
        onPlace(cursorPosition, rotation);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cursorPosition, rotation, onPlace, onCancel]);

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGGElement>) => {
      const svg = e.currentTarget.ownerSVGElement;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const canvasPoint = screenToCanvas(e.clientX, e.clientY, rect);
      setCursorPosition(canvasPoint);
    },
    [screenToCanvas]
  );

  // Handle click to place
  const handleClick = useCallback(
    (e: React.MouseEvent<SVGGElement>) => {
      if (!cursorPosition) return;

      e.preventDefault();
      e.stopPropagation();
      onPlace(cursorPosition, rotation);
    },
    [cursorPosition, rotation, onPlace]
  );

  const transform = `
    translate(${-viewport.pan.x * pixelsPerMetre}, ${-viewport.pan.y * pixelsPerMetre})
    scale(${pixelsPerMetre})
  `;

  const furnitureName = definition?.name || 'Furniture';

  return (
    <g
      className="furniture-placer"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      style={{ cursor: 'crosshair' }}
    >
      {/* Invisible hit area */}
      <rect
        x={0}
        y={0}
        width="100%"
        height="100%"
        fill="transparent"
        style={{ pointerEvents: 'all' }}
      />

      {/* Preview furniture */}
      {cursorPosition && furniturePath && (
        <g transform={transform} style={{ pointerEvents: 'none' }}>
          <g transform={`translate(${cursorPosition.x}, ${cursorPosition.y}) rotate(${rotation})`}>
            {/* Main furniture shape */}
            <path
              d={furniturePath.topPath}
              fill={furniturePath.color}
              stroke="#1f2937"
              strokeWidth={0.015}
              opacity={0.7}
            />

            {/* Reflective band */}
            {furniturePath.reflective && furniturePath.reflectiveColor && (
              <path
                d={getReflectiveBand(furniturePath.width, furniturePath.reflectiveColor)}
                fill={furniturePath.reflectiveColor}
                opacity={0.6}
              />
            )}

            {/* Illumination effect for beacons */}
            {furniturePath.illuminated && (
              <circle
                cx={0}
                cy={0}
                r={furniturePath.width * 0.5}
                fill={furniturePath.lightColor || '#f59e0b'}
                opacity={0.3}
              />
            )}

            {/* Placement indicator */}
            <circle
              cx={0}
              cy={0}
              r={0.1}
              fill="#FF6B35"
              stroke="#fff"
              strokeWidth={0.03}
            />
          </g>
        </g>
      )}

      {/* Instructions overlay */}
      <g style={{ pointerEvents: 'none' }}>
        <rect x={10} y={10} width={260} height={85} rx={8} fill="white" fillOpacity={0.95} />

        <text x={20} y={30} fontSize={12} fill="#1e293b" fontWeight={600}>
          Placing {furnitureName}
        </text>

        <text x={20} y={48} fontSize={11} fill="#64748b">
          Click to place
        </text>

        <text x={20} y={65} fontSize={11} fill="#64748b">
          R: rotate • Escape: cancel
        </text>

        <text x={20} y={82} fontSize={10} fill="#94a3b8">
          Rotation: {rotation}°
        </text>
      </g>
    </g>
  );
});

export default FurniturePlacer;
