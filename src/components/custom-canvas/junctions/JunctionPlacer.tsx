'use client';

import React, { useState, useCallback, useEffect, memo } from 'react';
import type { CanvasPoint, CanvasViewport, JunctionType } from '@/types/canvas';
import {
  generateTJunctionPath,
  generateCrossroadsPath,
  generateRoundaboutPath,
  generateRoundaboutApproaches,
  getRoundaboutDimensions,
  getJunctionSize,
} from '@/lib/canvas/junctionGeometry';

interface JunctionPlacerProps {
  viewport: CanvasViewport;
  junctionType: JunctionType;
  roadWidth: number;
  gridSize: number;
  snapToGrid: boolean;
  onPlace: (position: CanvasPoint, rotation: number) => void;
  onCancel: () => void;
}

/**
 * JunctionPlacer - Interactive junction placement tool
 *
 * Usage:
 * - Move mouse to position junction
 * - Scroll wheel or R key to rotate
 * - Click to place
 * - Escape to cancel
 */
const JunctionPlacer = memo(function JunctionPlacer({
  viewport,
  junctionType,
  roadWidth,
  gridSize,
  snapToGrid,
  onPlace,
  onCancel,
}: JunctionPlacerProps) {
  const [position, setPosition] = useState<CanvasPoint | null>(null);
  const [rotation, setRotation] = useState(0);

  const pixelsPerMetre = 100 * viewport.zoom;

  // Snap point to grid if enabled
  const snapPoint = useCallback(
    (point: CanvasPoint): CanvasPoint => {
      if (!snapToGrid) return point;
      return {
        x: Math.round(point.x / gridSize) * gridSize,
        y: Math.round(point.y / gridSize) * gridSize,
      };
    },
    [snapToGrid, gridSize]
  );

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number, containerRect: DOMRect): CanvasPoint => {
      const relX = screenX - containerRect.left;
      const relY = screenY - containerRect.top;

      return snapPoint({
        x: relX / pixelsPerMetre + viewport.pan.x,
        y: relY / pixelsPerMetre + viewport.pan.y,
      });
    },
    [viewport, pixelsPerMetre, snapPoint]
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
      } else if (e.key === 'Enter' && position) {
        e.preventDefault();
        onPlace(position, rotation);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [position, rotation, onPlace, onCancel]);

  // Handle mouse move to update position
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGGElement>) => {
      const svg = e.currentTarget.ownerSVGElement;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const canvasPoint = screenToCanvas(e.clientX, e.clientY, rect);
      setPosition(canvasPoint);
    },
    [screenToCanvas]
  );

  // Handle click to place junction
  const handleClick = useCallback(
    (e: React.MouseEvent<SVGGElement>) => {
      if (!position) return;

      e.preventDefault();
      e.stopPropagation();
      onPlace(position, rotation);
    },
    [position, rotation, onPlace]
  );

  // Handle wheel to rotate
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 15 : -15;
    setRotation((prev) => (prev + delta + 360) % 360);
  }, []);

  // Generate preview path
  const previewPath = position
    ? (() => {
        switch (junctionType) {
          case 't-junction':
            return { type: 'simple', surface: generateTJunctionPath(position, rotation, roadWidth) };
          case 'crossroads':
            return { type: 'simple', surface: generateCrossroadsPath(position, rotation, roadWidth) };
          case 'roundabout':
          case 'mini-roundabout': {
            const dims = getRoundaboutDimensions(junctionType, roadWidth);
            const { outerPath, innerPath } = generateRoundaboutPath(position, dims.outerRadius, dims.innerRadius);
            const approaches = generateRoundaboutApproaches(position, rotation, dims.outerRadius, roadWidth, 4);
            return { type: 'roundabout', outerPath, innerPath, approaches, dims };
          }
          default:
            return { type: 'simple', surface: '' };
        }
      })()
    : null;

  const transform = `translate(${-viewport.pan.x * pixelsPerMetre}, ${-viewport.pan.y * pixelsPerMetre}) scale(${pixelsPerMetre})`;

  const junctionLabel = {
    't-junction': 'T-Junction',
    'crossroads': 'Crossroads',
    'roundabout': 'Roundabout',
    'mini-roundabout': 'Mini Roundabout',
    'staggered': 'Staggered Junction',
  }[junctionType] || 'Junction';

  return (
    <g
      className="junction-placer"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onWheel={handleWheel}
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

      {/* Preview junction */}
      {previewPath && position && (
        <g transform={transform} style={{ pointerEvents: 'none' }}>
          {previewPath.type === 'simple' && previewPath.surface && (
            <>
              <path
                d={previewPath.surface}
                fill="#4a4a4a"
                fillOpacity={0.6}
                stroke="#FF6B35"
                strokeWidth={0.1}
                strokeDasharray="0.2 0.1"
              />
            </>
          )}

          {previewPath.type === 'roundabout' && (
            <>
              {/* Approach roads */}
              {previewPath.approaches?.map((approachPath, i) => (
                <path
                  key={`approach-${i}`}
                  d={approachPath}
                  fill="#4a4a4a"
                  fillOpacity={0.5}
                />
              ))}

              {/* Outer circle */}
              <path
                d={previewPath.outerPath}
                fill="#4a4a4a"
                fillOpacity={0.6}
                stroke="#FF6B35"
                strokeWidth={0.1}
                strokeDasharray="0.2 0.1"
              />

              {/* Inner island */}
              {previewPath.innerPath && (
                <path
                  d={previewPath.innerPath}
                  fill="#6b8e23"
                  fillOpacity={0.6}
                />
              )}

              {/* Mini roundabout center */}
              {junctionType === 'mini-roundabout' && (
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={roadWidth * 0.4}
                  fill="none"
                  stroke="#FF6B35"
                  strokeWidth={0.1}
                  strokeDasharray="0.2 0.1"
                />
              )}
            </>
          )}

          {/* Center marker */}
          <circle
            cx={position.x}
            cy={position.y}
            r={0.2}
            fill="#FF6B35"
            stroke="#fff"
            strokeWidth={0.05}
          />

          {/* Rotation indicator */}
          <line
            x1={position.x}
            y1={position.y}
            x2={position.x + Math.cos((rotation * Math.PI) / 180) * roadWidth}
            y2={position.y + Math.sin((rotation * Math.PI) / 180) * roadWidth}
            stroke="#FF6B35"
            strokeWidth={0.08}
            markerEnd="url(#arrowhead)"
          />

          {/* Snap indicator */}
          {snapToGrid && (
            <g opacity={0.5}>
              <line
                x1={position.x - 0.2}
                y1={position.y}
                x2={position.x + 0.2}
                y2={position.y}
                stroke="#FF6B35"
                strokeWidth={0.03}
              />
              <line
                x1={position.x}
                y1={position.y - 0.2}
                x2={position.x}
                y2={position.y + 0.2}
                stroke="#FF6B35"
                strokeWidth={0.03}
              />
            </g>
          )}
        </g>
      )}

      {/* Arrow marker definition */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#FF6B35"
          />
        </marker>
      </defs>

      {/* Instructions overlay */}
      <g style={{ pointerEvents: 'none' }}>
        <rect x={10} y={10} width={260} height={85} rx={8} fill="white" fillOpacity={0.95} />

        <text x={20} y={30} fontSize={12} fill="#1e293b" fontWeight={600}>
          Placing {junctionLabel}
        </text>

        <text x={20} y={48} fontSize={11} fill="#64748b">
          Click to place • Scroll wheel or R to rotate
        </text>

        <text x={20} y={65} fontSize={11} fill="#64748b">
          Escape to cancel
        </text>

        <text x={20} y={82} fontSize={10} fill="#94a3b8">
          Rotation: {rotation}°
        </text>
      </g>
    </g>
  );
});

export default JunctionPlacer;
