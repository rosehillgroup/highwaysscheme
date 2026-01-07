'use client';

import React, { memo, useMemo } from 'react';
import type { CanvasPoint, CanvasProduct, CanvasViewport } from '@/types/canvas';
import { getProductPath, getHatchingPattern, getZebraCrossingStripes } from '@/lib/canvas/productPatterns';
import productsData from '@/data/products.json';

interface CanvasProductRendererProps {
  product: CanvasProduct;
  viewport: CanvasViewport;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onDragStart?: (id: string, position: { x: number; y: number }, e: React.MouseEvent) => void;
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
 * CanvasProductRenderer - Renders a single product on the canvas
 */
const CanvasProductRenderer = memo(function CanvasProductRenderer({
  product,
  viewport,
  isSelected = false,
  onClick,
  onDragStart,
}: CanvasProductRendererProps) {
  const pixelsPerMetre = 100 * viewport.zoom;
  const definition = getProductDefinition(product.productId);

  // Get dimensions from variant if specified, otherwise use product defaults
  const dimensions = useMemo(() => {
    if (product.variantId) {
      const variant = getVariantDefinition(product.productId, product.variantId);
      if (variant?.dimensions) return variant.dimensions;
    }
    return definition?.dimensions || { length: 1000, width: 1000, height: 100 };
  }, [product.productId, product.variantId, definition]);

  // Get color and arrows from variant
  const variantProps = useMemo(() => {
    if (product.variantId) {
      const variant = getVariantDefinition(product.productId, product.variantId);
      return {
        color: (variant as { color?: 'black' | 'red' })?.color || 'black',
        arrows: (variant as { arrows?: number })?.arrows || 0,
      };
    }
    return { color: 'black' as const, arrows: 0 };
  }, [product.productId, product.variantId]);

  // Generate product path
  const productPath = useMemo(() => {
    if (!definition) return null;
    return getProductPath(
      product.productId,
      definition.category,
      dimensions,
      variantProps.color,
      variantProps.arrows
    );
  }, [product.productId, definition, dimensions, variantProps]);

  if (!definition || !productPath) return null;

  // Get position - handle both road-based and absolute positions
  const position: CanvasPoint = useMemo(() => {
    if ('x' in product.position && 'y' in product.position) {
      return product.position as CanvasPoint;
    }
    // TODO: Convert chainage position to canvas coordinates using road geometry
    // For now, return origin as fallback
    return { x: 0, y: 0 };
  }, [product.position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if already selected and left mouse button
    if (isSelected && e.button === 0 && onDragStart) {
      e.stopPropagation();
      e.preventDefault();
      onDragStart(product.id, position, e);
    }
  };

  const transform = `
    translate(${-viewport.pan.x * pixelsPerMetre}, ${-viewport.pan.y * pixelsPerMetre})
    scale(${pixelsPerMetre})
  `;

  // Additional patterns for specific product types
  const isIslandOrRefuge = definition.category === 'island' || definition.category === 'refuge';
  const isRaisedTable = definition.category === 'raised-table';

  const hatchingPath = isIslandOrRefuge
    ? getHatchingPattern(productPath.width, productPath.length)
    : null;

  const zebraStripes = isRaisedTable
    ? getZebraCrossingStripes(productPath.width, productPath.length)
    : null;

  return (
    <g
      className="canvas-product"
      transform={transform}
      onClick={onClick}
      onMouseDown={handleMouseDown}
      style={{ cursor: isSelected ? 'grab' : onClick ? 'pointer' : 'default' }}
    >
      <g transform={`translate(${position.x}, ${position.y}) rotate(${product.rotation})`}>
        {/* Selection highlight */}
        {isSelected && (
          <rect
            x={-productPath.length / 2 - 0.15}
            y={-productPath.width / 2 - 0.15}
            width={productPath.length + 0.3}
            height={productPath.width + 0.3}
            fill="none"
            stroke="#FF6B35"
            strokeWidth={0.05}
            strokeDasharray="0.1 0.1"
          />
        )}

        {/* Main product shape */}
        <path
          d={productPath.path}
          fill={productPath.fill}
          stroke={productPath.stroke}
          strokeWidth={productPath.strokeWidth}
        />

        {/* Hatching for islands/refuges */}
        {hatchingPath && (
          <path
            d={hatchingPath}
            fill="none"
            stroke="#fbbf24"
            strokeWidth={0.02}
            opacity={0.6}
          />
        )}

        {/* Zebra crossing stripes for raised tables */}
        {zebraStripes && zebraStripes.map((stripe, i) => (
          <path
            key={i}
            d={stripe}
            fill="white"
            stroke="none"
          />
        ))}

        {/* Arrows for speed cushions */}
        {productPath.arrows && productPath.arrows.map((arrow, i) => (
          <path
            key={`arrow-${i}`}
            d={arrow}
            fill="#fbbf24"
            stroke="none"
          />
        ))}

        {/* Centre point indicator */}
        <circle
          cx={0}
          cy={0}
          r={0.05}
          fill={isSelected ? '#FF6B35' : '#1f2937'}
          stroke="#fff"
          strokeWidth={0.02}
        />
      </g>
    </g>
  );
});

interface ProductLayerProps {
  products: Record<string, CanvasProduct>;
  viewport: CanvasViewport;
  selectedIds: string[];
  onSelect?: (id: string) => void;
  onDragStart?: (id: string, position: { x: number; y: number }, e: React.MouseEvent) => void;
}

/**
 * ProductLayer - Renders all products on the canvas
 */
export const ProductLayer = memo(function ProductLayer({
  products,
  viewport,
  selectedIds,
  onSelect,
  onDragStart,
}: ProductLayerProps) {
  const productList = Object.values(products);

  if (productList.length === 0) return null;

  return (
    <g className="product-layer">
      {productList.map((product) => (
        <CanvasProductRenderer
          key={product.id}
          product={product}
          viewport={viewport}
          isSelected={selectedIds.includes(product.id)}
          onClick={onSelect ? (e) => {
            e.stopPropagation();
            onSelect(product.id);
          } : undefined}
          onDragStart={onDragStart}
        />
      ))}
    </g>
  );
});

export default CanvasProductRenderer;
