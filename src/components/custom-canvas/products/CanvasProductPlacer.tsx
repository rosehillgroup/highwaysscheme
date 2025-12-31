'use client';

import React, { useState, useCallback, useEffect, memo, useMemo } from 'react';
import type { CanvasPoint, CanvasViewport } from '@/types/canvas';
import { getProductPath } from '@/lib/canvas/productPatterns';
import productsData from '@/data/products.json';

interface CanvasProductPlacerProps {
  viewport: CanvasViewport;
  productId: string;
  variantId?: string;
  gridSize: number;
  snapToGrid: boolean;
  onPlace: (position: CanvasPoint, rotation: number) => void;
  onCancel: () => void;
}

// Get product definition from data
function getProductDefinition(productId: string) {
  return productsData.products.find((p) => p.id === productId);
}

// Get variant definition
function getVariantDefinition(productId: string, variantId: string) {
  const product = getProductDefinition(productId);
  if (!product || !product.variants) return null;
  return product.variants.find((v) => v.id === variantId);
}

/**
 * CanvasProductPlacer - Interactive product placement tool
 *
 * Usage:
 * - Move mouse to position product
 * - Click to place
 * - R key to rotate (45-degree increments)
 * - Escape to cancel
 */
const CanvasProductPlacer = memo(function CanvasProductPlacer({
  viewport,
  productId,
  variantId,
  gridSize,
  snapToGrid,
  onPlace,
  onCancel,
}: CanvasProductPlacerProps) {
  const [cursorPosition, setCursorPosition] = useState<CanvasPoint | null>(null);
  const [rotation, setRotation] = useState(0);

  const pixelsPerMetre = 100 * viewport.zoom;
  const definition = getProductDefinition(productId);

  // Get dimensions from variant if specified
  const dimensions = useMemo(() => {
    if (variantId) {
      const variant = getVariantDefinition(productId, variantId);
      if (variant?.dimensions) return variant.dimensions;
    }
    return definition?.dimensions || { length: 1000, width: 1000, height: 100 };
  }, [productId, variantId, definition]);

  // Get color and arrows from variant
  const variantProps = useMemo(() => {
    if (variantId) {
      const variant = getVariantDefinition(productId, variantId);
      return {
        color: (variant as { color?: 'black' | 'red' })?.color || 'black',
        arrows: (variant as { arrows?: number })?.arrows || 0,
      };
    }
    return { color: 'black' as const, arrows: 0 };
  }, [productId, variantId]);

  // Generate product path for preview
  const productPath = useMemo(() => {
    if (!definition) return null;
    return getProductPath(
      productId,
      definition.category,
      dimensions,
      variantProps.color,
      variantProps.arrows
    );
  }, [productId, definition, dimensions, variantProps]);

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

  const productName = definition?.name || 'Product';
  const variantName = variantId ? getVariantDefinition(productId, variantId)?.name : null;
  const displayName = variantName ? `${productName} - ${variantName}` : productName;

  return (
    <g
      className="product-placer"
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

      {/* Preview product */}
      {cursorPosition && productPath && (
        <g transform={transform} style={{ pointerEvents: 'none' }}>
          <g transform={`translate(${cursorPosition.x}, ${cursorPosition.y}) rotate(${rotation})`}>
            {/* Product shape preview */}
            <path
              d={productPath.path}
              fill={productPath.fill}
              stroke={productPath.stroke}
              strokeWidth={productPath.strokeWidth}
              opacity={0.7}
            />

            {/* Arrows preview */}
            {productPath.arrows && productPath.arrows.map((arrow, i) => (
              <path
                key={`arrow-${i}`}
                d={arrow}
                fill="#fbbf24"
                opacity={0.7}
              />
            ))}

            {/* Placement indicator */}
            <circle
              cx={0}
              cy={0}
              r={0.1}
              fill="#FF6B35"
              stroke="#fff"
              strokeWidth={0.03}
            />

            {/* Dimension indicators */}
            <line
              x1={-productPath.length / 2}
              y1={productPath.width / 2 + 0.2}
              x2={productPath.length / 2}
              y2={productPath.width / 2 + 0.2}
              stroke="#64748b"
              strokeWidth={0.02}
              markerEnd="url(#arrowhead)"
              markerStart="url(#arrowhead)"
            />
          </g>
        </g>
      )}

      {/* Instructions overlay */}
      <g style={{ pointerEvents: 'none' }}>
        <rect x={10} y={10} width={300} height={100} rx={8} fill="white" fillOpacity={0.95} />

        <text x={20} y={30} fontSize={12} fill="#1e293b" fontWeight={600}>
          Placing: {displayName.length > 35 ? displayName.slice(0, 35) + '...' : displayName}
        </text>

        <text x={20} y={50} fontSize={11} fill="#64748b">
          Click to place
        </text>

        <text x={20} y={68} fontSize={11} fill="#64748b">
          R: rotate ({rotation}°) • Escape: cancel
        </text>

        <text x={20} y={88} fontSize={10} fill="#94a3b8">
          Size: {(dimensions.length / 1000).toFixed(1)}m x {(dimensions.width / 1000).toFixed(1)}m
        </text>
      </g>
    </g>
  );
});

export default CanvasProductPlacer;
