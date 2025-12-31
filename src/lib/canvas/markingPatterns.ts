/**
 * Marking Patterns Utility
 *
 * Generates SVG paths and patterns for road markings including:
 * - Line patterns (solid, dashed, double)
 * - Arrow symbols
 * - Junction markings (box junction, give way)
 * - Crossing patterns (zebra, signal)
 * - Cycle markings (ASB, logos)
 */

import type { CanvasPoint } from '@/types/canvas';

// ============================================================================
// Arrow Path Generators
// ============================================================================

/** Generate SVG path for straight arrow */
export function generateStraightArrow(width: number = 0.6, height: number = 2.0): string {
  const hw = width / 2;
  const headHeight = height * 0.4;
  const shaftWidth = width * 0.35;
  const hsw = shaftWidth / 2;

  return `
    M 0 ${-height / 2}
    L ${-hw} ${-height / 2 + headHeight}
    L ${-hsw} ${-height / 2 + headHeight}
    L ${-hsw} ${height / 2}
    L ${hsw} ${height / 2}
    L ${hsw} ${-height / 2 + headHeight}
    L ${hw} ${-height / 2 + headHeight}
    Z
  `.trim();
}

/** Generate SVG path for left turn arrow */
export function generateLeftArrow(width: number = 0.6, height: number = 2.0): string {
  const hw = width / 2;
  const headHeight = height * 0.3;
  const shaftWidth = width * 0.35;
  const hsw = shaftWidth / 2;
  const turnRadius = width * 0.8;

  return `
    M ${-hw - turnRadius} ${-height / 4}
    L ${-hw - turnRadius} ${-height / 4 - headHeight}
    L ${-turnRadius} ${-height / 4}
    L ${-hw - turnRadius} ${-height / 4 + headHeight}
    L ${-hw - turnRadius} ${-height / 4}
    L ${-hsw} ${-height / 4}
    L ${-hsw} ${height / 2}
    L ${hsw} ${height / 2}
    L ${hsw} ${-height / 4 - hsw}
    Q ${hsw} ${-height / 4 - hsw - turnRadius * 0.5} ${-hsw - turnRadius * 0.5} ${-height / 4 - hsw - turnRadius * 0.5}
    L ${-hw - turnRadius} ${-height / 4}
    Z
  `.trim();
}

/** Generate SVG path for right turn arrow */
export function generateRightArrow(width: number = 0.6, height: number = 2.0): string {
  const hw = width / 2;
  const headHeight = height * 0.3;
  const shaftWidth = width * 0.35;
  const hsw = shaftWidth / 2;
  const turnRadius = width * 0.8;

  return `
    M ${hw + turnRadius} ${-height / 4}
    L ${hw + turnRadius} ${-height / 4 - headHeight}
    L ${turnRadius} ${-height / 4}
    L ${hw + turnRadius} ${-height / 4 + headHeight}
    L ${hw + turnRadius} ${-height / 4}
    L ${hsw} ${-height / 4}
    L ${hsw} ${height / 2}
    L ${-hsw} ${height / 2}
    L ${-hsw} ${-height / 4 - hsw}
    Q ${-hsw} ${-height / 4 - hsw - turnRadius * 0.5} ${hsw + turnRadius * 0.5} ${-height / 4 - hsw - turnRadius * 0.5}
    L ${hw + turnRadius} ${-height / 4}
    Z
  `.trim();
}

/** Generate SVG path for left+straight combo arrow */
export function generateLeftStraightArrow(width: number = 0.8, height: number = 2.0): string {
  // Combine straight arrow with left turn indicator
  const straightPath = generateStraightArrow(width * 0.6, height);

  // Add small left arrow indicator
  const leftOffset = -width * 0.6;
  const leftArrow = `
    M ${leftOffset} ${-height * 0.1}
    L ${leftOffset - width * 0.25} 0
    L ${leftOffset} ${height * 0.1}
    L ${leftOffset} ${-height * 0.05}
    L ${leftOffset - width * 0.15} 0
    L ${leftOffset} ${height * 0.05}
    Z
  `.trim();

  return straightPath + ' ' + leftArrow;
}

/** Generate SVG path for right+straight combo arrow */
export function generateRightStraightArrow(width: number = 0.8, height: number = 2.0): string {
  const straightPath = generateStraightArrow(width * 0.6, height);

  const rightOffset = width * 0.6;
  const rightArrow = `
    M ${rightOffset} ${-height * 0.1}
    L ${rightOffset + width * 0.25} 0
    L ${rightOffset} ${height * 0.1}
    L ${rightOffset} ${-height * 0.05}
    L ${rightOffset + width * 0.15} 0
    L ${rightOffset} ${height * 0.05}
    Z
  `.trim();

  return straightPath + ' ' + rightArrow;
}

// ============================================================================
// Symbol Path Generators
// ============================================================================

/** Generate SVG path for give way triangle */
export function generateGiveWayTriangle(width: number = 2.0, height: number = 3.0): string {
  const hw = width / 2;
  const hh = height / 2;
  const innerOffset = 0.15;

  // Outer triangle
  const outer = `
    M 0 ${-hh}
    L ${hw} ${hh}
    L ${-hw} ${hh}
    Z
  `;

  // Inner triangle (cutout)
  const inner = `
    M 0 ${-hh + innerOffset * 2}
    L ${hw - innerOffset} ${hh - innerOffset}
    L ${-hw + innerOffset} ${hh - innerOffset}
    Z
  `;

  return outer + inner;
}

/** Generate SVG path for cycle symbol */
export function generateCycleSymbol(width: number = 1.2, height: number = 1.8): string {
  const scale = Math.min(width, height) / 2;

  // Simplified cycle symbol
  return `
    M ${-scale * 0.6} ${scale * 0.3}
    A ${scale * 0.4} ${scale * 0.4} 0 1 1 ${-scale * 0.6} ${scale * 0.31}
    M ${scale * 0.6} ${scale * 0.3}
    A ${scale * 0.4} ${scale * 0.4} 0 1 1 ${scale * 0.6} ${scale * 0.31}
    M ${-scale * 0.6} ${scale * 0.3}
    L ${-scale * 0.2} ${-scale * 0.3}
    L ${scale * 0.2} ${-scale * 0.3}
    L ${scale * 0.6} ${scale * 0.3}
    M ${-scale * 0.2} ${-scale * 0.3}
    L 0 ${-scale * 0.8}
    L ${scale * 0.15} ${-scale * 0.6}
  `.trim();
}

// ============================================================================
// Pattern Generators for Linear Markings
// ============================================================================

/** Generate dashed line segments along a path */
export function generateDashedSegments(
  points: CanvasPoint[],
  dashLength: number,
  gapLength: number,
  lineWidth: number
): CanvasPoint[][] {
  if (points.length < 2) return [];

  const segments: CanvasPoint[][] = [];
  let currentDist = 0;
  let inDash = true;
  let dashRemaining = dashLength;
  let currentSegment: CanvasPoint[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segLength = Math.sqrt(dx * dx + dy * dy);

    if (segLength === 0) continue;

    const dirX = dx / segLength;
    const dirY = dy / segLength;

    let segDist = 0;
    while (segDist < segLength) {
      const remaining = inDash ? dashRemaining : (gapLength - (dashLength - dashRemaining));
      const advance = Math.min(remaining, segLength - segDist);

      const startX = p1.x + dirX * segDist;
      const startY = p1.y + dirY * segDist;
      const endX = p1.x + dirX * (segDist + advance);
      const endY = p1.y + dirY * (segDist + advance);

      if (inDash) {
        if (currentSegment.length === 0) {
          currentSegment.push({ x: startX, y: startY });
        }
        currentSegment.push({ x: endX, y: endY });
        dashRemaining -= advance;

        if (dashRemaining <= 0) {
          segments.push(currentSegment);
          currentSegment = [];
          inDash = false;
          dashRemaining = dashLength;
        }
      } else {
        dashRemaining -= advance;
        if (dashRemaining <= dashLength - gapLength) {
          inDash = true;
          dashRemaining = dashLength;
        }
      }

      segDist += advance;
    }
  }

  if (currentSegment.length > 1) {
    segments.push(currentSegment);
  }

  return segments;
}

// ============================================================================
// Box Junction Pattern
// ============================================================================

/** Generate box junction cross-hatch pattern */
export function generateBoxJunctionPattern(
  width: number,
  height: number,
  spacing: number = 0.5
): { lines: { x1: number; y1: number; x2: number; y2: number }[] } {
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const hw = width / 2;
  const hh = height / 2;

  // Diagonal lines (top-left to bottom-right)
  for (let offset = -hw - hh; offset <= hw + hh; offset += spacing) {
    const x1 = Math.max(-hw, offset - hh);
    const y1 = Math.max(-hh, -offset + x1);
    const x2 = Math.min(hw, offset + hh);
    const y2 = Math.min(hh, -offset + x2);

    if (x2 > x1) {
      lines.push({ x1, y1: -y1, x2, y2: -y2 });
    }
  }

  // Diagonal lines (top-right to bottom-left)
  for (let offset = -hw - hh; offset <= hw + hh; offset += spacing) {
    const x1 = Math.max(-hw, -offset - hh);
    const y1 = Math.max(-hh, offset + x1);
    const x2 = Math.min(hw, -offset + hh);
    const y2 = Math.min(hh, offset + x2);

    if (x2 > x1) {
      lines.push({ x1, y1, x2, y2 });
    }
  }

  return { lines };
}

// ============================================================================
// Zebra Crossing Pattern
// ============================================================================

/** Generate zebra crossing stripes */
export function generateZebraStripes(
  width: number,
  height: number,
  stripeWidth: number = 0.6,
  stripeGap: number = 0.6
): string[] {
  const paths: string[] = [];
  const hw = width / 2;
  const hh = height / 2;
  const totalStripe = stripeWidth + stripeGap;
  const numStripes = Math.floor(width / totalStripe);
  const startX = -hw + (width - numStripes * totalStripe + stripeGap) / 2;

  for (let i = 0; i < numStripes; i++) {
    const x = startX + i * totalStripe;
    paths.push(`
      M ${x} ${-hh}
      L ${x + stripeWidth} ${-hh}
      L ${x + stripeWidth} ${hh}
      L ${x} ${hh}
      Z
    `.trim());
  }

  return paths;
}

// ============================================================================
// Advanced Stop Box
// ============================================================================

/** Generate advanced stop box for cyclists */
export function generateAdvancedStopBox(
  width: number,
  height: number
): { outline: string; fill: string; stopLine: string; cycleArea: string } {
  const hw = width / 2;
  const hh = height / 2;

  // Main box outline
  const outline = `
    M ${-hw} ${-hh}
    L ${hw} ${-hh}
    L ${hw} ${hh}
    L ${-hw} ${hh}
    Z
  `.trim();

  // Filled area
  const fill = outline;

  // Stop line at front
  const stopLine = `
    M ${-hw} ${-hh}
    L ${hw} ${-hh}
  `.trim();

  // Cycle waiting area (back portion)
  const cycleArea = `
    M ${-hw} ${-hh + 0.3}
    L ${hw} ${-hh + 0.3}
    L ${hw} ${hh}
    L ${-hw} ${hh}
    Z
  `.trim();

  return { outline, fill, stopLine, cycleArea };
}

// ============================================================================
// Hatching Pattern
// ============================================================================

/** Generate hatched area marking */
export function generateHatchPattern(
  width: number,
  length: number,
  angle: number = 45,
  spacing: number = 0.3
): { boundary: string; lines: { x1: number; y1: number; x2: number; y2: number }[] } {
  const hw = width / 2;
  const hl = length / 2;
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Boundary rectangle
  const boundary = `
    M ${-hw} ${-hl}
    L ${hw} ${-hl}
    L ${hw} ${hl}
    L ${-hw} ${hl}
    Z
  `.trim();

  // Calculate hatch lines
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const maxDist = Math.sqrt(hw * hw + hl * hl) * 2;

  for (let offset = -maxDist; offset <= maxDist; offset += spacing) {
    // Line perpendicular to angle at offset
    const perpX = -sin;
    const perpY = cos;
    const lineX = cos;
    const lineY = sin;

    // Line center point
    const cx = perpX * offset;
    const cy = perpY * offset;

    // Extend line both directions
    const x1 = cx - lineX * maxDist;
    const y1 = cy - lineY * maxDist;
    const x2 = cx + lineX * maxDist;
    const y2 = cy + lineY * maxDist;

    // Clip to boundary (simplified - just check if line crosses box)
    if (Math.abs(cx) < hw + maxDist && Math.abs(cy) < hl + maxDist) {
      lines.push({ x1, y1, x2, y2 });
    }
  }

  return { boundary, lines };
}

// ============================================================================
// Get Path for Marking Type
// ============================================================================

export interface MarkingPath {
  type: 'path' | 'pattern' | 'symbol';
  path?: string;
  paths?: string[];
  lines?: { x1: number; y1: number; x2: number; y2: number }[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  width: number;
  height: number;
}

/** Get the SVG path data for a marking type */
export function getMarkingPath(
  markingType: string,
  width?: number,
  height?: number
): MarkingPath {
  switch (markingType) {
    case 'arrow-straight':
      return {
        type: 'symbol',
        path: generateStraightArrow(width ?? 0.6, height ?? 2.0),
        fill: '#ffffff',
        width: width ?? 0.6,
        height: height ?? 2.0,
      };

    case 'arrow-left':
      return {
        type: 'symbol',
        path: generateLeftArrow(width ?? 0.6, height ?? 2.0),
        fill: '#ffffff',
        width: width ?? 0.8,
        height: height ?? 2.0,
      };

    case 'arrow-right':
      return {
        type: 'symbol',
        path: generateRightArrow(width ?? 0.6, height ?? 2.0),
        fill: '#ffffff',
        width: width ?? 0.8,
        height: height ?? 2.0,
      };

    case 'arrow-left-straight':
      return {
        type: 'symbol',
        path: generateLeftStraightArrow(width ?? 0.8, height ?? 2.0),
        fill: '#ffffff',
        width: width ?? 1.0,
        height: height ?? 2.0,
      };

    case 'arrow-right-straight':
      return {
        type: 'symbol',
        path: generateRightStraightArrow(width ?? 0.8, height ?? 2.0),
        fill: '#ffffff',
        width: width ?? 1.0,
        height: height ?? 2.0,
      };

    case 'give-way-triangle':
      return {
        type: 'symbol',
        path: generateGiveWayTriangle(width ?? 2.0, height ?? 3.0),
        fill: '#ffffff',
        width: width ?? 2.0,
        height: height ?? 3.0,
      };

    case 'cycle-logo':
    case 'cycle-lane-symbol':
      return {
        type: 'symbol',
        path: generateCycleSymbol(width ?? 1.2, height ?? 1.8),
        stroke: '#ffffff',
        strokeWidth: 0.08,
        fill: 'none',
        width: width ?? 1.2,
        height: height ?? 1.8,
      };

    case 'zebra-crossing':
      return {
        type: 'pattern',
        paths: generateZebraStripes(width ?? 2.4, height ?? 6.5),
        fill: '#ffffff',
        width: width ?? 2.4,
        height: height ?? 6.5,
      };

    case 'box-junction': {
      const pattern = generateBoxJunctionPattern(width ?? 6.5, height ?? 6.5);
      return {
        type: 'pattern',
        lines: pattern.lines,
        stroke: '#FFD700',
        strokeWidth: 0.1,
        width: width ?? 6.5,
        height: height ?? 6.5,
      };
    }

    default:
      return {
        type: 'path',
        path: '',
        width: width ?? 1,
        height: height ?? 1,
      };
  }
}
