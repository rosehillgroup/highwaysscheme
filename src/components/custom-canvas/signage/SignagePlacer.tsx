'use client';

import React, { useState, useCallback, useEffect, memo, useMemo } from 'react';
import type { CanvasPoint, CanvasViewport, SignType } from '@/types/canvas';
import { getSignPath } from '@/lib/canvas/signagePatterns';
import signageData from '@/data/signage.json';

interface SignagePlacerProps {
  viewport: CanvasViewport;
  signType: SignType;
  gridSize: number;
  snapToGrid: boolean;
  onPlace: (position: CanvasPoint, rotation: number) => void;
  onCancel: () => void;
}

// Get sign definition from data
function getSignDefinition(signId: string) {
  return signageData.signs.find((s) => s.id === signId);
}

/**
 * SignagePlacer - Interactive sign placement tool
 *
 * Usage:
 * - Move mouse to position sign
 * - Click to place
 * - R key to rotate
 * - Escape to cancel
 */
const SignagePlacer = memo(function SignagePlacer({
  viewport,
  signType,
  gridSize,
  snapToGrid,
  onPlace,
  onCancel,
}: SignagePlacerProps) {
  const [cursorPosition, setCursorPosition] = useState<CanvasPoint | null>(null);
  const [rotation, setRotation] = useState(0);

  const pixelsPerMetre = 100 * viewport.zoom;
  const definition = getSignDefinition(signType);

  const signPath = useMemo(() => {
    if (!definition) return null;
    return getSignPath(
      signType,
      definition.width,
      definition.height,
      definition.background,
      definition.border,
      definition.borderWidth,
      definition.symbolColor
    );
  }, [signType, definition]);

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

  const signName = definition?.name || 'Sign';

  return (
    <g
      className="signage-placer"
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

      {/* Preview sign */}
      {cursorPosition && signPath && (
        <g transform={transform} style={{ pointerEvents: 'none' }}>
          <g transform={`translate(${cursorPosition.x}, ${cursorPosition.y}) rotate(${rotation})`}>
            {/* Sign post preview */}
            <rect
              x={-0.025}
              y={0}
              width={0.05}
              height={signPath.height * 0.8}
              fill="#6b7280"
              opacity={0.7}
            />

            {/* Sign background */}
            <g transform={`translate(0, ${-signPath.height * 0.3})`}>
              {signPath.path && (
                <path
                  d={signPath.path}
                  fill={signPath.background}
                  stroke={signPath.border}
                  strokeWidth={signPath.borderWidth}
                  opacity={0.7}
                />
              )}

              {/* Symbol path */}
              {signPath.symbolPath && (
                <path
                  d={signPath.symbolPath}
                  fill={signPath.symbolColor}
                  stroke={signPath.symbolColor}
                  strokeWidth={0.02}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.7}
                />
              )}

              {/* Text */}
              {signPath.text && (
                <text
                  x={0}
                  y={signPath.text.includes('\n') ? -signPath.textSize! * 0.3 : signPath.textSize! * 0.35}
                  textAnchor="middle"
                  fill={signPath.symbolColor}
                  fontSize={signPath.textSize}
                  fontWeight="bold"
                  fontFamily="Arial, sans-serif"
                  opacity={0.7}
                >
                  {signPath.text.split('\n').map((line, i) => (
                    <tspan key={i} x={0} dy={i === 0 ? 0 : signPath.textSize! * 0.9}>
                      {line}
                    </tspan>
                  ))}
                </text>
              )}
            </g>

            {/* Placement indicator */}
            <circle
              cx={0}
              cy={0}
              r={0.15}
              fill="#FF6B35"
              stroke="#fff"
              strokeWidth={0.04}
            />
          </g>
        </g>
      )}

      {/* Instructions overlay */}
      <g style={{ pointerEvents: 'none' }}>
        <rect x={10} y={10} width={250} height={85} rx={8} fill="white" fillOpacity={0.95} />

        <text x={20} y={30} fontSize={12} fill="#1e293b" fontWeight={600}>
          Placing {signName}
        </text>

        <text x={20} y={48} fontSize={11} fill="#64748b">
          Click to place sign
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

export default SignagePlacer;
