'use client';

import React, { memo } from 'react';
import type { CanvasViewport } from '@/types/canvas';

interface CanvasGridProps {
  viewport: CanvasViewport;
  gridSize: number;
  containerWidth: number;
  containerHeight: number;
}

/**
 * CanvasGrid - Renders a background grid for the custom canvas
 *
 * Features:
 * - Responsive to zoom level (shows finer grid at higher zoom)
 * - Major and minor grid lines
 * - Origin marker
 */
const CanvasGrid = memo(function CanvasGrid({
  viewport,
  gridSize,
  containerWidth,
  containerHeight,
}: CanvasGridProps) {
  const pixelsPerMetre = 100 * viewport.zoom;

  // Calculate visible bounds in canvas coordinates (metres)
  const visibleLeft = viewport.pan.x;
  const visibleTop = viewport.pan.y;
  const visibleWidth = containerWidth / pixelsPerMetre;
  const visibleHeight = containerHeight / pixelsPerMetre;

  // Determine grid spacing based on zoom
  // At low zoom, use larger grid; at high zoom, use smaller grid
  let effectiveGridSize = gridSize;
  if (viewport.zoom < 0.5) {
    effectiveGridSize = gridSize * 10; // 10m grid at low zoom
  } else if (viewport.zoom > 2) {
    effectiveGridSize = gridSize * 0.5; // 0.5m grid at high zoom
  }

  // Major grid is 10x the effective grid size
  const majorGridSize = effectiveGridSize * 10;

  // Calculate grid line positions
  const startX = Math.floor(visibleLeft / effectiveGridSize) * effectiveGridSize;
  const endX = Math.ceil((visibleLeft + visibleWidth) / effectiveGridSize) * effectiveGridSize;
  const startY = Math.floor(visibleTop / effectiveGridSize) * effectiveGridSize;
  const endY = Math.ceil((visibleTop + visibleHeight) / effectiveGridSize) * effectiveGridSize;

  // Generate grid lines
  const minorLines: React.ReactElement[] = [];
  const majorLines: React.ReactElement[] = [];

  // Vertical lines
  for (let x = startX; x <= endX; x += effectiveGridSize) {
    const screenX = (x - viewport.pan.x) * pixelsPerMetre;
    const isMajor = Math.abs(x % majorGridSize) < 0.001;

    if (isMajor) {
      majorLines.push(
        <line
          key={`v-major-${x}`}
          x1={screenX}
          y1={0}
          x2={screenX}
          y2={containerHeight}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
      );
    } else {
      minorLines.push(
        <line
          key={`v-minor-${x}`}
          x1={screenX}
          y1={0}
          x2={screenX}
          y2={containerHeight}
          stroke="#e2e8f0"
          strokeWidth={0.5}
        />
      );
    }
  }

  // Horizontal lines
  for (let y = startY; y <= endY; y += effectiveGridSize) {
    const screenY = (y - viewport.pan.y) * pixelsPerMetre;
    const isMajor = Math.abs(y % majorGridSize) < 0.001;

    if (isMajor) {
      majorLines.push(
        <line
          key={`h-major-${y}`}
          x1={0}
          y1={screenY}
          x2={containerWidth}
          y2={screenY}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
      );
    } else {
      minorLines.push(
        <line
          key={`h-minor-${y}`}
          x1={0}
          y1={screenY}
          x2={containerWidth}
          y2={screenY}
          stroke="#e2e8f0"
          strokeWidth={0.5}
        />
      );
    }
  }

  // Origin marker (if visible)
  const originScreenX = -viewport.pan.x * pixelsPerMetre;
  const originScreenY = -viewport.pan.y * pixelsPerMetre;
  const showOrigin =
    originScreenX >= -20 &&
    originScreenX <= containerWidth + 20 &&
    originScreenY >= -20 &&
    originScreenY <= containerHeight + 20;

  return (
    <g className="canvas-grid">
      {/* Minor grid lines */}
      <g className="minor-grid" opacity={0.5}>
        {minorLines}
      </g>

      {/* Major grid lines */}
      <g className="major-grid">{majorLines}</g>

      {/* Origin marker */}
      {showOrigin && (
        <g className="origin-marker">
          {/* Origin cross */}
          <line
            x1={originScreenX - 10}
            y1={originScreenY}
            x2={originScreenX + 10}
            y2={originScreenY}
            stroke="#FF6B35"
            strokeWidth={2}
          />
          <line
            x1={originScreenX}
            y1={originScreenY - 10}
            x2={originScreenX}
            y2={originScreenY + 10}
            stroke="#FF6B35"
            strokeWidth={2}
          />
          {/* Origin label */}
          <text
            x={originScreenX + 15}
            y={originScreenY - 5}
            fill="#FF6B35"
            fontSize={12}
            fontWeight={600}
          >
            0,0
          </text>
        </g>
      )}
    </g>
  );
});

export default CanvasGrid;
