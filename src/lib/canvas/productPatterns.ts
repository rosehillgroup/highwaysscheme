/**
 * Product Patterns Library
 *
 * SVG patterns for rendering Rosehill products on the custom canvas.
 * Products include speed cushions, traffic islands, cycle lane defenders, etc.
 */

interface ProductDimensions {
  length: number; // mm
  width: number;  // mm
  height: number; // mm
}

interface ProductPathResult {
  path: string;
  width: number;   // metres
  length: number;  // metres
  fill: string;
  stroke: string;
  strokeWidth: number;
  arrows?: string[];  // Arrow SVG paths for speed cushions
}

// Convert mm to metres
const mmToM = (mm: number): number => mm / 1000;

/**
 * Get the SVG path for a product based on its category and dimensions
 */
export function getProductPath(
  productId: string,
  category: string,
  dimensions: ProductDimensions,
  color: 'black' | 'red' = 'black',
  arrows: number = 0
): ProductPathResult {
  const width = mmToM(dimensions.width);
  const length = mmToM(dimensions.length);
  const halfW = width / 2;
  const halfL = length / 2;

  switch (category) {
    case 'speed-cushion':
      return getSpeedCushionPath(halfL, halfW, color, arrows);

    case 'island':
    case 'refuge':
      return getIslandPath(halfL, halfW, dimensions);

    case 'ncld':
      return getNCLDPath(halfL, halfW);

    case 'lane-separator':
      return getLaneSeparatorPath(halfL, halfW);

    case 'raised-table':
      return getRaisedTablePath(halfL, halfW);

    default:
      return getGenericProductPath(halfL, halfW);
  }
}

/**
 * Speed cushion - rounded rectangle with optional arrows
 */
function getSpeedCushionPath(
  halfL: number,
  halfW: number,
  color: 'black' | 'red',
  arrows: number
): ProductPathResult {
  const cornerRadius = 0.1;
  const fill = color === 'red' ? '#b91c1c' : '#1f2937';

  // Main body path
  const path = `
    M ${-halfL + cornerRadius} ${-halfW}
    L ${halfL - cornerRadius} ${-halfW}
    Q ${halfL} ${-halfW} ${halfL} ${-halfW + cornerRadius}
    L ${halfL} ${halfW - cornerRadius}
    Q ${halfL} ${halfW} ${halfL - cornerRadius} ${halfW}
    L ${-halfL + cornerRadius} ${halfW}
    Q ${-halfL} ${halfW} ${-halfL} ${halfW - cornerRadius}
    L ${-halfL} ${-halfW + cornerRadius}
    Q ${-halfL} ${-halfW} ${-halfL + cornerRadius} ${-halfW}
    Z
  `;

  // Generate arrow paths
  const arrowPaths: string[] = [];
  if (arrows > 0) {
    const arrowSize = 0.15;
    const arrowY = 0;

    if (arrows === 1) {
      arrowPaths.push(getArrowPath(0, arrowY, arrowSize));
    } else if (arrows === 2) {
      arrowPaths.push(getArrowPath(-halfL * 0.4, arrowY, arrowSize));
      arrowPaths.push(getArrowPath(halfL * 0.4, arrowY, arrowSize));
    }
  }

  return {
    path,
    width: halfW * 2,
    length: halfL * 2,
    fill,
    stroke: '#fbbf24',  // Yellow border
    strokeWidth: 0.03,
    arrows: arrowPaths,
  };
}

/**
 * Arrow path for speed cushion markings
 */
function getArrowPath(cx: number, cy: number, size: number): string {
  return `
    M ${cx} ${cy - size}
    L ${cx + size * 0.7} ${cy + size * 0.3}
    L ${cx + size * 0.3} ${cy + size * 0.3}
    L ${cx + size * 0.3} ${cy + size}
    L ${cx - size * 0.3} ${cy + size}
    L ${cx - size * 0.3} ${cy + size * 0.3}
    L ${cx - size * 0.7} ${cy + size * 0.3}
    Z
  `;
}

/**
 * Traffic island / pedestrian refuge - rounded rectangle with hatching
 */
function getIslandPath(
  halfL: number,
  halfW: number,
  dimensions: ProductDimensions
): ProductPathResult {
  const isSquare = Math.abs(dimensions.length - dimensions.width) < 100;
  const cornerRadius = isSquare ? 0.15 : 0.1;

  const path = `
    M ${-halfL + cornerRadius} ${-halfW}
    L ${halfL - cornerRadius} ${-halfW}
    Q ${halfL} ${-halfW} ${halfL} ${-halfW + cornerRadius}
    L ${halfL} ${halfW - cornerRadius}
    Q ${halfL} ${halfW} ${halfL - cornerRadius} ${halfW}
    L ${-halfL + cornerRadius} ${halfW}
    Q ${-halfL} ${halfW} ${-halfL} ${halfW - cornerRadius}
    L ${-halfL} ${-halfW + cornerRadius}
    Q ${-halfL} ${-halfW} ${-halfL + cornerRadius} ${-halfW}
    Z
  `;

  return {
    path,
    width: halfW * 2,
    length: halfL * 2,
    fill: '#f3f4f6',     // Light grey
    stroke: '#fbbf24',   // Yellow border
    strokeWidth: 0.05,
  };
}

/**
 * NCLD (Narrow Cycle Lane Defender) - elongated shape
 */
function getNCLDPath(halfL: number, halfW: number): ProductPathResult {
  const taperL = halfL * 0.3;  // Tapered ends
  const innerW = halfW * 0.7;

  const path = `
    M ${-halfL} 0
    L ${-halfL + taperL} ${-halfW}
    L ${halfL - taperL} ${-halfW}
    L ${halfL} 0
    L ${halfL - taperL} ${halfW}
    L ${-halfL + taperL} ${halfW}
    Z
  `;

  return {
    path,
    width: halfW * 2,
    length: halfL * 2,
    fill: '#1f2937',     // Dark grey
    stroke: '#fbbf24',   // Yellow stripe
    strokeWidth: 0.02,
  };
}

/**
 * Lane separator - curved end pieces
 */
function getLaneSeparatorPath(halfL: number, halfW: number): ProductPathResult {
  const curveDepth = halfW * 0.6;

  const path = `
    M ${-halfL} ${-halfW}
    Q ${-halfL + curveDepth} ${-halfW} ${-halfL + curveDepth} 0
    Q ${-halfL + curveDepth} ${halfW} ${-halfL} ${halfW}
    L ${halfL} ${halfW}
    Q ${halfL - curveDepth} ${halfW} ${halfL - curveDepth} 0
    Q ${halfL - curveDepth} ${-halfW} ${halfL} ${-halfW}
    Z
  `;

  return {
    path,
    width: halfW * 2,
    length: halfL * 2,
    fill: '#374151',
    stroke: '#fbbf24',
    strokeWidth: 0.03,
  };
}

/**
 * Raised table - rectangular with beveled edges
 */
function getRaisedTablePath(halfL: number, halfW: number): ProductPathResult {
  const bevel = 0.1;

  const path = `
    M ${-halfL + bevel} ${-halfW}
    L ${halfL - bevel} ${-halfW}
    L ${halfL} ${-halfW + bevel}
    L ${halfL} ${halfW - bevel}
    L ${halfL - bevel} ${halfW}
    L ${-halfL + bevel} ${halfW}
    L ${-halfL} ${halfW - bevel}
    L ${-halfL} ${-halfW + bevel}
    Z
  `;

  return {
    path,
    width: halfW * 2,
    length: halfL * 2,
    fill: '#dc2626',     // Red surface
    stroke: '#fbbf24',   // Yellow markings
    strokeWidth: 0.05,
  };
}

/**
 * Generic product fallback
 */
function getGenericProductPath(halfL: number, halfW: number): ProductPathResult {
  const path = `
    M ${-halfL} ${-halfW}
    L ${halfL} ${-halfW}
    L ${halfL} ${halfW}
    L ${-halfL} ${halfW}
    Z
  `;

  return {
    path,
    width: halfW * 2,
    length: halfL * 2,
    fill: '#6b7280',
    stroke: '#374151',
    strokeWidth: 0.02,
  };
}

/**
 * Get hatching pattern for islands/refuges
 */
export function getHatchingPattern(width: number, length: number): string {
  const lines: string[] = [];
  const spacing = 0.15;
  const halfW = width / 2;
  const halfL = length / 2;
  const margin = 0.1;

  // Diagonal lines
  for (let offset = -halfL - halfW; offset < halfL + halfW; offset += spacing) {
    const x1 = Math.max(-halfL + margin, offset - halfW);
    const y1 = Math.max(-halfW + margin, -offset + x1);
    const x2 = Math.min(halfL - margin, offset + halfW);
    const y2 = Math.min(halfW - margin, offset - x2);

    if (y1 < halfW - margin && y2 > -halfW + margin) {
      lines.push(`M ${x1} ${y1} L ${x2} ${y2}`);
    }
  }

  return lines.join(' ');
}

/**
 * Get NCLD reflective stripe pattern
 */
export function getNCLDStripes(length: number): string {
  const lines: string[] = [];
  const halfL = length / 2;
  const stripeW = 0.05;
  const spacing = 0.2;

  for (let x = -halfL + spacing; x < halfL; x += spacing) {
    lines.push(`M ${x} ${-stripeW} L ${x} ${stripeW}`);
  }

  return lines.join(' ');
}

/**
 * Get zebra crossing stripes for raised table
 */
export function getZebraCrossingStripes(width: number, length: number): string[] {
  const stripes: string[] = [];
  const halfW = width / 2;
  const halfL = length / 2;
  const stripeWidth = 0.4;
  const stripeGap = 0.3;
  const margin = 0.15;

  let x = -halfL + margin + stripeWidth / 2;
  while (x < halfL - margin) {
    const y1 = -halfW + margin;
    const y2 = halfW - margin;
    stripes.push(`M ${x - stripeWidth / 2} ${y1} L ${x + stripeWidth / 2} ${y1} L ${x + stripeWidth / 2} ${y2} L ${x - stripeWidth / 2} ${y2} Z`);
    x += stripeWidth + stripeGap;
  }

  return stripes;
}
