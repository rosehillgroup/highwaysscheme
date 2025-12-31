'use client';

import React, { useState, useCallback, useEffect, memo } from 'react';
import type { CanvasPoint, CanvasViewport, BezierControlPoint } from '@/types/canvas';
import {
  pointsToBezierControlPoints,
  roadToSvgPath,
  roadSurfaceToSvgPath,
  vectorDistance,
} from '@/lib/canvas/roadGeometry';

interface RoadDrawerProps {
  viewport: CanvasViewport;
  roadWidth: number;
  gridSize: number;
  snapToGrid: boolean;
  onComplete: (points: BezierControlPoint[], width: number) => void;
  onCancel: () => void;
}

/**
 * RoadDrawer - Interactive road drawing tool
 *
 * Usage:
 * - Click to add points
 * - Double-click to finish the road
 * - Press Escape to cancel
 * - Press Backspace/Delete to remove last point
 *
 * Features:
 * - Preview of road as you draw
 * - Snap to grid
 * - Minimum distance between points
 */
const RoadDrawer = memo(function RoadDrawer({
  viewport,
  roadWidth,
  gridSize,
  snapToGrid,
  onComplete,
  onCancel,
}: RoadDrawerProps) {
  const [points, setPoints] = useState<CanvasPoint[]>([]);
  const [cursorPosition, setCursorPosition] = useState<CanvasPoint | null>(null);
  const [isDrawing, setIsDrawing] = useState(true);

  const pixelsPerMetre = 100 * viewport.zoom;
  const minPointDistance = 0.5; // Minimum 0.5m between points

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
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && points.length > 0) {
        e.preventDefault();
        setPoints((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter' && points.length >= 2) {
        e.preventDefault();
        finishDrawing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [points, onCancel]);

  // Finish drawing and create the road
  const finishDrawing = useCallback(() => {
    if (points.length < 2) return;

    // Convert simple points to bezier control points with smooth handles
    const bezierPoints = pointsToBezierControlPoints(points, 0.3);
    onComplete(bezierPoints, roadWidth);
  }, [points, roadWidth, onComplete]);

  // Handle mouse move to update cursor position
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

  // Handle click to add a point
  const handleClick = useCallback(
    (e: React.MouseEvent<SVGGElement>) => {
      if (!isDrawing) return;

      const svg = e.currentTarget.ownerSVGElement;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const canvasPoint = screenToCanvas(e.clientX, e.clientY, rect);

      // Check minimum distance from last point
      if (points.length > 0) {
        const lastPoint = points[points.length - 1];
        if (vectorDistance(lastPoint, canvasPoint) < minPointDistance) {
          return; // Too close to last point
        }
      }

      setPoints((prev) => [...prev, canvasPoint]);
    },
    [isDrawing, screenToCanvas, points, minPointDistance]
  );

  // Handle double-click to finish drawing
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<SVGGElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (points.length >= 2) {
        finishDrawing();
      }
    },
    [points, finishDrawing]
  );

  // Generate preview paths
  const previewPoints = cursorPosition ? [...points, cursorPosition] : points;
  const bezierPreview =
    previewPoints.length >= 2 ? pointsToBezierControlPoints(previewPoints, 0.3) : [];

  const centerPath = bezierPreview.length >= 2 ? roadToSvgPath(bezierPreview) : '';
  const surfacePath =
    bezierPreview.length >= 2 ? roadSurfaceToSvgPath(bezierPreview, roadWidth) : '';

  const transform = `translate(${-viewport.pan.x * pixelsPerMetre}, ${-viewport.pan.y * pixelsPerMetre}) scale(${pixelsPerMetre})`;

  return (
    <g
      className="road-drawer"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: 'crosshair' }}
    >
      {/* Invisible hit area covering the entire canvas */}
      <rect
        x={0}
        y={0}
        width="100%"
        height="100%"
        fill="transparent"
        style={{ pointerEvents: 'all' }}
      />

      {/* Preview road surface */}
      {surfacePath && (
        <g transform={transform}>
          <path
            d={surfacePath}
            fill="#4a4a4a"
            fillOpacity={0.5}
            stroke="none"
            style={{ pointerEvents: 'none' }}
          />

          {/* Preview center line */}
          <path
            d={centerPath}
            fill="none"
            stroke="#FF6B35"
            strokeWidth={0.1}
            strokeDasharray="0.3 0.2"
            style={{ pointerEvents: 'none' }}
          />
        </g>
      )}

      {/* Draw points */}
      <g transform={transform}>
        {points.map((point, i) => (
          <g key={i}>
            {/* Point marker */}
            <circle
              cx={point.x}
              cy={point.y}
              r={0.2}
              fill="#FF6B35"
              stroke="#fff"
              strokeWidth={0.05}
              style={{ pointerEvents: 'none' }}
            />

            {/* Point number */}
            <text
              x={point.x}
              y={point.y - 0.4}
              textAnchor="middle"
              fontSize={0.25}
              fill="#FF6B35"
              fontWeight={600}
              style={{ pointerEvents: 'none' }}
            >
              {i + 1}
            </text>
          </g>
        ))}

        {/* Cursor position indicator */}
        {cursorPosition && (
          <circle
            cx={cursorPosition.x}
            cy={cursorPosition.y}
            r={0.15}
            fill="none"
            stroke="#FF6B35"
            strokeWidth={0.05}
            strokeDasharray="0.1 0.1"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Snap indicator */}
        {cursorPosition && snapToGrid && (
          <g style={{ pointerEvents: 'none' }}>
            <line
              x1={cursorPosition.x - 0.15}
              y1={cursorPosition.y}
              x2={cursorPosition.x + 0.15}
              y2={cursorPosition.y}
              stroke="#FF6B35"
              strokeWidth={0.03}
              opacity={0.5}
            />
            <line
              x1={cursorPosition.x}
              y1={cursorPosition.y - 0.15}
              x2={cursorPosition.x}
              y2={cursorPosition.y + 0.15}
              stroke="#FF6B35"
              strokeWidth={0.03}
              opacity={0.5}
            />
          </g>
        )}
      </g>

      {/* Drawing instructions overlay */}
      <g style={{ pointerEvents: 'none' }}>
        <rect x={10} y={10} width={220} height={70} rx={8} fill="white" fillOpacity={0.95} />

        <text x={20} y={30} fontSize={12} fill="#1e293b" fontWeight={600}>
          Drawing Road ({points.length} points)
        </text>

        <text x={20} y={48} fontSize={11} fill="#64748b">
          Click to add points • Double-click to finish
        </text>

        <text x={20} y={65} fontSize={11} fill="#64748b">
          Backspace to undo • Escape to cancel
        </text>
      </g>
    </g>
  );
});

export default RoadDrawer;
