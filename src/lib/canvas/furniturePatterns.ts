/**
 * Furniture Pattern Generators
 *
 * SVG path generators for street furniture (bollards, barriers, etc.)
 */

export interface FurniturePath {
  type: 'cylinder' | 'square' | 'dome' | 'beacon' | 'sheffield' | 'rail';
  topPath: string;      // Top-down view path
  width: number;
  height: number;
  color: string;
  reflective?: boolean;
  reflectiveColor?: string;
  illuminated?: boolean;
  lightColor?: string;
}

/**
 * Generate cylinder bollard top view (circle)
 */
function cylinderTopView(diameter: number): string {
  const r = diameter / 2;
  return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z`;
}

/**
 * Generate square bollard top view
 */
function squareTopView(size: number): string {
  const h = size / 2;
  return `M ${-h} ${-h} L ${h} ${-h} L ${h} ${h} L ${-h} ${h} Z`;
}

/**
 * Generate dome top view (for lane separators)
 */
function domeTopView(width: number, height: number): string {
  const w = width / 2;
  const h = height / 2;
  return `M ${-w} 0 A ${w} ${h} 0 1 1 ${w} 0 A ${w} ${h} 0 1 1 ${-w} 0 Z`;
}

/**
 * Generate Belisha beacon top view
 */
function beaconTopView(diameter: number): string {
  const r = diameter / 2;
  // Circle with inner glow effect representation
  return `
    M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z
    M 0 ${-r * 0.7} A ${r * 0.7} ${r * 0.7} 0 1 1 0 ${r * 0.7} A ${r * 0.7} ${r * 0.7} 0 1 1 0 ${-r * 0.7} Z
  `;
}

/**
 * Generate Sheffield cycle stand top view
 */
function sheffieldTopView(width: number): string {
  const w = width / 2;
  const tubeR = 0.025; // 50mm diameter tube
  return `
    M ${-w} ${-tubeR}
    A ${tubeR} ${tubeR} 0 0 1 ${-w} ${tubeR}
    L ${w} ${tubeR}
    A ${tubeR} ${tubeR} 0 0 1 ${w} ${-tubeR}
    Z
    M ${-w} ${-tubeR * 3}
    L ${-w} ${tubeR * 3}
    M ${w} ${-tubeR * 3}
    L ${w} ${tubeR * 3}
  `;
}

/**
 * Generate guardrail segment top view
 */
function railTopView(length: number, width: number): string {
  const l = length / 2;
  const w = width / 2;
  return `M ${-l} ${-w} L ${l} ${-w} L ${l} ${w} L ${-l} ${w} Z`;
}

/**
 * Generate arrow delineator top view
 */
function arrowTopView(width: number, height: number): string {
  const w = width / 2;
  const h = height / 2;
  return `
    M 0 ${-h}
    L ${w} ${h * 0.3}
    L ${w * 0.4} ${h * 0.3}
    L ${w * 0.4} ${h}
    L ${-w * 0.4} ${h}
    L ${-w * 0.4} ${h * 0.3}
    L ${-w} ${h * 0.3}
    Z
  `;
}

/**
 * Generate hazard marker top view
 */
function hazardTopView(width: number, height: number): string {
  const w = width / 2;
  const h = height / 2;
  return `M ${-w} ${-h} L ${w} ${-h} L ${w} ${h} L ${-w} ${h} Z`;
}

/**
 * Generate road stud top view
 */
function studTopView(size: number): string {
  const s = size / 2;
  // Rounded rectangle
  const r = s * 0.3;
  return `
    M ${-s + r} ${-s}
    L ${s - r} ${-s}
    A ${r} ${r} 0 0 1 ${s} ${-s + r}
    L ${s} ${s - r}
    A ${r} ${r} 0 0 1 ${s - r} ${s}
    L ${-s + r} ${s}
    A ${r} ${r} 0 0 1 ${-s} ${s - r}
    L ${-s} ${-s + r}
    A ${r} ${r} 0 0 1 ${-s + r} ${-s}
    Z
  `;
}

/**
 * Generate tactile paving tile top view
 */
function tileTopView(size: number): string {
  const s = size / 2;
  return `M ${-s} ${-s} L ${s} ${-s} L ${s} ${s} L ${-s} ${s} Z`;
}

/**
 * Get furniture path data for a specific furniture type
 */
export function getFurniturePath(
  furnitureId: string,
  width: number,
  height: number,
  color: string,
  reflective?: boolean,
  reflectiveColor?: string,
  illuminated?: boolean,
  lightColor?: string
): FurniturePath {
  // Bollards
  if (furnitureId.includes('bollard') && !furnitureId.includes('recycled')) {
    return {
      type: 'cylinder',
      topPath: cylinderTopView(width),
      width,
      height,
      color,
      reflective,
      reflectiveColor,
      illuminated,
      lightColor,
    };
  }

  // Recycled plastic bollard (square)
  if (furnitureId.includes('recycled')) {
    return {
      type: 'square',
      topPath: squareTopView(width),
      width,
      height,
      color,
      reflective,
      reflectiveColor,
    };
  }

  // Lane separator (dome)
  if (furnitureId === 'lane-separator') {
    return {
      type: 'dome',
      topPath: domeTopView(width, width * 0.6),
      width,
      height,
      color,
      reflective,
      reflectiveColor,
    };
  }

  // Delineators
  if (furnitureId.includes('delineator') && furnitureId !== 'delineator-arrow') {
    return {
      type: 'cylinder',
      topPath: cylinderTopView(width),
      width,
      height,
      color,
      reflective,
      reflectiveColor,
    };
  }

  // Arrow delineator
  if (furnitureId === 'delineator-arrow') {
    return {
      type: 'cylinder',
      topPath: arrowTopView(width, width * 0.8),
      width,
      height,
      color,
      reflective,
      reflectiveColor,
    };
  }

  // Hazard marker
  if (furnitureId === 'delineator-hazard') {
    return {
      type: 'cylinder',
      topPath: hazardTopView(width, width * 0.3),
      width,
      height,
      color,
      reflective,
      reflectiveColor,
    };
  }

  // Belisha beacon
  if (furnitureId === 'crossing-beacon') {
    return {
      type: 'beacon',
      topPath: beaconTopView(width),
      width,
      height,
      color,
      illuminated: true,
      lightColor: lightColor || '#f59e0b',
    };
  }

  // Road stud
  if (furnitureId === 'crossing-stud') {
    return {
      type: 'dome',
      topPath: studTopView(width),
      width,
      height,
      color,
      reflective,
      reflectiveColor,
    };
  }

  // Tactile paving
  if (furnitureId.includes('tactile')) {
    return {
      type: 'dome',
      topPath: tileTopView(width),
      width,
      height,
      color,
    };
  }

  // Cycle stand
  if (furnitureId === 'cycle-stand') {
    return {
      type: 'sheffield',
      topPath: sheffieldTopView(width),
      width,
      height,
      color,
    };
  }

  // Barriers and guardrails
  if (furnitureId.includes('barrier') || furnitureId.includes('guardrail')) {
    const length = 1.0; // 1m segment
    return {
      type: 'rail',
      topPath: railTopView(length, width),
      width: length,
      height,
      color,
    };
  }

  // Cycle lane defender
  if (furnitureId === 'cycle-lane-defender') {
    return {
      type: 'cylinder',
      topPath: cylinderTopView(width),
      width,
      height,
      color,
      reflective,
      reflectiveColor,
    };
  }

  // Default cylinder
  return {
    type: 'cylinder',
    topPath: cylinderTopView(width),
    width,
    height,
    color,
    reflective,
    reflectiveColor,
  };
}

/**
 * Generate reflective band pattern
 */
export function getReflectiveBand(width: number, color: string): string {
  const r = width / 2;
  const bandWidth = r * 0.3;
  return `M ${-r} ${-bandWidth / 2} L ${r} ${-bandWidth / 2} L ${r} ${bandWidth / 2} L ${-r} ${bandWidth / 2} Z`;
}
