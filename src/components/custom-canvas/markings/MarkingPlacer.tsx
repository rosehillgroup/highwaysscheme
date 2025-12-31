'use client';

import React, { useState, useCallback, useEffect, memo, useMemo } from 'react';
import type { CanvasPoint, CanvasViewport, MarkingType, RoadSegment } from '@/types/canvas';
import { getMarkingPath } from '@/lib/canvas/markingPatterns';
import { closestPointOnRoad, pointAtChainage } from '@/lib/canvas/roadGeometry';
import markingsData from '@/data/markings.json';

interface MarkingPlacerProps {
  viewport: CanvasViewport;
  markingType: MarkingType;
  roads: Record<string, RoadSegment>;
  gridSize: number;
  snapToGrid: boolean;
  onPlace: (roadId: string, chainage: number, offset: number, rotation: number) => void;
  onCancel: () => void;
}

// Get marking definition from data
function getMarkingDefinition(type: string) {
  return markingsData.markings.find((m) => m.id === type);
}

/**
 * MarkingPlacer - Interactive marking placement tool
 *
 * Usage:
 * - Move mouse to position marking on road
 * - Markings snap to nearest road
 * - Scroll wheel to adjust lateral offset
 * - R key to rotate marking
 * - Click to place
 * - Escape to cancel
 */
const MarkingPlacer = memo(function MarkingPlacer({
  viewport,
  markingType,
  roads,
  gridSize,
  snapToGrid,
  onPlace,
  onCancel,
}: MarkingPlacerProps) {
  const [cursorPosition, setCursorPosition] = useState<CanvasPoint | null>(null);
  const [nearestRoad, setNearestRoad] = useState<{
    roadId: string;
    chainage: number;
    offset: number;
    point: CanvasPoint;
    angle: number;
  } | null>(null);
  const [lateralOffset, setLateralOffset] = useState(0);
  const [rotation, setRotation] = useState(0);

  const pixelsPerMetre = 100 * viewport.zoom;
  const definition = getMarkingDefinition(markingType);
  const markingPath = useMemo(() => {
    if (!definition) return null;
    return getMarkingPath(markingType, definition.width, definition.height);
  }, [markingType, definition]);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number, containerRect: DOMRect): CanvasPoint => {
      const relX = screenX - containerRect.left;
      const relY = screenY - containerRect.top;

      return {
        x: relX / pixelsPerMetre + viewport.pan.x,
        y: relY / pixelsPerMetre + viewport.pan.y,
      };
    },
    [viewport, pixelsPerMetre]
  );

  // Find nearest road to cursor
  const findNearestRoad = useCallback(
    (canvasPoint: CanvasPoint) => {
      let nearest: {
        roadId: string;
        chainage: number;
        distance: number;
        point: CanvasPoint;
      } | null = null;

      for (const [roadId, road] of Object.entries(roads)) {
        if (road.points.length < 2) continue;

        const result = closestPointOnRoad(road.points, canvasPoint);
        if (!result) continue;

        if (!nearest || result.distance < nearest.distance) {
          nearest = {
            roadId,
            chainage: result.chainage,
            distance: result.distance,
            point: result.point,
          };
        }
      }

      return nearest;
    },
    [roads]
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
      } else if (e.key === 'Enter' && nearestRoad) {
        e.preventDefault();
        onPlace(nearestRoad.roadId, nearestRoad.chainage, lateralOffset, rotation);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearestRoad, lateralOffset, rotation, onPlace, onCancel]);

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGGElement>) => {
      const svg = e.currentTarget.ownerSVGElement;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const canvasPoint = screenToCanvas(e.clientX, e.clientY, rect);
      setCursorPosition(canvasPoint);

      // Find nearest road
      const nearest = findNearestRoad(canvasPoint);
      if (nearest && nearest.distance < 5) {
        // Within 5m of a road
        const road = roads[nearest.roadId];
        if (road) {
          const roadPoint = pointAtChainage(road.points, nearest.chainage);
          if (roadPoint) {
            setNearestRoad({
              roadId: nearest.roadId,
              chainage: nearest.chainage,
              offset: lateralOffset,
              point: {
                x: roadPoint.point.x + roadPoint.normal.x * lateralOffset,
                y: roadPoint.point.y + roadPoint.normal.y * lateralOffset,
              },
              angle: Math.atan2(roadPoint.tangent.y, roadPoint.tangent.x) * (180 / Math.PI) + 90,
            });
          }
        }
      } else {
        setNearestRoad(null);
      }
    },
    [screenToCanvas, findNearestRoad, roads, lateralOffset]
  );

  // Handle click to place
  const handleClick = useCallback(
    (e: React.MouseEvent<SVGGElement>) => {
      if (!nearestRoad) return;

      e.preventDefault();
      e.stopPropagation();
      onPlace(nearestRoad.roadId, nearestRoad.chainage, lateralOffset, rotation);
    },
    [nearestRoad, lateralOffset, rotation, onPlace]
  );

  // Handle wheel for lateral offset adjustment
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.5 : 0.5;
    setLateralOffset((prev) => Math.max(-5, Math.min(5, prev + delta)));
  }, []);

  const transform = `
    translate(${-viewport.pan.x * pixelsPerMetre}, ${-viewport.pan.y * pixelsPerMetre})
    scale(${pixelsPerMetre})
  `;

  const markingName = definition?.name || 'Marking';

  return (
    <g
      className="marking-placer"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onWheel={handleWheel}
      style={{ cursor: nearestRoad ? 'crosshair' : 'not-allowed' }}
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

      {/* Preview marking */}
      {nearestRoad && markingPath && (
        <g transform={transform} style={{ pointerEvents: 'none' }}>
          <g transform={`translate(${nearestRoad.point.x}, ${nearestRoad.point.y}) rotate(${nearestRoad.angle + rotation})`}>
            {/* Marking preview */}
            {markingPath.type === 'symbol' && markingPath.path && (
              <path
                d={markingPath.path}
                fill={markingPath.fill || '#ffffff'}
                stroke={markingPath.stroke}
                strokeWidth={markingPath.strokeWidth}
                opacity={0.7}
              />
            )}

            {markingPath.type === 'pattern' && markingPath.paths && (
              <g opacity={0.7}>
                {markingPath.paths.map((path, i) => (
                  <path
                    key={i}
                    d={path}
                    fill={markingPath.fill || '#ffffff'}
                  />
                ))}
              </g>
            )}

            {markingPath.type === 'pattern' && markingPath.lines && (
              <g opacity={0.7}>
                {markingType === 'box-junction' && (
                  <rect
                    x={-markingPath.width / 2}
                    y={-markingPath.height / 2}
                    width={markingPath.width}
                    height={markingPath.height}
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth={0.15}
                  />
                )}
                {markingPath.lines.map((line, i) => (
                  <line
                    key={i}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={markingPath.stroke || '#FFD700'}
                    strokeWidth={markingPath.strokeWidth || 0.1}
                  />
                ))}
              </g>
            )}

            {/* Center indicator */}
            <circle
              cx={0}
              cy={0}
              r={0.15}
              fill="#FF6B35"
              stroke="#fff"
              strokeWidth={0.04}
            />
          </g>

          {/* Road highlight */}
          <circle
            cx={nearestRoad.point.x}
            cy={nearestRoad.point.y}
            r={0.3}
            fill="none"
            stroke="#FF6B35"
            strokeWidth={0.05}
            strokeDasharray="0.1 0.05"
          />
        </g>
      )}

      {/* No road warning */}
      {cursorPosition && !nearestRoad && (
        <g transform={transform} style={{ pointerEvents: 'none' }}>
          <circle
            cx={cursorPosition.x}
            cy={cursorPosition.y}
            r={0.3}
            fill="none"
            stroke="#dc2626"
            strokeWidth={0.05}
          />
          <line
            x1={cursorPosition.x - 0.2}
            y1={cursorPosition.y - 0.2}
            x2={cursorPosition.x + 0.2}
            y2={cursorPosition.y + 0.2}
            stroke="#dc2626"
            strokeWidth={0.05}
          />
          <line
            x1={cursorPosition.x + 0.2}
            y1={cursorPosition.y - 0.2}
            x2={cursorPosition.x - 0.2}
            y2={cursorPosition.y + 0.2}
            stroke="#dc2626"
            strokeWidth={0.05}
          />
        </g>
      )}

      {/* Instructions overlay */}
      <g style={{ pointerEvents: 'none' }}>
        <rect x={10} y={10} width={280} height={100} rx={8} fill="white" fillOpacity={0.95} />

        <text x={20} y={30} fontSize={12} fill="#1e293b" fontWeight={600}>
          Placing {markingName}
        </text>

        <text x={20} y={48} fontSize={11} fill="#64748b">
          {nearestRoad ? 'Click to place on road' : 'Move cursor near a road'}
        </text>

        <text x={20} y={65} fontSize={11} fill="#64748b">
          Scroll wheel: adjust offset • R: rotate
        </text>

        <text x={20} y={82} fontSize={11} fill="#64748b">
          Escape to cancel
        </text>

        <text x={20} y={99} fontSize={10} fill="#94a3b8">
          Offset: {lateralOffset.toFixed(1)}m • Rotation: {rotation}°
        </text>
      </g>
    </g>
  );
});

export default MarkingPlacer;
