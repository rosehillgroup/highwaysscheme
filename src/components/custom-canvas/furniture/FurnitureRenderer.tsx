'use client';

import React, { memo, useMemo } from 'react';
import type { FurniturePlacement, CanvasViewport } from '@/types/canvas';
import { getFurniturePath, getReflectiveBand } from '@/lib/canvas/furniturePatterns';
import furnitureData from '@/data/furniture.json';

interface FurnitureRendererProps {
  furniture: FurniturePlacement;
  viewport: CanvasViewport;
  isSelected: boolean;
  isHovered: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  onDragStart?: (id: string, position: { x: number; y: number }, e: React.MouseEvent) => void;
}

// Get furniture definition from data
function getFurnitureDefinition(furnitureId: string) {
  return furnitureData.items.find((f) => f.id === furnitureId);
}

/**
 * FurnitureRenderer - Renders a single piece of street furniture on the canvas
 *
 * Supports:
 * - Bollards (fixed, removable, flexible)
 * - Lane delineators
 * - Barriers and guardrails
 * - Cycle stands and shelters
 * - Pedestrian furniture (Belisha beacons, tactile paving)
 */
const FurnitureRenderer = memo(function FurnitureRenderer({
  furniture,
  viewport,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onDragStart,
}: FurnitureRendererProps) {
  const pixelsPerMetre = 100 * viewport.zoom;
  const definition = getFurnitureDefinition(furniture.furnitureType);

  // Get furniture path data
  const furniturePath = useMemo(() => {
    if (!definition) return null;
    return getFurniturePath(
      furniture.furnitureType,
      definition.width,
      definition.height,
      definition.color,
      definition.reflective,
      definition.reflectiveColor,
      definition.illuminated,
      definition.lightColor
    );
  }, [furniture.furnitureType, definition]);

  if (!furniturePath || !definition) return null;

  const transform = `
    translate(${-viewport.pan.x * pixelsPerMetre}, ${-viewport.pan.y * pixelsPerMetre})
    scale(${pixelsPerMetre})
  `;

  const furnitureTransform = `
    translate(${furniture.position.x}, ${furniture.position.y})
    rotate(${furniture.rotation || 0})
  `;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(furniture.id);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if already selected and left mouse button
    if (isSelected && e.button === 0 && onDragStart) {
      e.stopPropagation();
      e.preventDefault();
      onDragStart(furniture.id, furniture.position, e);
    }
  };

  const handleMouseEnter = () => {
    onHover?.(furniture.id);
  };

  const handleMouseLeave = () => {
    onHover?.(null);
  };

  // Calculate selection ring size
  const selectionRadius = Math.max(furniturePath.width, furniturePath.width) * 0.8;

  return (
    <g
      className="street-furniture"
      transform={transform}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: isSelected ? 'grab' : 'pointer' }}
    >
      <g transform={furnitureTransform}>
        {/* Selection highlight */}
        {isSelected && (
          <circle
            cx={0}
            cy={0}
            r={selectionRadius}
            fill="none"
            stroke="#FF6B35"
            strokeWidth={0.05}
            strokeOpacity={0.7}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Main furniture shape */}
        <path
          d={furniturePath.topPath}
          fill={furniturePath.color}
          stroke={isHovered ? '#FF6B35' : '#1f2937'}
          strokeWidth={0.015}
          opacity={isHovered ? 1 : 0.95}
        />

        {/* Reflective band */}
        {furniturePath.reflective && furniturePath.reflectiveColor && (
          <path
            d={getReflectiveBand(furniturePath.width, furniturePath.reflectiveColor)}
            fill={furniturePath.reflectiveColor}
            opacity={0.9}
          />
        )}

        {/* Illumination effect for beacons */}
        {furniturePath.illuminated && (
          <>
            <circle
              cx={0}
              cy={0}
              r={furniturePath.width * 0.6}
              fill={furniturePath.lightColor || '#f59e0b'}
              opacity={0.4}
            />
            <circle
              cx={0}
              cy={0}
              r={furniturePath.width * 0.35}
              fill={furniturePath.lightColor || '#f59e0b'}
              opacity={0.7}
            />
          </>
        )}

        {/* Hover highlight */}
        {isHovered && !isSelected && (
          <circle
            cx={0}
            cy={0}
            r={selectionRadius * 0.9}
            fill="#FF6B35"
            fillOpacity={0.15}
            style={{ pointerEvents: 'none' }}
          />
        )}
      </g>
    </g>
  );
});

export default FurnitureRenderer;

// ============================================================================
// Furniture Layer Component
// ============================================================================

interface FurnitureLayerProps {
  furniture: Record<string, FurniturePlacement>;
  viewport: CanvasViewport;
  selectedFurnitureId: string | null;
  hoveredFurnitureId: string | null;
  onSelectFurniture?: (id: string | null) => void;
  onHoverFurniture?: (id: string | null) => void;
  onDragStart?: (id: string, position: { x: number; y: number }, e: React.MouseEvent) => void;
}

export const FurnitureLayer = memo(function FurnitureLayer({
  furniture,
  viewport,
  selectedFurnitureId,
  hoveredFurnitureId,
  onSelectFurniture,
  onHoverFurniture,
  onDragStart,
}: FurnitureLayerProps) {
  return (
    <g className="furniture-layer">
      {Object.values(furniture).map((item) => (
        <FurnitureRenderer
          key={item.id}
          furniture={item}
          viewport={viewport}
          isSelected={selectedFurnitureId === item.id}
          isHovered={hoveredFurnitureId === item.id}
          onSelect={onSelectFurniture}
          onHover={onHoverFurniture}
          onDragStart={onDragStart}
        />
      ))}
    </g>
  );
});
