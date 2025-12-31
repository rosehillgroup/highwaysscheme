/**
 * Road Geometry Utilities
 *
 * Provides calculations for bezier-based road paths including:
 * - Bezier curve interpolation
 * - Tangent and normal calculations
 * - Offset curves for road edges
 * - Length and chainage calculations
 * - SVG path generation
 */

import type { CanvasPoint, BezierControlPoint, RoadSegment } from '@/types/canvas';

// ============================================================================
// Basic Vector Operations
// ============================================================================

export function vectorAdd(a: CanvasPoint, b: CanvasPoint): CanvasPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vectorSub(a: CanvasPoint, b: CanvasPoint): CanvasPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vectorScale(v: CanvasPoint, s: number): CanvasPoint {
  return { x: v.x * s, y: v.y * s };
}

export function vectorLength(v: CanvasPoint): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vectorNormalize(v: CanvasPoint): CanvasPoint {
  const len = vectorLength(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function vectorPerpendicular(v: CanvasPoint): CanvasPoint {
  return { x: -v.y, y: v.x };
}

export function vectorDistance(a: CanvasPoint, b: CanvasPoint): number {
  return vectorLength(vectorSub(b, a));
}

export function vectorLerp(a: CanvasPoint, b: CanvasPoint, t: number): CanvasPoint {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

// ============================================================================
// Cubic Bezier Calculations
// ============================================================================

/**
 * Evaluate a cubic bezier curve at parameter t
 * P(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
 */
export function bezierPoint(
  p0: CanvasPoint,
  p1: CanvasPoint,
  p2: CanvasPoint,
  p3: CanvasPoint,
  t: number
): CanvasPoint {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

/**
 * Evaluate the first derivative (tangent) of a cubic bezier at parameter t
 * P'(t) = 3(1-t)²(P₁-P₀) + 6(1-t)t(P₂-P₁) + 3t²(P₃-P₂)
 */
export function bezierTangent(
  p0: CanvasPoint,
  p1: CanvasPoint,
  p2: CanvasPoint,
  p3: CanvasPoint,
  t: number
): CanvasPoint {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
    y: 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y),
  };
}

/**
 * Get the normal (perpendicular to tangent) at parameter t
 */
export function bezierNormal(
  p0: CanvasPoint,
  p1: CanvasPoint,
  p2: CanvasPoint,
  p3: CanvasPoint,
  t: number
): CanvasPoint {
  const tangent = bezierTangent(p0, p1, p2, p3, t);
  return vectorNormalize(vectorPerpendicular(tangent));
}

/**
 * Approximate the length of a cubic bezier curve using subdivision
 */
export function bezierLength(
  p0: CanvasPoint,
  p1: CanvasPoint,
  p2: CanvasPoint,
  p3: CanvasPoint,
  subdivisions: number = 100
): number {
  let length = 0;
  let prevPoint = p0;

  for (let i = 1; i <= subdivisions; i++) {
    const t = i / subdivisions;
    const point = bezierPoint(p0, p1, p2, p3, t);
    length += vectorDistance(prevPoint, point);
    prevPoint = point;
  }

  return length;
}

/**
 * Find the parameter t for a given arc length along the curve
 * Uses binary search for efficiency
 */
export function bezierParameterAtLength(
  p0: CanvasPoint,
  p1: CanvasPoint,
  p2: CanvasPoint,
  p3: CanvasPoint,
  targetLength: number,
  tolerance: number = 0.001
): number {
  const totalLength = bezierLength(p0, p1, p2, p3);
  if (targetLength <= 0) return 0;
  if (targetLength >= totalLength) return 1;

  let low = 0;
  let high = 1;
  let mid = 0.5;

  while (high - low > tolerance) {
    mid = (low + high) / 2;
    const lengthAtMid = bezierLength(p0, p1, p2, p3, Math.round(mid * 100)) * mid;

    // More accurate length calculation
    let length = 0;
    let prevPoint = p0;
    const steps = 50;
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * mid;
      const point = bezierPoint(p0, p1, p2, p3, t);
      length += vectorDistance(prevPoint, point);
      prevPoint = point;
    }

    if (length < targetLength) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return mid;
}

// ============================================================================
// Road Path Operations
// ============================================================================

/**
 * Convert road control points to a series of bezier segments
 * Each segment connects two adjacent control points
 */
export function roadToBezierSegments(
  points: BezierControlPoint[]
): Array<{
  p0: CanvasPoint;
  p1: CanvasPoint;
  p2: CanvasPoint;
  p3: CanvasPoint;
}> {
  if (points.length < 2) return [];

  const segments: Array<{
    p0: CanvasPoint;
    p1: CanvasPoint;
    p2: CanvasPoint;
    p3: CanvasPoint;
  }> = [];

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];

    // Calculate control points
    // handleOut of current point and handleIn of next point
    const p0 = current.point;
    const p1 = current.handleOut
      ? vectorAdd(current.point, current.handleOut)
      : current.point;
    const p2 = next.handleIn
      ? vectorAdd(next.point, next.handleIn)
      : next.point;
    const p3 = next.point;

    segments.push({ p0, p1, p2, p3 });
  }

  return segments;
}

/**
 * Calculate the total length of a road
 */
export function calculateRoadLength(points: BezierControlPoint[]): number {
  const segments = roadToBezierSegments(points);
  return segments.reduce((total, seg) => {
    return total + bezierLength(seg.p0, seg.p1, seg.p2, seg.p3);
  }, 0);
}

/**
 * Get a point on the road at a given chainage (distance from start)
 */
export function pointAtChainage(
  points: BezierControlPoint[],
  chainage: number
): { point: CanvasPoint; tangent: CanvasPoint; normal: CanvasPoint } | null {
  if (points.length < 2) return null;

  const segments = roadToBezierSegments(points);
  let accumulatedLength = 0;

  for (const seg of segments) {
    const segLength = bezierLength(seg.p0, seg.p1, seg.p2, seg.p3);

    if (accumulatedLength + segLength >= chainage) {
      const localChainage = chainage - accumulatedLength;
      const t = bezierParameterAtLength(seg.p0, seg.p1, seg.p2, seg.p3, localChainage);

      return {
        point: bezierPoint(seg.p0, seg.p1, seg.p2, seg.p3, t),
        tangent: vectorNormalize(bezierTangent(seg.p0, seg.p1, seg.p2, seg.p3, t)),
        normal: bezierNormal(seg.p0, seg.p1, seg.p2, seg.p3, t),
      };
    }

    accumulatedLength += segLength;
  }

  // Return end point if chainage exceeds length
  const lastSeg = segments[segments.length - 1];
  return {
    point: lastSeg.p3,
    tangent: vectorNormalize(bezierTangent(lastSeg.p0, lastSeg.p1, lastSeg.p2, lastSeg.p3, 1)),
    normal: bezierNormal(lastSeg.p0, lastSeg.p1, lastSeg.p2, lastSeg.p3, 1),
  };
}

/**
 * Generate offset curve points for road edges
 * Positive offset = left side, negative offset = right side
 */
export function generateOffsetCurve(
  points: BezierControlPoint[],
  offset: number,
  resolution: number = 50
): CanvasPoint[] {
  const segments = roadToBezierSegments(points);
  if (segments.length === 0) return [];

  const offsetPoints: CanvasPoint[] = [];

  for (const seg of segments) {
    const steps = Math.max(10, Math.round(resolution / segments.length));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = bezierPoint(seg.p0, seg.p1, seg.p2, seg.p3, t);
      const normal = bezierNormal(seg.p0, seg.p1, seg.p2, seg.p3, t);

      offsetPoints.push(vectorAdd(point, vectorScale(normal, offset)));
    }
  }

  return offsetPoints;
}

// ============================================================================
// SVG Path Generation
// ============================================================================

/**
 * Generate SVG path string for the road centerline
 */
export function roadToSvgPath(points: BezierControlPoint[]): string {
  if (points.length < 2) return '';

  const segments = roadToBezierSegments(points);
  if (segments.length === 0) return '';

  let path = `M ${segments[0].p0.x} ${segments[0].p0.y}`;

  for (const seg of segments) {
    path += ` C ${seg.p1.x} ${seg.p1.y}, ${seg.p2.x} ${seg.p2.y}, ${seg.p3.x} ${seg.p3.y}`;
  }

  return path;
}

/**
 * Generate SVG path string for offset curve (road edge)
 */
export function offsetCurveToSvgPath(offsetPoints: CanvasPoint[]): string {
  if (offsetPoints.length === 0) return '';

  let path = `M ${offsetPoints[0].x} ${offsetPoints[0].y}`;

  for (let i = 1; i < offsetPoints.length; i++) {
    path += ` L ${offsetPoints[i].x} ${offsetPoints[i].y}`;
  }

  return path;
}

/**
 * Generate a closed SVG path for the road surface (carriageway)
 */
export function roadSurfaceToSvgPath(
  points: BezierControlPoint[],
  width: number,
  resolution: number = 50
): string {
  const halfWidth = width / 2;

  const leftEdge = generateOffsetCurve(points, halfWidth, resolution);
  const rightEdge = generateOffsetCurve(points, -halfWidth, resolution);

  if (leftEdge.length === 0 || rightEdge.length === 0) return '';

  // Start with left edge
  let path = `M ${leftEdge[0].x} ${leftEdge[0].y}`;

  for (let i = 1; i < leftEdge.length; i++) {
    path += ` L ${leftEdge[i].x} ${leftEdge[i].y}`;
  }

  // Connect to right edge (reversed)
  for (let i = rightEdge.length - 1; i >= 0; i--) {
    path += ` L ${rightEdge[i].x} ${rightEdge[i].y}`;
  }

  path += ' Z';

  return path;
}

// ============================================================================
// Road Creation Helpers
// ============================================================================

/**
 * Create a simple straight road between two points
 */
export function createStraightRoad(
  start: CanvasPoint,
  end: CanvasPoint
): BezierControlPoint[] {
  const direction = vectorSub(end, start);
  const handleLength = vectorLength(direction) * 0.3;
  const handleDir = vectorNormalize(direction);

  return [
    {
      point: start,
      handleIn: undefined,
      handleOut: vectorScale(handleDir, handleLength),
    },
    {
      point: end,
      handleIn: vectorScale(handleDir, -handleLength),
      handleOut: undefined,
    },
  ];
}

/**
 * Create smooth handles for a point based on neighboring points
 * This creates a Catmull-Rom style smooth curve through the points
 */
export function calculateSmoothHandles(
  prev: CanvasPoint | null,
  current: CanvasPoint,
  next: CanvasPoint | null,
  tension: number = 0.3
): { handleIn: CanvasPoint | undefined; handleOut: CanvasPoint | undefined } {
  if (!prev && !next) {
    return { handleIn: undefined, handleOut: undefined };
  }

  if (!prev) {
    // First point - only handleOut
    const dir = vectorSub(next!, current);
    const handleLength = vectorLength(dir) * tension;
    return {
      handleIn: undefined,
      handleOut: vectorScale(vectorNormalize(dir), handleLength),
    };
  }

  if (!next) {
    // Last point - only handleIn
    const dir = vectorSub(current, prev);
    const handleLength = vectorLength(dir) * tension;
    return {
      handleIn: vectorScale(vectorNormalize(dir), -handleLength),
      handleOut: undefined,
    };
  }

  // Middle point - calculate smooth tangent
  const toPrev = vectorSub(prev, current);
  const toNext = vectorSub(next, current);
  const tangent = vectorNormalize(vectorSub(toNext, toPrev));

  const handleInLength = vectorLength(toPrev) * tension;
  const handleOutLength = vectorLength(toNext) * tension;

  return {
    handleIn: vectorScale(tangent, -handleInLength),
    handleOut: vectorScale(tangent, handleOutLength),
  };
}

/**
 * Convert an array of simple points to bezier control points with smooth handles
 */
export function pointsToBezierControlPoints(
  points: CanvasPoint[],
  tension: number = 0.3
): BezierControlPoint[] {
  return points.map((point, i) => {
    const prev = i > 0 ? points[i - 1] : null;
    const next = i < points.length - 1 ? points[i + 1] : null;
    const handles = calculateSmoothHandles(prev, point, next, tension);

    return {
      point,
      handleIn: handles.handleIn,
      handleOut: handles.handleOut,
    };
  });
}

// ============================================================================
// Hit Testing
// ============================================================================

/**
 * Find the closest point on the road to a given point
 * Returns the chainage and distance
 */
export function closestPointOnRoad(
  points: BezierControlPoint[],
  target: CanvasPoint,
  samples: number = 100
): { chainage: number; distance: number; point: CanvasPoint } | null {
  const segments = roadToBezierSegments(points);
  if (segments.length === 0) return null;

  let closestDistance = Infinity;
  let closestChainage = 0;
  let closestPoint: CanvasPoint = { x: 0, y: 0 };
  let accumulatedLength = 0;

  for (const seg of segments) {
    const segLength = bezierLength(seg.p0, seg.p1, seg.p2, seg.p3);
    const segSamples = Math.max(10, Math.round((samples * segLength) / calculateRoadLength(points)));

    for (let i = 0; i <= segSamples; i++) {
      const t = i / segSamples;
      const point = bezierPoint(seg.p0, seg.p1, seg.p2, seg.p3, t);
      const distance = vectorDistance(point, target);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestPoint = point;
        closestChainage = accumulatedLength + (segLength * t);
      }
    }

    accumulatedLength += segLength;
  }

  return {
    chainage: closestChainage,
    distance: closestDistance,
    point: closestPoint,
  };
}

/**
 * Check if a point is within the road surface
 */
export function isPointOnRoad(
  points: BezierControlPoint[],
  width: number,
  target: CanvasPoint
): boolean {
  const closest = closestPointOnRoad(points, target);
  if (!closest) return false;

  return closest.distance <= width / 2;
}
