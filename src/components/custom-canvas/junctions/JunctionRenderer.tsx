'use client';

import React, { memo, useMemo } from 'react';
import type { Junction, CanvasViewport } from '@/types/canvas';
import {
  generateTJunctionPath,
  generateCrossroadsPath,
  generateRoundaboutPath,
  generateRoundaboutApproaches,
  getRoundaboutDimensions,
  getDefaultArms,
  degToRad,
} from '@/lib/canvas/junctionGeometry';

interface JunctionRendererProps {
  junction: Junction;
  viewport: CanvasViewport;
  roadWidth: number;
  isSelected: boolean;
  isHovered: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  onDragStart?: (id: string, position: { x: number; y: number }, e: React.MouseEvent) => void;
}

/**
 * JunctionRenderer - Renders a single junction on the canvas
 *
 * Supports:
 * - T-junction
 * - Crossroads
 * - Roundabout
 * - Mini-roundabout
 */
const JunctionRenderer = memo(function JunctionRenderer({
  junction,
  viewport,
  roadWidth,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onDragStart,
}: JunctionRendererProps) {
  const pixelsPerMetre = 100 * viewport.zoom;

  // Generate paths based on junction type
  const paths = useMemo(() => {
    const { position, rotation, type } = junction;

    switch (type) {
      case 't-junction':
        return {
          surface: generateTJunctionPath(position, rotation, roadWidth),
          type: 'simple',
        };

      case 'crossroads':
        return {
          surface: generateCrossroadsPath(position, rotation, roadWidth),
          type: 'simple',
        };

      case 'roundabout':
      case 'mini-roundabout': {
        const dims = getRoundaboutDimensions(type, roadWidth);
        const { outerPath, innerPath } = generateRoundaboutPath(
          position,
          dims.outerRadius,
          dims.innerRadius
        );
        const approaches = generateRoundaboutApproaches(
          position,
          rotation,
          dims.outerRadius,
          roadWidth,
          4
        );
        return {
          outerPath,
          innerPath,
          approaches,
          dims,
          type: 'roundabout',
        };
      }

      default:
        return { surface: '', type: 'simple' };
    }
  }, [junction, roadWidth]);

  // Generate arm indicators (small triangles showing direction)
  const armIndicators = useMemo(() => {
    const arms = getDefaultArms(junction.type, roadWidth);
    return arms.map((arm, i) => {
      const angle = junction.rotation + arm.angle;
      const rad = degToRad(angle);

      let distance: number;
      if (junction.type === 'roundabout' || junction.type === 'mini-roundabout') {
        const dims = getRoundaboutDimensions(junction.type, roadWidth);
        distance = dims.outerRadius + roadWidth * 0.8;
      } else {
        distance = roadWidth * 1.2;
      }

      return {
        x: junction.position.x + Math.cos(rad) * distance,
        y: junction.position.y + Math.sin(rad) * distance,
        angle,
        index: i,
      };
    });
  }, [junction, roadWidth]);

  const transform = `translate(${-viewport.pan.x * pixelsPerMetre}, ${-viewport.pan.y * pixelsPerMetre}) scale(${pixelsPerMetre})`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(junction.id);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if already selected and left mouse button
    if (isSelected && e.button === 0 && onDragStart) {
      e.stopPropagation();
      e.preventDefault();
      onDragStart(junction.id, junction.position, e);
    }
  };

  const handleMouseEnter = () => {
    onHover?.(junction.id);
  };

  const handleMouseLeave = () => {
    onHover?.(null);
  };

  return (
    <g
      className="junction"
      transform={transform}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: isSelected ? 'grab' : 'pointer' }}
    >
      {/* Selection highlight */}
      {isSelected && (
        <circle
          cx={junction.position.x}
          cy={junction.position.y}
          r={roadWidth * 2}
          fill="none"
          stroke="#FF6B35"
          strokeWidth={0.2}
          strokeOpacity={0.5}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Render based on junction type */}
      {paths.type === 'simple' && paths.surface && (
        <>
          {/* Junction surface */}
          <path
            d={paths.surface}
            fill="#4a4a4a"
            stroke="none"
            opacity={isHovered ? 0.9 : 0.85}
          />

          {/* Edge lines */}
          <path
            d={paths.surface}
            fill="none"
            stroke="#ffffff"
            strokeWidth={0.1}
          />
        </>
      )}

      {paths.type === 'roundabout' && (
        <>
          {/* Approach roads */}
          {paths.approaches?.map((approachPath, i) => (
            <path
              key={`approach-${i}`}
              d={approachPath}
              fill="#4a4a4a"
              stroke="none"
              opacity={isHovered ? 0.9 : 0.85}
            />
          ))}

          {/* Outer circle (circulating carriageway) */}
          <path
            d={paths.outerPath}
            fill="#4a4a4a"
            stroke="none"
            opacity={isHovered ? 0.9 : 0.85}
          />

          {/* Central island */}
          {paths.innerPath && (
            <path
              d={paths.innerPath}
              fill="#6b8e23"
              stroke="#ffffff"
              strokeWidth={0.1}
            />
          )}

          {/* Mini-roundabout center marking */}
          {junction.type === 'mini-roundabout' && (
            <circle
              cx={junction.position.x}
              cy={junction.position.y}
              r={roadWidth * 0.4}
              fill="none"
              stroke="#ffffff"
              strokeWidth={0.15}
            />
          )}

          {/* Outer edge line */}
          <circle
            cx={junction.position.x}
            cy={junction.position.y}
            r={paths.dims?.outerRadius ?? roadWidth * 2}
            fill="none"
            stroke="#ffffff"
            strokeWidth={0.1}
          />

          {/* Give way dashes around the roundabout */}
          {armIndicators.map((arm, i) => {
            const dims = paths.dims!;
            const rad = degToRad(arm.angle);
            const giveWayRadius = dims.outerRadius;
            const hw = roadWidth / 2 * 0.8;
            const perpX = -Math.sin(rad) * hw;
            const perpY = Math.cos(rad) * hw;
            const lineX = junction.position.x + Math.cos(rad) * giveWayRadius;
            const lineY = junction.position.y + Math.sin(rad) * giveWayRadius;

            return (
              <line
                key={`give-way-${i}`}
                x1={lineX - perpX}
                y1={lineY - perpY}
                x2={lineX + perpX}
                y2={lineY + perpY}
                stroke="#ffffff"
                strokeWidth={0.15}
                strokeDasharray="0.3 0.15"
              />
            );
          })}
        </>
      )}

      {/* Selection indicator at center */}
      {isSelected && (
        <circle
          cx={junction.position.x}
          cy={junction.position.y}
          r={0.3}
          fill="#FF6B35"
          stroke="#ffffff"
          strokeWidth={0.08}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Hover highlight */}
      {isHovered && !isSelected && (
        <circle
          cx={junction.position.x}
          cy={junction.position.y}
          r={0.25}
          fill="#FF6B35"
          fillOpacity={0.5}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  );
});

export default JunctionRenderer;

// ============================================================================
// Junctions Layer Component
// ============================================================================

interface JunctionsLayerProps {
  junctions: Record<string, Junction>;
  viewport: CanvasViewport;
  roadWidth: number;
  selectedJunctionId: string | null;
  hoveredJunctionId: string | null;
  onSelectJunction?: (id: string | null) => void;
  onHoverJunction?: (id: string | null) => void;
  onDragStart?: (id: string, position: { x: number; y: number }, e: React.MouseEvent) => void;
}

export const JunctionsLayer = memo(function JunctionsLayer({
  junctions,
  viewport,
  roadWidth,
  selectedJunctionId,
  hoveredJunctionId,
  onSelectJunction,
  onHoverJunction,
  onDragStart,
}: JunctionsLayerProps) {
  return (
    <g className="junctions-layer">
      {Object.values(junctions).map((junction) => (
        <JunctionRenderer
          key={junction.id}
          junction={junction}
          viewport={viewport}
          roadWidth={roadWidth}
          isSelected={selectedJunctionId === junction.id}
          isHovered={hoveredJunctionId === junction.id}
          onSelect={onSelectJunction}
          onHover={onHoverJunction}
          onDragStart={onDragStart}
        />
      ))}
    </g>
  );
});
