'use client';

import React, { memo, useMemo } from 'react';
import type { SignagePlacement, CanvasViewport } from '@/types/canvas';
import { getSignPath } from '@/lib/canvas/signagePatterns';
import signageData from '@/data/signage.json';

interface SignageRendererProps {
  sign: SignagePlacement;
  viewport: CanvasViewport;
  isSelected: boolean;
  isHovered: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

// Get sign definition from data
function getSignDefinition(signId: string) {
  return signageData.signs.find((s) => s.id === signId);
}

/**
 * SignageRenderer - Renders a single road sign on the canvas
 *
 * Supports:
 * - Circular signs (regulatory, speed limits)
 * - Triangular signs (warning, give way)
 * - Octagonal signs (stop)
 * - Rectangular signs (information, direction)
 */
const SignageRenderer = memo(function SignageRenderer({
  sign,
  viewport,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: SignageRendererProps) {
  const pixelsPerMetre = 100 * viewport.zoom;
  const definition = getSignDefinition(sign.signType);

  // Get sign path data
  const signPath = useMemo(() => {
    if (!definition) return null;
    return getSignPath(
      sign.signType,
      definition.width,
      definition.height,
      definition.background,
      definition.border,
      definition.borderWidth,
      definition.symbolColor
    );
  }, [sign.signType, definition]);

  if (!signPath || !definition) return null;

  const transform = `
    translate(${-viewport.pan.x * pixelsPerMetre}, ${-viewport.pan.y * pixelsPerMetre})
    scale(${pixelsPerMetre})
  `;

  const signTransform = `
    translate(${sign.position.x}, ${sign.position.y})
    rotate(${sign.rotation || 0})
  `;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(sign.id);
  };

  const handleMouseEnter = () => {
    onHover?.(sign.id);
  };

  const handleMouseLeave = () => {
    onHover?.(null);
  };

  // Calculate selection ring size
  const selectionRadius = Math.max(signPath.width, signPath.height) * 0.6;

  return (
    <g
      className="road-sign"
      transform={transform}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: 'pointer' }}
    >
      <g transform={signTransform}>
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

        {/* Sign post (simplified) */}
        <rect
          x={-0.025}
          y={0}
          width={0.05}
          height={signPath.height * 0.8}
          fill="#6b7280"
        />

        {/* Sign background */}
        <g transform={`translate(0, ${-signPath.height * 0.3})`}>
          {signPath.path && (
            <path
              d={signPath.path}
              fill={signPath.background}
              stroke={signPath.border}
              strokeWidth={signPath.borderWidth}
              opacity={isHovered ? 1 : 0.95}
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
            />
          )}

          {/* Text (for speed limits, STOP, etc.) */}
          {signPath.text && (
            <text
              x={0}
              y={signPath.text.includes('\n') ? -signPath.textSize! * 0.3 : signPath.textSize! * 0.35}
              textAnchor="middle"
              fill={signPath.symbolColor}
              fontSize={signPath.textSize}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              style={{ pointerEvents: 'none' }}
            >
              {signPath.text.split('\n').map((line, i) => (
                <tspan key={i} x={0} dy={i === 0 ? 0 : signPath.textSize! * 0.9}>
                  {line}
                </tspan>
              ))}
            </text>
          )}
        </g>

        {/* Hover highlight */}
        {isHovered && !isSelected && (
          <circle
            cx={0}
            cy={-signPath.height * 0.3}
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

export default SignageRenderer;

// ============================================================================
// Signage Layer Component
// ============================================================================

interface SignageLayerProps {
  signage: Record<string, SignagePlacement>;
  viewport: CanvasViewport;
  selectedSignId: string | null;
  hoveredSignId: string | null;
  onSelectSign?: (id: string | null) => void;
  onHoverSign?: (id: string | null) => void;
}

export const SignageLayer = memo(function SignageLayer({
  signage,
  viewport,
  selectedSignId,
  hoveredSignId,
  onSelectSign,
  onHoverSign,
}: SignageLayerProps) {
  return (
    <g className="signage-layer">
      {Object.values(signage).map((sign) => (
        <SignageRenderer
          key={sign.id}
          sign={sign}
          viewport={viewport}
          isSelected={selectedSignId === sign.id}
          isHovered={hoveredSignId === sign.id}
          onSelect={onSelectSign}
          onHover={onHoverSign}
        />
      ))}
    </g>
  );
});
