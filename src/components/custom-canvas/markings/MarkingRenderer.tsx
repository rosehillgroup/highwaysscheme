'use client';

import React, { memo, useMemo } from 'react';
import type { RoadMarking, CanvasViewport, RoadSegment } from '@/types/canvas';
import { getMarkingPath } from '@/lib/canvas/markingPatterns';
import { pointAtChainage } from '@/lib/canvas/roadGeometry';
import markingsData from '@/data/markings.json';

interface MarkingRendererProps {
  marking: RoadMarking;
  road: RoadSegment | null;
  viewport: CanvasViewport;
  isSelected: boolean;
  isHovered: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

// Get marking definition from data
function getMarkingDefinition(type: string) {
  return markingsData.markings.find((m) => m.id === type);
}

/**
 * MarkingRenderer - Renders a single road marking on the canvas
 *
 * Supports:
 * - Symbol markings (arrows, give way, cycle symbols)
 * - Pattern markings (zebra crossing, box junction)
 * - Linear markings (centre lines, edge lines)
 */
const MarkingRenderer = memo(function MarkingRenderer({
  marking,
  road,
  viewport,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: MarkingRendererProps) {
  const pixelsPerMetre = 100 * viewport.zoom;
  const definition = getMarkingDefinition(marking.type);

  // Calculate position on road
  const position = useMemo(() => {
    if (!road || road.points.length < 2) return null;

    const roadPoint = pointAtChainage(road.points, marking.position.s);
    if (!roadPoint) return null;

    // Apply lateral offset
    const offset = marking.position.t;
    return {
      x: roadPoint.point.x + roadPoint.normal.x * offset,
      y: roadPoint.point.y + roadPoint.normal.y * offset,
      angle: Math.atan2(roadPoint.tangent.y, roadPoint.tangent.x) * (180 / Math.PI) + 90,
    };
  }, [road, marking.position]);

  // Get marking path data
  const markingPath = useMemo(() => {
    if (!definition) return null;
    return getMarkingPath(
      marking.type,
      definition.width,
      definition.height
    );
  }, [marking.type, definition]);

  if (!position || !markingPath || !definition) return null;

  const transform = `
    translate(${-viewport.pan.x * pixelsPerMetre}, ${-viewport.pan.y * pixelsPerMetre})
    scale(${pixelsPerMetre})
  `;

  const markingTransform = `
    translate(${position.x}, ${position.y})
    rotate(${position.angle + (marking.rotation || 0)})
  `;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(marking.id);
  };

  const handleMouseEnter = () => {
    onHover?.(marking.id);
  };

  const handleMouseLeave = () => {
    onHover?.(null);
  };

  return (
    <g
      className="road-marking"
      transform={transform}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: 'pointer' }}
    >
      <g transform={markingTransform}>
        {/* Selection highlight */}
        {isSelected && (
          <circle
            cx={0}
            cy={0}
            r={Math.max(markingPath.width, markingPath.height) * 0.7}
            fill="none"
            stroke="#FF6B35"
            strokeWidth={0.1}
            strokeOpacity={0.5}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Render based on marking type */}
        {markingPath.type === 'symbol' && markingPath.path && (
          <path
            d={markingPath.path}
            fill={markingPath.fill || '#ffffff'}
            stroke={markingPath.stroke}
            strokeWidth={markingPath.strokeWidth}
            opacity={isHovered ? 1 : 0.95}
          />
        )}

        {markingPath.type === 'pattern' && markingPath.paths && (
          <g>
            {markingPath.paths.map((path, i) => (
              <path
                key={i}
                d={path}
                fill={markingPath.fill || '#ffffff'}
                opacity={isHovered ? 1 : 0.95}
              />
            ))}
          </g>
        )}

        {markingPath.type === 'pattern' && markingPath.lines && (
          <g>
            {/* Background for box junction */}
            {marking.type === 'box-junction' && (
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
                opacity={isHovered ? 1 : 0.9}
              />
            ))}
          </g>
        )}

        {/* Hover highlight */}
        {isHovered && !isSelected && (
          <circle
            cx={0}
            cy={0}
            r={Math.max(markingPath.width, markingPath.height) * 0.6}
            fill="#FF6B35"
            fillOpacity={0.2}
            style={{ pointerEvents: 'none' }}
          />
        )}
      </g>
    </g>
  );
});

export default MarkingRenderer;

// ============================================================================
// Markings Layer Component
// ============================================================================

interface MarkingsLayerProps {
  markings: Record<string, RoadMarking>;
  roads: Record<string, RoadSegment>;
  viewport: CanvasViewport;
  selectedMarkingId: string | null;
  hoveredMarkingId: string | null;
  onSelectMarking?: (id: string | null) => void;
  onHoverMarking?: (id: string | null) => void;
}

export const MarkingsLayer = memo(function MarkingsLayer({
  markings,
  roads,
  viewport,
  selectedMarkingId,
  hoveredMarkingId,
  onSelectMarking,
  onHoverMarking,
}: MarkingsLayerProps) {
  return (
    <g className="markings-layer">
      {Object.values(markings).map((marking) => {
        const road = roads[marking.roadSegmentId] || null;

        return (
          <MarkingRenderer
            key={marking.id}
            marking={marking}
            road={road}
            viewport={viewport}
            isSelected={selectedMarkingId === marking.id}
            isHovered={hoveredMarkingId === marking.id}
            onSelect={onSelectMarking}
            onHover={onHoverMarking}
          />
        );
      })}
    </g>
  );
});
