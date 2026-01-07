/**
 * Canvas to Sketch Mode Conversion Utilities
 *
 * Converts Canvas mode data (Bezier-based roads in Cartesian coordinates)
 * to Sketch mode format (isometric 3D rendering).
 *
 * Key conversions:
 * - RoadSegment (Bezier) → LineString (sampled points)
 * - Canvas coordinates (x, y in metres) → Isometric screen coordinates
 * - CanvasProduct positions → Sketch rendering positions
 */

import type { LineString } from 'geojson';
import type { RoadSegment, CanvasProduct, CanvasPoint } from '@/types/canvas';
import type { IsometricConfig, ScreenCoord, ChainageCoord } from '@/lib/sketch/coordinates';
import {
  roadToBezierSegments,
  bezierPoint,
  bezierLength,
  bezierTangent,
  calculateRoadLength,
  pointAtChainage,
  vectorNormalize,
  vectorAdd,
  vectorScale,
  vectorPerpendicular,
} from './roadGeometry';

// ============================================================================
// Types
// ============================================================================

export interface CanvasCorridorData {
  geometry: LineString;
  totalLength: number;
  width: number;
  cycleLane?: {
    enabled: boolean;
    width: number;
    side: 'nearside' | 'offside';
  };
}

export interface CanvasSketchConfig {
  roads: CanvasCorridorData[];
  products: CanvasProduct[];
}

// ============================================================================
// Road Conversion
// ============================================================================

/**
 * Convert a Canvas RoadSegment (Bezier curves) to a GeoJSON LineString.
 * The coordinates are in metres (x, y), not geographic (lng, lat).
 *
 * @param road - Canvas road segment
 * @param sampleInterval - Distance between sample points in metres
 * @returns LineString with coordinates in metres
 */
export function roadSegmentToLineString(
  road: RoadSegment,
  sampleInterval: number = 1
): LineString {
  const segments = roadToBezierSegments(road.points);
  if (segments.length === 0) {
    return { type: 'LineString', coordinates: [] };
  }

  const points: [number, number][] = [];
  let accumulatedLength = 0;

  for (const seg of segments) {
    const segLength = bezierLength(seg.p0, seg.p1, seg.p2, seg.p3);
    const steps = Math.max(1, Math.ceil(segLength / sampleInterval));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pt = bezierPoint(seg.p0, seg.p1, seg.p2, seg.p3, t);
      points.push([pt.x, pt.y]);
    }

    accumulatedLength += segLength;
  }

  // Remove duplicate points
  const uniquePoints = points.filter((pt, i) => {
    if (i === 0) return true;
    const prev = points[i - 1];
    return Math.abs(pt[0] - prev[0]) > 0.001 || Math.abs(pt[1] - prev[1]) > 0.001;
  });

  return {
    type: 'LineString',
    coordinates: uniquePoints,
  };
}

/**
 * Convert a Canvas road to corridor data for Sketch rendering.
 *
 * @param road - Canvas road segment
 * @returns Corridor data compatible with Sketch mode
 */
export function roadToCorridorData(road: RoadSegment): CanvasCorridorData {
  return {
    geometry: roadSegmentToLineString(road),
    totalLength: road.length ?? calculateRoadLength(road.points),
    width: road.width,
    cycleLane: road.cycleLane?.enabled
      ? {
          enabled: true,
          width: road.cycleLane.width,
          side: road.cycleLane.side,
        }
      : undefined,
  };
}

/**
 * Get the total length of a Canvas road in metres.
 */
export function getRoadLength(road: RoadSegment): number {
  return road.length ?? calculateRoadLength(road.points);
}

// ============================================================================
// Canvas Coordinate Projection
// ============================================================================

/**
 * Convert Canvas coordinates (x, y in metres) to isometric screen coordinates.
 * Canvas origin is typically at the top-left of the workspace.
 *
 * @param x - X coordinate in metres
 * @param y - Y coordinate in metres
 * @param config - Isometric configuration
 * @returns Screen coordinates in pixels
 */
export function canvasToScreen(
  x: number,
  y: number,
  config: IsometricConfig
): ScreenCoord {
  // Convert metres to grid units
  const gridX = x / config.scale;
  const gridY = y / config.scale;

  // Isometric projection (2:1 ratio)
  // X axis extends to bottom-right, Y axis extends to top-right
  // We want: increasing X → down-right, increasing Y → down-left
  const screenX = (gridX - gridY) * (config.tileWidth / 2);
  const screenY = (gridX + gridY) * (config.tileHeight / 2);

  return {
    x: config.originX + screenX,
    y: config.originY + screenY,
  };
}

/**
 * Convert isometric screen coordinates back to Canvas coordinates.
 *
 * @param screenX - Screen X position (pixels)
 * @param screenY - Screen Y position (pixels)
 * @param config - Isometric configuration
 * @returns Canvas coordinates in metres
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  config: IsometricConfig
): CanvasPoint {
  const dx = screenX - config.originX;
  const dy = screenY - config.originY;

  // Inverse isometric projection
  const gridX = (dx / (config.tileWidth / 2) + dy / (config.tileHeight / 2)) / 2;
  const gridY = (dy / (config.tileHeight / 2) - dx / (config.tileWidth / 2)) / 2;

  return {
    x: gridX * config.scale,
    y: gridY * config.scale,
  };
}

/**
 * Convert chainage coordinates (s, t) to screen coordinates for a Canvas road.
 *
 * @param s - Distance along road (metres)
 * @param t - Lateral offset from centreline (metres, positive = right)
 * @param road - Canvas road segment
 * @param config - Isometric configuration
 * @returns Screen coordinates in pixels
 */
export function canvasChainageToScreen(
  s: number,
  t: number,
  road: RoadSegment,
  config: IsometricConfig
): ScreenCoord {
  // Get point at chainage
  const pointData = pointAtChainage(road.points, s);
  if (!pointData) {
    // Fallback to road end
    const lastPoint = road.points[road.points.length - 1];
    return canvasToScreen(lastPoint.point.x, lastPoint.point.y, config);
  }

  // Calculate offset position using normal
  const offsetPoint = vectorAdd(
    pointData.point,
    vectorScale(pointData.normal, -t) // Negative because normal points left, positive t is right
  );

  return canvasToScreen(offsetPoint.x, offsetPoint.y, config);
}

/**
 * Convert screen coordinates to chainage coordinates for a Canvas road.
 *
 * @param screenX - Screen X position (pixels)
 * @param screenY - Screen Y position (pixels)
 * @param road - Canvas road segment
 * @param config - Isometric configuration
 * @returns Chainage coordinates in metres
 */
export function screenToCanvasChainage(
  screenX: number,
  screenY: number,
  road: RoadSegment,
  config: IsometricConfig
): ChainageCoord {
  // Convert screen to Canvas coordinates
  const canvasCoord = screenToCanvas(screenX, screenY, config);

  // Find closest point on road
  const closest = findClosestPointOnRoad(road, canvasCoord);

  return {
    s: closest.chainage,
    t: closest.offset,
  };
}

/**
 * Find the closest point on a road to a target point.
 * Returns chainage and lateral offset.
 */
function findClosestPointOnRoad(
  road: RoadSegment,
  target: CanvasPoint
): { chainage: number; offset: number; point: CanvasPoint } {
  const segments = roadToBezierSegments(road.points);
  if (segments.length === 0) {
    return { chainage: 0, offset: 0, point: { x: 0, y: 0 } };
  }

  let closestDistance = Infinity;
  let closestChainage = 0;
  let closestPoint: CanvasPoint = { x: 0, y: 0 };
  let closestNormal: CanvasPoint = { x: 0, y: 1 };
  let accumulatedLength = 0;

  for (const seg of segments) {
    const segLength = bezierLength(seg.p0, seg.p1, seg.p2, seg.p3);
    const samples = Math.max(20, Math.round(segLength / 0.5));

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const pt = bezierPoint(seg.p0, seg.p1, seg.p2, seg.p3, t);
      const dx = pt.x - target.x;
      const dy = pt.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < closestDistance) {
        closestDistance = dist;
        closestChainage = accumulatedLength + (segLength * t);
        closestPoint = pt;

        // Calculate normal at this point
        const tangent = bezierTangent(seg.p0, seg.p1, seg.p2, seg.p3, t);
        closestNormal = vectorNormalize(vectorPerpendicular(tangent));
      }
    }

    accumulatedLength += segLength;
  }

  // Calculate lateral offset using dot product with normal
  const toTarget = { x: target.x - closestPoint.x, y: target.y - closestPoint.y };
  const offset = -(toTarget.x * closestNormal.x + toTarget.y * closestNormal.y);

  return {
    chainage: closestChainage,
    offset,
    point: closestPoint,
  };
}

// ============================================================================
// Depth Calculation
// ============================================================================

/**
 * Calculate depth for Canvas coordinates.
 * Objects with higher depth render in front (closer to camera).
 *
 * In our isometric view, the camera looks from top-left towards bottom-right.
 * So objects with higher (x + y) should have higher depth.
 *
 * @param x - X coordinate in metres
 * @param y - Y coordinate in metres
 * @param scale - Metres per grid unit
 * @returns Depth value for sorting
 */
export function calculateCanvasDepth(x: number, y: number, scale: number): number {
  return (x + y) / scale;
}

/**
 * Calculate depth for chainage coordinates on a Canvas road.
 */
export function calculateCanvasChainageDepth(
  s: number,
  t: number,
  road: RoadSegment,
  scale: number
): number {
  const pointData = pointAtChainage(road.points, s);
  if (!pointData) {
    return 0;
  }

  // Calculate offset position
  const offsetPoint = vectorAdd(
    pointData.point,
    vectorScale(pointData.normal, -t)
  );

  return calculateCanvasDepth(offsetPoint.x, offsetPoint.y, scale);
}

// ============================================================================
// Bounding Box
// ============================================================================

/**
 * Calculate screen bounding box for a Canvas road.
 *
 * @param road - Canvas road segment
 * @param config - Isometric configuration
 * @returns Screen bounding box
 */
export function getCanvasRoadScreenBounds(
  road: RoadSegment,
  config: IsometricConfig
): { left: number; top: number; right: number; bottom: number } {
  const halfWidth = road.width / 2;
  const totalLength = getRoadLength(road);
  const screenPoints: ScreenCoord[] = [];

  // Sample along the road
  const interval = Math.max(1, totalLength / 50);
  for (let s = 0; s <= totalLength; s += interval) {
    // Sample both edges
    screenPoints.push(canvasChainageToScreen(s, -halfWidth, road, config));
    screenPoints.push(canvasChainageToScreen(s, halfWidth, road, config));
  }

  // Include end point
  screenPoints.push(canvasChainageToScreen(totalLength, -halfWidth, road, config));
  screenPoints.push(canvasChainageToScreen(totalLength, halfWidth, road, config));

  if (screenPoints.length === 0) {
    return { left: 0, top: 0, right: 0, bottom: 0 };
  }

  return {
    left: Math.min(...screenPoints.map((p) => p.x)),
    top: Math.min(...screenPoints.map((p) => p.y)),
    right: Math.max(...screenPoints.map((p) => p.x)),
    bottom: Math.max(...screenPoints.map((p) => p.y)),
  };
}

// ============================================================================
// Product Conversion
// ============================================================================

/**
 * Get screen position for a Canvas product.
 *
 * @param product - Canvas product
 * @param road - Associated road (if product is road-based)
 * @param config - Isometric configuration
 * @returns Screen coordinates
 */
export function getCanvasProductScreenPosition(
  product: CanvasProduct,
  road: RoadSegment | null,
  config: IsometricConfig
): ScreenCoord {
  const pos = product.position;

  // Check if position is chainage-based (has s and t) or absolute (has x and y)
  if ('s' in pos && 't' in pos && road) {
    return canvasChainageToScreen(pos.s, pos.t, road, config);
  }

  // Absolute position
  if ('x' in pos && 'y' in pos) {
    return canvasToScreen(pos.x, pos.y, config);
  }

  // Fallback
  return { x: config.originX, y: config.originY };
}

/**
 * Get depth for a Canvas product.
 */
export function getCanvasProductDepth(
  product: CanvasProduct,
  road: RoadSegment | null,
  scale: number
): number {
  const pos = product.position;

  if ('s' in pos && 't' in pos && road) {
    return calculateCanvasChainageDepth(pos.s, pos.t, road, scale);
  }

  if ('x' in pos && 'y' in pos) {
    return calculateCanvasDepth(pos.x, pos.y, scale);
  }

  return 0;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sample points along a Canvas road at regular intervals.
 * Returns array of { x, y, s, bearing } objects.
 */
export function sampleCanvasRoadPoints(
  road: RoadSegment,
  interval: number = 5
): Array<{ x: number; y: number; s: number; bearing: number }> {
  const totalLength = getRoadLength(road);
  const points: Array<{ x: number; y: number; s: number; bearing: number }> = [];

  for (let s = 0; s <= totalLength; s += interval) {
    const data = pointAtChainage(road.points, s);
    if (data) {
      // Calculate bearing from tangent (degrees from north)
      const bearing = Math.atan2(data.tangent.x, data.tangent.y) * (180 / Math.PI);
      points.push({
        x: data.point.x,
        y: data.point.y,
        s,
        bearing: (bearing + 360) % 360,
      });
    }
  }

  // Include end point
  const endData = pointAtChainage(road.points, totalLength);
  if (endData && (points.length === 0 || points[points.length - 1].s !== totalLength)) {
    const bearing = Math.atan2(endData.tangent.x, endData.tangent.y) * (180 / Math.PI);
    points.push({
      x: endData.point.x,
      y: endData.point.y,
      s: totalLength,
      bearing: (bearing + 360) % 360,
    });
  }

  return points;
}

/**
 * Get bearing at a chainage point on a Canvas road (degrees from north).
 */
export function getBearingAtCanvasChainage(road: RoadSegment, s: number): number {
  const data = pointAtChainage(road.points, s);
  if (!data) return 0;

  return Math.atan2(data.tangent.x, data.tangent.y) * (180 / Math.PI);
}
