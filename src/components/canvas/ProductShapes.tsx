'use client';

import type { Product, ProductCategory } from '@/types';

interface ProductShapeProps {
  product: Product;
  width: number;   // Rendered width in pixels
  height: number;  // Rendered height in pixels
  rotation?: number;
  selected?: boolean;
  color?: string;
}

/**
 * Render accurate SVG silhouettes for each product type
 */
export function ProductShape({
  product,
  width,
  height,
  rotation = 0,
  selected = false,
  color,
}: ProductShapeProps) {
  const fill = color || getCategoryColor(product.category);
  const stroke = selected ? '#2563eb' : '#1e293b';
  const strokeWidth = selected ? 2 : 1;

  // All shapes are rendered in a normalized coordinate system
  // and scaled to the actual width/height
  const transform = `rotate(${rotation} ${width / 2} ${height / 2})`;

  switch (product.category) {
    case 'speed-cushion':
      return (
        <SpeedCushionShape
          width={width}
          height={height}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          transform={transform}
          heightMm={product.dimensions.height}
        />
      );

    case 'island':
    case 'refuge':
      return (
        <IslandShape
          width={width}
          height={height}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          transform={transform}
          isRefuge={product.category === 'refuge'}
        />
      );

    case 'ncld':
      return (
        <NCLDShape
          width={width}
          height={height}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          transform={transform}
          isLite={product.id.includes('lite')}
        />
      );

    case 'lane-separator':
      return (
        <LaneSeparatorShape
          width={width}
          height={height}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          transform={transform}
        />
      );

    case 'raised-table':
      return (
        <RaisedTableShape
          width={width}
          height={height}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          transform={transform}
        />
      );

    default:
      return (
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          transform={transform}
        />
      );
  }
}

// Speed cushion with ramped profile
function SpeedCushionShape({
  width,
  height,
  fill,
  stroke,
  strokeWidth,
  transform,
  heightMm,
}: {
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  transform: string;
  heightMm: number;
}) {
  // Ramp proportion based on height
  const rampRatio = heightMm >= 75 ? 0.15 : 0.12;
  const rampW = width * rampRatio;
  const rampH = height * rampRatio;

  const path = `
    M ${rampW} 0
    L ${width - rampW} 0
    Q ${width} 0 ${width} ${rampH}
    L ${width} ${height - rampH}
    Q ${width} ${height} ${width - rampW} ${height}
    L ${rampW} ${height}
    Q 0 ${height} 0 ${height - rampH}
    L 0 ${rampH}
    Q 0 0 ${rampW} 0
    Z
  `;

  return (
    <g transform={transform}>
      <path d={path} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      {/* Direction arrow indicator */}
      <path
        d={`M ${width * 0.4} ${height * 0.3} L ${width * 0.5} ${height * 0.2} L ${width * 0.6} ${height * 0.3}`}
        fill="none"
        stroke={stroke}
        strokeWidth={1}
        opacity={0.5}
      />
    </g>
  );
}

// Traffic island / pedestrian refuge with domed top
function IslandShape({
  width,
  height,
  fill,
  stroke,
  strokeWidth,
  transform,
  isRefuge,
}: {
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  transform: string;
  isRefuge: boolean;
}) {
  const cornerR = Math.min(width, height) * 0.15;

  return (
    <g transform={transform}>
      {/* Main body */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={cornerR}
        ry={cornerR}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {/* Kerb edge indication */}
      <rect
        x={strokeWidth}
        y={strokeWidth}
        width={width - strokeWidth * 2}
        height={height - strokeWidth * 2}
        rx={cornerR - 2}
        ry={cornerR - 2}
        fill="none"
        stroke="#ffffff"
        strokeWidth={1}
        opacity={0.3}
      />
      {/* Refuge crossing indication */}
      {isRefuge && (
        <>
          <line
            x1={width * 0.3}
            y1={height * 0.5}
            x2={width * 0.7}
            y2={height * 0.5}
            stroke="#ffffff"
            strokeWidth={2}
            strokeDasharray="4 2"
            opacity={0.6}
          />
        </>
      )}
    </g>
  );
}

// NCLD defender unit - trapezoid profile
function NCLDShape({
  width,
  height,
  fill,
  stroke,
  strokeWidth,
  transform,
  isLite,
}: {
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  transform: string;
  isLite: boolean;
}) {
  // Trapezoid shape - narrower at top
  const topInset = height * 0.15;

  const path = `
    M ${topInset} 0
    L ${width - topInset} 0
    L ${width} ${height}
    L 0 ${height}
    Z
  `;

  return (
    <g transform={transform}>
      <path d={path} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      {/* End piece indicator */}
      <rect
        x={width * 0.05}
        y={height * 0.1}
        width={width * 0.1}
        height={height * 0.8}
        fill="#ffffff"
        opacity={0.2}
        rx={2}
      />
      {isLite && (
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={Math.min(width, height) * 0.3}
          fill="#ffffff"
          opacity={0.5}
        >
          L
        </text>
      )}
    </g>
  );
}

// Lane separator with curved ends
function LaneSeparatorShape({
  width,
  height,
  fill,
  stroke,
  strokeWidth,
  transform,
}: {
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  transform: string;
}) {
  const curveDepth = width * 0.1;

  const path = `
    M 0 ${height * 0.2}
    Q ${curveDepth} 0 ${width * 0.2} 0
    L ${width * 0.8} 0
    Q ${width - curveDepth} 0 ${width} ${height * 0.2}
    L ${width} ${height * 0.8}
    Q ${width - curveDepth} ${height} ${width * 0.8} ${height}
    L ${width * 0.2} ${height}
    Q ${curveDepth} ${height} 0 ${height * 0.8}
    Z
  `;

  return (
    <g transform={transform}>
      <path d={path} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    </g>
  );
}

// Raised table with grid pattern
function RaisedTableShape({
  width,
  height,
  fill,
  stroke,
  strokeWidth,
  transform,
}: {
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  transform: string;
}) {
  const rampW = width * 0.1;

  return (
    <g transform={transform}>
      {/* Main body */}
      <rect
        x={rampW}
        y={0}
        width={width - rampW * 2}
        height={height}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {/* Entry ramp */}
      <polygon
        points={`0,${height} ${rampW},0 ${rampW},${height}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={0.8}
      />
      {/* Exit ramp */}
      <polygon
        points={`${width},${height} ${width - rampW},0 ${width - rampW},${height}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={0.8}
      />
      {/* Grid pattern */}
      {Array.from({ length: 3 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1={rampW}
          y1={height * ((i + 1) / 4)}
          x2={width - rampW}
          y2={height * ((i + 1) / 4)}
          stroke="#ffffff"
          strokeWidth={1}
          opacity={0.2}
        />
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={rampW + (width - rampW * 2) * ((i + 1) / 6)}
          y1={0}
          x2={rampW + (width - rampW * 2) * ((i + 1) / 6)}
          y2={height}
          stroke="#ffffff"
          strokeWidth={1}
          opacity={0.2}
        />
      ))}
    </g>
  );
}

// Get default color for product category
function getCategoryColor(category: ProductCategory): string {
  switch (category) {
    case 'speed-cushion':
      return '#1e1e1e'; // Black rubber
    case 'island':
      return '#334155'; // Dark slate
    case 'refuge':
      return '#374151'; // Gray
    case 'ncld':
      return '#1e293b'; // Dark blue-gray
    case 'lane-separator':
      return '#27272a'; // Zinc
    case 'raised-table':
      return '#292524'; // Stone
    default:
      return '#475569';
  }
}

export { getCategoryColor };
