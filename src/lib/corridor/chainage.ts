/**
 * Chainage Coordinate System Utilities
 *
 * Provides functions for working with chainage-based coordinates (s, t):
 * - s: distance along corridor in metres
 * - t: lateral offset from centreline in metres (positive = right, negative = left)
 */

import * as turf from '@turf/turf';
import type { LineString, Position } from 'geojson';

export interface ChainagePoint {
  s: number;      // Distance along corridor (m)
  t: number;      // Lateral offset from centreline (m)
  bearing: number; // Bearing at this point (degrees)
}

export interface ProjectedPoint {
  lng: number;
  lat: number;
  s: number;
  bearing: number;
}

/**
 * Get the total length of a corridor in metres
 */
export function getCorridorLength(geometry: LineString): number {
  return turf.length(turf.lineString(geometry.coordinates), { units: 'meters' });
}

/**
 * Get the point along a corridor at a given chainage (s value)
 */
export function getPointAtChainage(
  geometry: LineString,
  s: number
): ProjectedPoint | null {
  const totalLength = getCorridorLength(geometry);

  if (s < 0 || s > totalLength) {
    return null;
  }

  const line = turf.lineString(geometry.coordinates);
  const point = turf.along(line, s, { units: 'meters' });
  const bearing = getBearingAtChainage(geometry, s);

  return {
    lng: point.geometry.coordinates[0],
    lat: point.geometry.coordinates[1],
    s,
    bearing,
  };
}

/**
 * Get the bearing (direction) at a given chainage along the corridor
 */
export function getBearingAtChainage(geometry: LineString, s: number): number {
  const totalLength = getCorridorLength(geometry);
  const line = turf.lineString(geometry.coordinates);

  // Get two points slightly before and after to calculate bearing
  const delta = Math.min(1, totalLength * 0.001); // 1m or 0.1% of length
  const s1 = Math.max(0, s - delta);
  const s2 = Math.min(totalLength, s + delta);

  const p1 = turf.along(line, s1, { units: 'meters' });
  const p2 = turf.along(line, s2, { units: 'meters' });

  return turf.bearing(p1, p2);
}

/**
 * Convert chainage coordinates (s, t) to geographic coordinates (lng, lat)
 */
export function chainageToLngLat(
  geometry: LineString,
  s: number,
  t: number
): [number, number] | null {
  const pointOnLine = getPointAtChainage(geometry, s);
  if (!pointOnLine) return null;

  if (t === 0) {
    return [pointOnLine.lng, pointOnLine.lat];
  }

  // Calculate perpendicular bearing (90 degrees to the right)
  const perpBearing = (pointOnLine.bearing + 90) % 360;

  // Move t metres in the perpendicular direction
  const offsetPoint = turf.destination(
    [pointOnLine.lng, pointOnLine.lat],
    Math.abs(t),
    t > 0 ? perpBearing : (perpBearing + 180) % 360,
    { units: 'meters' }
  );

  return offsetPoint.geometry.coordinates as [number, number];
}

/**
 * Convert geographic coordinates to chainage coordinates
 */
export function lngLatToChainage(
  geometry: LineString,
  point: [number, number]
): ChainagePoint {
  const line = turf.lineString(geometry.coordinates);
  const pt = turf.point(point);

  // Find nearest point on line
  const snapped = turf.nearestPointOnLine(line, pt);
  const s = (snapped.properties.location ?? 0) * 1000; // Convert km to m

  // Calculate lateral offset
  const distance = turf.distance(pt, snapped, { units: 'meters' });

  // Determine sign of offset (left or right of centreline)
  const bearing = getBearingAtChainage(geometry, s);
  const bearingToPoint = turf.bearing(snapped, pt);
  const angleDiff = ((bearingToPoint - bearing + 360) % 360);
  const t = angleDiff > 180 ? -distance : distance;

  return { s, t, bearing };
}

/**
 * Generate a carriageway polygon from corridor geometry and width
 */
export function generateCarriagewayPolygon(
  geometry: LineString,
  width: number
): Position[] {
  const line = turf.lineString(geometry.coordinates);
  const buffered = turf.buffer(line, width / 2, { units: 'meters' });

  if (!buffered || buffered.geometry.type !== 'Polygon') {
    return [];
  }

  return buffered.geometry.coordinates[0];
}

/**
 * Generate cycle lane polygon alongside carriageway
 */
export function generateCycleLanePolygon(
  geometry: LineString,
  carriageWidth: number,
  cycleLaneWidth: number,
  side: 'nearside' | 'offside',
  bufferWidth: number = 0
): Position[] {
  const line = turf.lineString(geometry.coordinates);

  // Calculate offset from centreline
  // Nearside = left side (in UK), Offside = right side
  const baseOffset = carriageWidth / 2;
  const offset = side === 'nearside'
    ? -(baseOffset + bufferWidth + cycleLaneWidth / 2)
    : (baseOffset + bufferWidth + cycleLaneWidth / 2);

  // Create offset line
  const offsetLine = turf.lineOffset(line, offset, { units: 'meters' });

  // Buffer the offset line to create the cycle lane polygon
  const buffered = turf.buffer(offsetLine, cycleLaneWidth / 2, { units: 'meters' });

  if (!buffered || buffered.geometry.type !== 'Polygon') {
    return [];
  }

  return buffered.geometry.coordinates[0];
}

/**
 * Sample points along the corridor at regular intervals
 */
export function sampleCorridorPoints(
  geometry: LineString,
  interval: number = 10 // metres
): ProjectedPoint[] {
  const totalLength = getCorridorLength(geometry);
  const points: ProjectedPoint[] = [];

  for (let s = 0; s <= totalLength; s += interval) {
    const point = getPointAtChainage(geometry, s);
    if (point) {
      points.push(point);
    }
  }

  // Always include the end point
  const endPoint = getPointAtChainage(geometry, totalLength);
  if (endPoint && (points.length === 0 || points[points.length - 1].s !== totalLength)) {
    points.push(endPoint);
  }

  return points;
}

/**
 * Get a section of the corridor between two chainage values
 */
export function getCorridorSection(
  geometry: LineString,
  startS: number,
  endS: number
): LineString | null {
  const totalLength = getCorridorLength(geometry);
  const line = turf.lineString(geometry.coordinates);

  const clampedStart = Math.max(0, Math.min(startS, totalLength));
  const clampedEnd = Math.max(0, Math.min(endS, totalLength));

  if (clampedStart >= clampedEnd) {
    return null;
  }

  const sliced = turf.lineSliceAlong(line, clampedStart, clampedEnd, { units: 'meters' });
  return sliced.geometry;
}

/**
 * Snap a point to the nearest position on the corridor
 */
export function snapToCorridorCentreline(
  geometry: LineString,
  point: [number, number]
): { lngLat: [number, number]; chainage: number } {
  const line = turf.lineString(geometry.coordinates);
  const pt = turf.point(point);
  const snapped = turf.nearestPointOnLine(line, pt);

  return {
    lngLat: snapped.geometry.coordinates as [number, number],
    chainage: (snapped.properties.location ?? 0) * 1000,
  };
}

/**
 * Calculate snap targets for product placement
 */
export function getSnapTargets(
  geometry: LineString,
  carriageWidth: number,
  cycleLane?: { width: number; side: 'nearside' | 'offside'; bufferWidth?: number }
): { name: string; offset: number }[] {
  const targets: { name: string; offset: number }[] = [
    { name: 'Centreline', offset: 0 },
    { name: 'Carriageway Left', offset: -carriageWidth / 2 },
    { name: 'Carriageway Right', offset: carriageWidth / 2 },
  ];

  if (cycleLane) {
    const baseOffset = carriageWidth / 2;
    const buffer = cycleLane.bufferWidth ?? 0;

    if (cycleLane.side === 'nearside') {
      targets.push({
        name: 'Cycle Lane Inner',
        offset: -(baseOffset + buffer),
      });
      targets.push({
        name: 'Cycle Lane Outer',
        offset: -(baseOffset + buffer + cycleLane.width),
      });
    } else {
      targets.push({
        name: 'Cycle Lane Inner',
        offset: baseOffset + buffer,
      });
      targets.push({
        name: 'Cycle Lane Outer',
        offset: baseOffset + buffer + cycleLane.width,
      });
    }
  }

  return targets;
}
