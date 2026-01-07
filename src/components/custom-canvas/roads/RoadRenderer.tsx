'use client';

import React, { memo, useMemo } from 'react';
import type { RoadSegment, CanvasViewport, BezierControlPoint } from '@/types/canvas';
import {
  roadToSvgPath,
  roadSurfaceToSvgPath,
  generateOffsetCurve,
  offsetCurveToSvgPath,
} from '@/lib/canvas/roadGeometry';

interface RoadRendererProps {
  road: RoadSegment;
  viewport: CanvasViewport;
  isSelected: boolean;
  isHovered: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  onDragStart?: (id: string, position: { x: number; y: number }, e: React.MouseEvent) => void;
}

/**
 * RoadRenderer - Renders a single road segment on the canvas
 *
 * Renders:
 * - Road surface (carriageway)
 * - Edge lines
 * - Centre line (dashed)
 * - Lane dividers (if multiple lanes)
 * - Cycle lane (if enabled)
 * - Selection highlight
 */
const RoadRenderer = memo(function RoadRenderer({
  road,
  viewport,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onDragStart,
}: RoadRendererProps) {
  const pixelsPerMetre = 100 * viewport.zoom;

  // Generate paths for rendering
  const paths = useMemo(() => {
    if (road.points.length < 2) return null;

    const centerPath = roadToSvgPath(road.points);
    const surfacePath = roadSurfaceToSvgPath(road.points, road.width);

    // Edge lines
    const leftEdge = generateOffsetCurve(road.points, road.width / 2);
    const rightEdge = generateOffsetCurve(road.points, -road.width / 2);
    const leftEdgePath = offsetCurveToSvgPath(leftEdge);
    const rightEdgePath = offsetCurveToSvgPath(rightEdge);

    // Cycle lane (if enabled)
    let cycleLanePath: string | null = null;
    let cycleLaneSurfacePath: string | null = null;

    if (road.cycleLane?.enabled) {
      const cycleWidth = road.cycleLane.width;
      const halfRoadWidth = road.width / 2;

      if (road.cycleLane.side === 'nearside') {
        // Left side cycle lane
        const cycleOuterEdge = generateOffsetCurve(road.points, halfRoadWidth + cycleWidth);
        const cycleInnerEdge = generateOffsetCurve(road.points, halfRoadWidth);

        cycleLanePath = offsetCurveToSvgPath(cycleOuterEdge);

        // Create closed path for cycle lane surface
        if (cycleOuterEdge.length > 0 && cycleInnerEdge.length > 0) {
          let path = `M ${cycleOuterEdge[0].x} ${cycleOuterEdge[0].y}`;
          for (let i = 1; i < cycleOuterEdge.length; i++) {
            path += ` L ${cycleOuterEdge[i].x} ${cycleOuterEdge[i].y}`;
          }
          for (let i = cycleInnerEdge.length - 1; i >= 0; i--) {
            path += ` L ${cycleInnerEdge[i].x} ${cycleInnerEdge[i].y}`;
          }
          path += ' Z';
          cycleLaneSurfacePath = path;
        }
      } else {
        // Right side cycle lane
        const cycleOuterEdge = generateOffsetCurve(road.points, -(halfRoadWidth + cycleWidth));
        const cycleInnerEdge = generateOffsetCurve(road.points, -halfRoadWidth);

        cycleLanePath = offsetCurveToSvgPath(cycleOuterEdge);

        if (cycleOuterEdge.length > 0 && cycleInnerEdge.length > 0) {
          let path = `M ${cycleInnerEdge[0].x} ${cycleInnerEdge[0].y}`;
          for (let i = 1; i < cycleInnerEdge.length; i++) {
            path += ` L ${cycleInnerEdge[i].x} ${cycleInnerEdge[i].y}`;
          }
          for (let i = cycleOuterEdge.length - 1; i >= 0; i--) {
            path += ` L ${cycleOuterEdge[i].x} ${cycleOuterEdge[i].y}`;
          }
          path += ' Z';
          cycleLaneSurfacePath = path;
        }
      }
    }

    // Lane dividers (if multiple lanes)
    // For multi-lane roads, draw dividers between lanes
    // For 2-lane roads (typical bidirectional), draw center line
    // For 1-lane roads, no center line needed
    const laneDividerPaths: string[] = [];
    const laneCount = road.lanes?.count ?? 1;

    if (laneCount > 1) {
      const totalWidth = road.width;
      const laneWidth = totalWidth / laneCount;

      // Draw dividers between lanes (not at edges)
      for (let i = 1; i < laneCount; i++) {
        const offset = -totalWidth / 2 + laneWidth * i;
        const dividerPoints = generateOffsetCurve(road.points, offset);
        laneDividerPaths.push(offsetCurveToSvgPath(dividerPoints));
      }
    }

    // Only include center path for rendering if we have multiple lanes
    // (center line only makes sense for 2-lane bidirectional roads)
    const showCenterLine = laneCount >= 2;

    return {
      centerPath: showCenterLine ? centerPath : null,
      surfacePath,
      leftEdgePath,
      rightEdgePath,
      cycleLanePath,
      cycleLaneSurfacePath,
      laneDividerPaths,
    };
  }, [road.points, road.width, road.cycleLane, road.lanes]);

  if (!paths) return null;

  // Convert canvas coordinates to screen coordinates
  const transform = `translate(${-viewport.pan.x * pixelsPerMetre}, ${-viewport.pan.y * pixelsPerMetre}) scale(${pixelsPerMetre})`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(road.id);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag on selected roads with left mouse button
    if (!isSelected || e.button !== 0) return;

    e.stopPropagation();
    e.preventDefault();

    // Use the first point as the reference position for drag
    const firstPoint = road.points[0]?.point;
    if (firstPoint && onDragStart) {
      onDragStart(road.id, firstPoint, e);
    }
  };

  const handleMouseEnter = () => {
    onHover?.(road.id);
  };

  const handleMouseLeave = () => {
    onHover?.(null);
  };

  return (
    <g
      className="road-segment"
      transform={transform}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: isSelected ? 'grab' : 'pointer' }}
    >
      {/* Selection highlight (behind everything) */}
      {isSelected && (
        <path
          d={paths.surfacePath}
          fill="none"
          stroke="#FF6B35"
          strokeWidth={0.3}
          strokeOpacity={0.5}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Cycle lane surface */}
      {paths.cycleLaneSurfacePath && (
        <path
          d={paths.cycleLaneSurfacePath}
          fill="#7CB342"
          fillOpacity={0.6}
          stroke="none"
        />
      )}

      {/* Road surface (carriageway) */}
      <path
        d={paths.surfacePath}
        fill="#4a4a4a"
        stroke="none"
        opacity={isHovered ? 0.9 : 0.85}
      />

      {/* Cycle lane edge line */}
      {paths.cycleLanePath && (
        <path
          d={paths.cycleLanePath}
          fill="none"
          stroke="#ffffff"
          strokeWidth={0.1}
          strokeDasharray="0.3 0.2"
        />
      )}

      {/* Edge lines (white) */}
      <path
        d={paths.leftEdgePath}
        fill="none"
        stroke="#ffffff"
        strokeWidth={0.1}
      />
      <path
        d={paths.rightEdgePath}
        fill="none"
        stroke="#ffffff"
        strokeWidth={0.1}
      />

      {/* Lane dividers (includes center line for 2+ lane roads) */}
      {paths.laneDividerPaths.map((path, i) => (
        <path
          key={`lane-divider-${i}`}
          d={path}
          fill="none"
          stroke="#ffffff"
          strokeWidth={0.1}
          strokeDasharray="0.5 0.3"
        />
      ))}

      {/* Selection outline - use center path or fall back to generating one */}
      {isSelected && (
        <path
          d={paths.centerPath || roadToSvgPath(road.points)}
          fill="none"
          stroke="#FF6B35"
          strokeWidth={0.15}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Hover highlight */}
      {isHovered && !isSelected && (
        <path
          d={paths.centerPath || roadToSvgPath(road.points)}
          fill="none"
          stroke="#FF6B35"
          strokeWidth={0.1}
          strokeOpacity={0.5}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  );
});

export default RoadRenderer;

// ============================================================================
// Roads Layer Component
// ============================================================================

interface RoadsLayerProps {
  roads: Record<string, RoadSegment>;
  roadOrder: string[];
  viewport: CanvasViewport;
  selectedRoadId: string | null;
  hoveredRoadId: string | null;
  onSelectRoad?: (id: string | null) => void;
  onHoverRoad?: (id: string | null) => void;
  onDragStart?: (id: string, position: { x: number; y: number }, e: React.MouseEvent) => void;
}

export const RoadsLayer = memo(function RoadsLayer({
  roads,
  roadOrder,
  viewport,
  selectedRoadId,
  hoveredRoadId,
  onSelectRoad,
  onHoverRoad,
  onDragStart,
}: RoadsLayerProps) {
  return (
    <g className="roads-layer">
      {roadOrder.map((roadId) => {
        const road = roads[roadId];
        if (!road) return null;

        return (
          <RoadRenderer
            key={road.id}
            road={road}
            viewport={viewport}
            isSelected={selectedRoadId === road.id}
            isHovered={hoveredRoadId === road.id}
            onSelect={onSelectRoad}
            onHover={onHoverRoad}
            onDragStart={onDragStart}
          />
        );
      })}
    </g>
  );
});
