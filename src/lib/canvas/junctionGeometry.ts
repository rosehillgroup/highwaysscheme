/**
 * Junction Geometry Utilities
 *
 * Provides calculations for junction rendering including:
 * - Arm positions and angles
 * - Junction surface paths
 * - Road connection points
 * - Roundabout geometry
 */

import type { CanvasPoint, Junction, JunctionType } from '@/types/canvas';

// ============================================================================
// Basic Geometry Helpers
// ============================================================================

/** Convert degrees to radians */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Convert radians to degrees */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Rotate a point around origin by angle (in degrees) */
export function rotatePoint(point: CanvasPoint, angleDeg: number): CanvasPoint {
  const rad = degToRad(angleDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

/** Translate a point */
export function translatePoint(point: CanvasPoint, offset: CanvasPoint): CanvasPoint {
  return {
    x: point.x + offset.x,
    y: point.y + offset.y,
  };
}

/** Get the angle of a vector in degrees (0 = right, 90 = down) */
export function vectorAngle(v: CanvasPoint): number {
  return radToDeg(Math.atan2(v.y, v.x));
}

// ============================================================================
// Junction Arm Configuration
// ============================================================================

export interface JunctionArm {
  angle: number;        // Angle in degrees (0 = right/east, 90 = down/south)
  width: number;        // Road width at this arm
  direction: 'in' | 'out' | 'both';
}

/** Default arm configurations for each junction type */
export function getDefaultArms(type: JunctionType, roadWidth: number = 6.5): JunctionArm[] {
  switch (type) {
    case 't-junction':
      // T-junction: top arm and left/right arms
      return [
        { angle: 0, width: roadWidth, direction: 'both' },     // Right (east)
        { angle: 180, width: roadWidth, direction: 'both' },   // Left (west)
        { angle: 270, width: roadWidth, direction: 'both' },   // Top (north)
      ];

    case 'crossroads':
      // 4-way intersection
      return [
        { angle: 0, width: roadWidth, direction: 'both' },     // Right (east)
        { angle: 90, width: roadWidth, direction: 'both' },    // Bottom (south)
        { angle: 180, width: roadWidth, direction: 'both' },   // Left (west)
        { angle: 270, width: roadWidth, direction: 'both' },   // Top (north)
      ];

    case 'roundabout':
    case 'mini-roundabout':
      // 4 arms by default
      return [
        { angle: 0, width: roadWidth, direction: 'both' },
        { angle: 90, width: roadWidth, direction: 'both' },
        { angle: 180, width: roadWidth, direction: 'both' },
        { angle: 270, width: roadWidth, direction: 'both' },
      ];

    case 'staggered':
      // Staggered junction (offset crossroads)
      return [
        { angle: 0, width: roadWidth, direction: 'both' },
        { angle: 180, width: roadWidth, direction: 'both' },
        { angle: 270, width: roadWidth, direction: 'both' },   // Offset arm
        { angle: 90, width: roadWidth, direction: 'both' },    // Offset arm
      ];

    default:
      return [];
  }
}

// ============================================================================
// Junction Size Calculations
// ============================================================================

/** Calculate the bounding size of a junction based on type and road width */
export function getJunctionSize(type: JunctionType, roadWidth: number = 6.5): number {
  switch (type) {
    case 't-junction':
      return roadWidth * 1.5;
    case 'crossroads':
      return roadWidth * 1.5;
    case 'roundabout':
      return roadWidth * 3; // Larger for roundabout
    case 'mini-roundabout':
      return roadWidth * 2;
    case 'staggered':
      return roadWidth * 2;
    default:
      return roadWidth * 1.5;
  }
}

/** Get roundabout dimensions */
export function getRoundaboutDimensions(
  type: 'roundabout' | 'mini-roundabout',
  roadWidth: number = 6.5
): { outerRadius: number; innerRadius: number; circulatingWidth: number } {
  if (type === 'mini-roundabout') {
    return {
      outerRadius: roadWidth * 1.2,
      innerRadius: 0, // No central island for mini
      circulatingWidth: roadWidth,
    };
  }

  // Standard roundabout
  return {
    outerRadius: roadWidth * 2.5,
    innerRadius: roadWidth * 1.2,
    circulatingWidth: roadWidth * 1.3,
  };
}

// ============================================================================
// SVG Path Generation
// ============================================================================

/** Generate SVG path for T-junction surface */
export function generateTJunctionPath(
  position: CanvasPoint,
  rotation: number,
  roadWidth: number
): string {
  const hw = roadWidth / 2; // half width
  const size = roadWidth * 0.75; // distance from center to arm edge

  // Define vertices of the T-junction shape (before rotation)
  // This creates a T shape opening to the top
  const vertices: CanvasPoint[] = [
    { x: -size - hw, y: -hw },    // Top-left of horizontal
    { x: size + hw, y: -hw },     // Top-right of horizontal
    { x: size + hw, y: hw },      // Bottom-right of horizontal
    { x: hw, y: hw },             // Inner corner right
    { x: hw, y: size + hw },      // Bottom-right of vertical
    { x: -hw, y: size + hw },     // Bottom-left of vertical
    { x: -hw, y: hw },            // Inner corner left
    { x: -size - hw, y: hw },     // Bottom-left of horizontal
  ];

  // Rotate and translate vertices
  const transformed = vertices.map((v) => {
    const rotated = rotatePoint(v, rotation);
    return translatePoint(rotated, position);
  });

  // Build SVG path
  let path = `M ${transformed[0].x} ${transformed[0].y}`;
  for (let i = 1; i < transformed.length; i++) {
    path += ` L ${transformed[i].x} ${transformed[i].y}`;
  }
  path += ' Z';

  return path;
}

/** Generate SVG path for crossroads surface */
export function generateCrossroadsPath(
  position: CanvasPoint,
  rotation: number,
  roadWidth: number
): string {
  const hw = roadWidth / 2;
  const size = roadWidth * 0.75;

  // Define vertices of the cross shape (+ shape)
  const vertices: CanvasPoint[] = [
    // Top arm
    { x: -hw, y: -size - hw },
    { x: hw, y: -size - hw },
    // Top-right corner
    { x: hw, y: -hw },
    // Right arm
    { x: size + hw, y: -hw },
    { x: size + hw, y: hw },
    // Bottom-right corner
    { x: hw, y: hw },
    // Bottom arm
    { x: hw, y: size + hw },
    { x: -hw, y: size + hw },
    // Bottom-left corner
    { x: -hw, y: hw },
    // Left arm
    { x: -size - hw, y: hw },
    { x: -size - hw, y: -hw },
    // Top-left corner
    { x: -hw, y: -hw },
  ];

  const transformed = vertices.map((v) => {
    const rotated = rotatePoint(v, rotation);
    return translatePoint(rotated, position);
  });

  let path = `M ${transformed[0].x} ${transformed[0].y}`;
  for (let i = 1; i < transformed.length; i++) {
    path += ` L ${transformed[i].x} ${transformed[i].y}`;
  }
  path += ' Z';

  return path;
}

/** Generate SVG path for roundabout surface (outer ring) */
export function generateRoundaboutPath(
  position: CanvasPoint,
  outerRadius: number,
  innerRadius: number
): { outerPath: string; innerPath: string } {
  // Outer circle
  const outerPath = `
    M ${position.x + outerRadius} ${position.y}
    A ${outerRadius} ${outerRadius} 0 1 1 ${position.x - outerRadius} ${position.y}
    A ${outerRadius} ${outerRadius} 0 1 1 ${position.x + outerRadius} ${position.y}
    Z
  `.trim();

  // Inner circle (central island)
  const innerPath = innerRadius > 0
    ? `
      M ${position.x + innerRadius} ${position.y}
      A ${innerRadius} ${innerRadius} 0 1 1 ${position.x - innerRadius} ${position.y}
      A ${innerRadius} ${innerRadius} 0 1 1 ${position.x + innerRadius} ${position.y}
      Z
    `.trim()
    : '';

  return { outerPath, innerPath };
}

/** Generate approach roads for roundabout */
export function generateRoundaboutApproaches(
  position: CanvasPoint,
  rotation: number,
  outerRadius: number,
  roadWidth: number,
  armCount: number = 4
): string[] {
  const paths: string[] = [];
  const hw = roadWidth / 2;
  const approachLength = roadWidth * 1.5;

  for (let i = 0; i < armCount; i++) {
    const armAngle = rotation + (i * 360) / armCount;
    const rad = degToRad(armAngle);

    // Start point (at outer radius)
    const startX = position.x + Math.cos(rad) * outerRadius;
    const startY = position.y + Math.sin(rad) * outerRadius;

    // End point (extending outward)
    const endX = position.x + Math.cos(rad) * (outerRadius + approachLength);
    const endY = position.y + Math.sin(rad) * (outerRadius + approachLength);

    // Perpendicular direction for width
    const perpX = -Math.sin(rad) * hw;
    const perpY = Math.cos(rad) * hw;

    const path = `
      M ${startX - perpX} ${startY - perpY}
      L ${endX - perpX} ${endY - perpY}
      L ${endX + perpX} ${endY + perpY}
      L ${startX + perpX} ${startY + perpY}
      Z
    `.trim();

    paths.push(path);
  }

  return paths;
}

// ============================================================================
// Arm Connection Points
// ============================================================================

/** Get the connection point for a road at a specific junction arm */
export function getArmConnectionPoint(
  junction: Junction,
  armIndex: number,
  roadWidth: number = 6.5
): { point: CanvasPoint; angle: number } {
  const arms = getDefaultArms(junction.type, roadWidth);
  if (armIndex >= arms.length) {
    return { point: junction.position, angle: 0 };
  }

  const arm = arms[armIndex];
  const totalAngle = junction.rotation + arm.angle;
  const rad = degToRad(totalAngle);

  // Calculate distance from center based on junction type
  let distance: number;
  if (junction.type === 'roundabout' || junction.type === 'mini-roundabout') {
    const dims = getRoundaboutDimensions(junction.type, roadWidth);
    distance = dims.outerRadius + roadWidth;
  } else {
    distance = getJunctionSize(junction.type, roadWidth);
  }

  return {
    point: {
      x: junction.position.x + Math.cos(rad) * distance,
      y: junction.position.y + Math.sin(rad) * distance,
    },
    angle: totalAngle,
  };
}

/** Find the nearest arm to a given angle */
export function findNearestArm(
  junction: Junction,
  targetAngle: number,
  roadWidth: number = 6.5
): number {
  const arms = getDefaultArms(junction.type, roadWidth);

  let nearestIndex = 0;
  let nearestDiff = 360;

  for (let i = 0; i < arms.length; i++) {
    const armAngle = (junction.rotation + arms[i].angle) % 360;
    let diff = Math.abs(targetAngle - armAngle);
    if (diff > 180) diff = 360 - diff;

    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

// ============================================================================
// Hit Testing
// ============================================================================

/** Check if a point is within a junction's bounds */
export function isPointInJunction(
  junction: Junction,
  point: CanvasPoint,
  roadWidth: number = 6.5
): boolean {
  const dx = point.x - junction.position.x;
  const dy = point.y - junction.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (junction.type === 'roundabout' || junction.type === 'mini-roundabout') {
    const dims = getRoundaboutDimensions(junction.type, roadWidth);
    return distance <= dims.outerRadius + roadWidth;
  }

  const size = getJunctionSize(junction.type, roadWidth);
  return distance <= size + roadWidth / 2;
}

/** Get junction center markings (give way lines, etc.) */
export function getJunctionMarkings(
  junction: Junction,
  roadWidth: number = 6.5
): { type: string; path: string }[] {
  const markings: { type: string; path: string }[] = [];

  // For roundabouts, add give-way lines at each entry
  if (junction.type === 'roundabout' || junction.type === 'mini-roundabout') {
    const dims = getRoundaboutDimensions(junction.type, roadWidth);
    const arms = getDefaultArms(junction.type, roadWidth);

    arms.forEach((arm, i) => {
      const angle = junction.rotation + arm.angle;
      const rad = degToRad(angle);
      const hw = arm.width / 2;

      // Give way line position
      const lineX = junction.position.x + Math.cos(rad) * dims.outerRadius;
      const lineY = junction.position.y + Math.sin(rad) * dims.outerRadius;

      // Perpendicular for line width
      const perpX = -Math.sin(rad) * hw;
      const perpY = Math.cos(rad) * hw;

      markings.push({
        type: 'give-way-line',
        path: `M ${lineX - perpX} ${lineY - perpY} L ${lineX + perpX} ${lineY + perpY}`,
      });
    });
  }

  return markings;
}
