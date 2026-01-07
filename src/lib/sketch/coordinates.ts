/**
 * Isometric Coordinate Utilities
 *
 * Converts between chainage coordinates (s, t) and isometric screen coordinates.
 * Uses a 2:1 isometric projection (tile width = 2 × tile height).
 *
 * Supports both straight corridors (linear projection) and curved corridors
 * (geometry-aware projection using actual corridor path).
 */

import type { LineString } from 'geojson';
import {
  getPointAtChainage,
  chainageToLngLat,
  lngLatToChainage as geoLngLatToChainage,
  sampleCorridorPoints,
} from '../corridor/chainage';

// ============================================================================
// Constants
// ============================================================================

// Tile dimensions for 2:1 isometric projection
// Larger tiles = road fills more of the canvas
export const TILE_WIDTH = 32; // pixels per grid unit
export const TILE_HEIGHT = 16; // pixels per grid unit

// Default scale: metres per grid unit
// Higher scale = more metres fit in view
export const DEFAULT_SCALE = 5;

// ============================================================================
// Types
// ============================================================================

export interface ChainageCoord {
  s: number; // Distance along corridor (metres)
  t: number; // Lateral offset from centreline (metres)
}

export interface ScreenCoord {
  x: number; // Screen X (pixels)
  y: number; // Screen Y (pixels)
}

export interface IsometricConfig {
  scale: number; // Metres per grid unit
  tileWidth: number; // Pixels
  tileHeight: number; // Pixels
  originX: number; // Screen origin X
  originY: number; // Screen origin Y
}

// ============================================================================
// Coordinate Conversion Functions
// ============================================================================

/**
 * Convert chainage coordinates to isometric screen coordinates
 *
 * @param s - Distance along corridor (metres)
 * @param t - Lateral offset from centreline (metres, positive = right)
 * @param config - Isometric configuration
 * @returns Screen coordinates in pixels
 */
export function chainageToScreen(
  s: number,
  t: number,
  config: IsometricConfig
): ScreenCoord {
  // Convert metres to grid units
  const gridX = s / config.scale;
  const gridY = t / config.scale;

  // Isometric projection (2:1 ratio)
  // gridX extends to bottom-right, gridY extends to bottom-left
  const screenX = (gridX - gridY) * (config.tileWidth / 2);
  const screenY = (gridX + gridY) * (config.tileHeight / 2);

  return {
    x: config.originX + screenX,
    y: config.originY + screenY,
  };
}

/**
 * Convert screen coordinates to chainage coordinates
 *
 * @param screenX - Screen X position (pixels)
 * @param screenY - Screen Y position (pixels)
 * @param config - Isometric configuration
 * @returns Chainage coordinates in metres
 */
export function screenToChainage(
  screenX: number,
  screenY: number,
  config: IsometricConfig
): ChainageCoord {
  // Offset from origin
  const dx = screenX - config.originX;
  const dy = screenY - config.originY;

  // Inverse isometric projection
  const gridX = (dx / (config.tileWidth / 2) + dy / (config.tileHeight / 2)) / 2;
  const gridY = (dy / (config.tileHeight / 2) - dx / (config.tileWidth / 2)) / 2;

  // Convert grid units to metres
  return {
    s: gridX * config.scale,
    t: gridY * config.scale,
  };
}

/**
 * Snap chainage coordinates to grid
 *
 * @param s - Distance along corridor (metres)
 * @param t - Lateral offset (metres)
 * @param gridSize - Grid size in metres
 * @returns Snapped coordinates
 */
export function snapToGrid(
  s: number,
  t: number,
  gridSize: number
): ChainageCoord {
  return {
    s: Math.round(s / gridSize) * gridSize,
    t: Math.round(t / gridSize) * gridSize,
  };
}

/**
 * Calculate depth value for sprite sorting
 * Higher depth = rendered later (in front)
 *
 * In isometric view, objects further along the corridor and further right
 * should appear in front.
 *
 * @param s - Distance along corridor (metres)
 * @param t - Lateral offset (metres)
 * @param scale - Metres per grid unit
 * @returns Depth value for sorting
 */
export function calculateDepth(s: number, t: number, scale: number): number {
  // Normalise to grid units and combine
  // Both s and t contribute to depth, as the camera looks down from top-left
  return (s / scale) + (t / scale);
}

/**
 * Calculate bounding box in screen space for a chainage region
 *
 * @param startS - Start chainage (metres)
 * @param endS - End chainage (metres)
 * @param minT - Minimum lateral offset (metres)
 * @param maxT - Maximum lateral offset (metres)
 * @param config - Isometric configuration
 * @returns Screen bounding box { left, top, right, bottom }
 */
export function getScreenBounds(
  startS: number,
  endS: number,
  minT: number,
  maxT: number,
  config: IsometricConfig
): { left: number; top: number; right: number; bottom: number } {
  // Calculate all four corners
  const corners = [
    chainageToScreen(startS, minT, config),
    chainageToScreen(startS, maxT, config),
    chainageToScreen(endS, minT, config),
    chainageToScreen(endS, maxT, config),
  ];

  return {
    left: Math.min(...corners.map((c) => c.x)),
    top: Math.min(...corners.map((c) => c.y)),
    right: Math.max(...corners.map((c) => c.x)),
    bottom: Math.max(...corners.map((c) => c.y)),
  };
}

/**
 * Create default isometric configuration
 *
 * @param containerWidth - Container width in pixels
 * @param containerHeight - Container height in pixels
 * @param scale - Metres per grid unit (default: 10)
 * @returns Isometric configuration
 */
export function createDefaultConfig(
  containerWidth: number,
  containerHeight: number,
  scale: number = DEFAULT_SCALE
): IsometricConfig {
  return {
    scale,
    tileWidth: TILE_WIDTH,
    tileHeight: TILE_HEIGHT,
    // Centre the origin in the viewport, offset up to show more of the corridor
    originX: containerWidth / 2,
    originY: containerHeight / 4,
  };
}

/**
 * Calculate the visible chainage range given viewport and camera settings
 *
 * @param viewportWidth - Viewport width in pixels
 * @param viewportHeight - Viewport height in pixels
 * @param cameraX - Camera X offset
 * @param cameraY - Camera Y offset
 * @param zoom - Zoom level
 * @param config - Isometric configuration
 * @returns Visible chainage range { minS, maxS, minT, maxT }
 */
export function getVisibleChainageRange(
  viewportWidth: number,
  viewportHeight: number,
  cameraX: number,
  cameraY: number,
  zoom: number,
  config: IsometricConfig
): { minS: number; maxS: number; minT: number; maxT: number } {
  // Adjust for zoom
  const adjustedWidth = viewportWidth / zoom;
  const adjustedHeight = viewportHeight / zoom;

  // Calculate corners in screen space
  const left = cameraX - adjustedWidth / 2;
  const right = cameraX + adjustedWidth / 2;
  const top = cameraY - adjustedHeight / 2;
  const bottom = cameraY + adjustedHeight / 2;

  // Convert to chainage (rough estimate - isometric makes this complex)
  const adjustedConfig = {
    ...config,
    originX: 0,
    originY: 0,
  };

  const topLeft = screenToChainage(left, top, adjustedConfig);
  const topRight = screenToChainage(right, top, adjustedConfig);
  const bottomLeft = screenToChainage(left, bottom, adjustedConfig);
  const bottomRight = screenToChainage(right, bottom, adjustedConfig);

  return {
    minS: Math.min(topLeft.s, topRight.s, bottomLeft.s, bottomRight.s),
    maxS: Math.max(topLeft.s, topRight.s, bottomLeft.s, bottomRight.s),
    minT: Math.min(topLeft.t, topRight.t, bottomLeft.t, bottomRight.t),
    maxT: Math.max(topLeft.t, topRight.t, bottomLeft.t, bottomRight.t),
  };
}

/**
 * Convert rotation from corridor-relative to screen rotation
 *
 * In chainage coordinates, rotation is relative to corridor bearing.
 * In isometric view, we need to adjust for the 45° rotation.
 *
 * @param corridorRotation - Rotation relative to corridor bearing (degrees)
 * @returns Screen rotation for sprite (degrees)
 */
export function chainageRotationToScreen(corridorRotation: number): number {
  // Isometric view rotates 45° from top-down
  // Additionally, the corridor itself runs diagonally
  // For now, just apply the corridor-relative rotation directly
  // (products like signs face perpendicular to traffic flow)
  return corridorRotation;
}

// ============================================================================
// Curved Corridor Support
// ============================================================================

export interface LocalCoord {
  x: number; // Local X in metres (east from origin)
  y: number; // Local Y in metres (north from origin)
}

export interface CurvedIsometricConfig extends IsometricConfig {
  geometry: LineString; // Corridor geometry
  localOrigin: [number, number]; // [lng, lat] of local coordinate origin
}

/**
 * Convert geographic coordinates (lng, lat) to local projected coordinates (metres)
 * Uses simple equirectangular projection, accurate for small areas.
 *
 * @param lngLat - Geographic coordinates [longitude, latitude]
 * @param origin - Origin point [longitude, latitude]
 * @returns Local coordinates in metres
 */
export function lngLatToLocal(
  lngLat: [number, number],
  origin: [number, number]
): LocalCoord {
  const [lng, lat] = lngLat;
  const [originLng, originLat] = origin;

  // Metres per degree at this latitude
  const metersPerDegreeLat = 111320; // Roughly constant
  const metersPerDegreeLng = 111320 * Math.cos((originLat * Math.PI) / 180);

  return {
    x: (lng - originLng) * metersPerDegreeLng,
    y: (lat - originLat) * metersPerDegreeLat,
  };
}

/**
 * Convert local projected coordinates (metres) to geographic coordinates
 *
 * @param local - Local coordinates in metres
 * @param origin - Origin point [longitude, latitude]
 * @returns Geographic coordinates [longitude, latitude]
 */
export function localToLngLat(
  local: LocalCoord,
  origin: [number, number]
): [number, number] {
  const [originLng, originLat] = origin;

  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((originLat * Math.PI) / 180);

  return [
    originLng + local.x / metersPerDegreeLng,
    originLat + local.y / metersPerDegreeLat,
  ];
}

/**
 * Convert local coordinates to isometric screen coordinates
 *
 * @param local - Local coordinates in metres
 * @param config - Isometric configuration
 * @returns Screen coordinates in pixels
 */
export function localToScreen(
  local: LocalCoord,
  config: IsometricConfig
): ScreenCoord {
  // Convert metres to grid units
  const gridX = local.x / config.scale;
  const gridY = local.y / config.scale;

  // Isometric projection (2:1 ratio)
  // X axis extends to bottom-right, Y axis extends to top-right
  // We want: increasing local X → down-right, increasing local Y → up-right
  const screenX = (gridX + gridY) * (config.tileWidth / 2);
  const screenY = (gridX - gridY) * (config.tileHeight / 2);

  return {
    x: config.originX + screenX,
    y: config.originY + screenY,
  };
}

/**
 * Convert screen coordinates to local coordinates
 *
 * @param screen - Screen coordinates in pixels
 * @param config - Isometric configuration
 * @returns Local coordinates in metres
 */
export function screenToLocal(
  screen: ScreenCoord,
  config: IsometricConfig
): LocalCoord {
  const dx = screen.x - config.originX;
  const dy = screen.y - config.originY;

  // Inverse isometric projection
  const gridX = (dx / (config.tileWidth / 2) + dy / (config.tileHeight / 2)) / 2;
  const gridY = (dx / (config.tileWidth / 2) - dy / (config.tileHeight / 2)) / 2;

  return {
    x: gridX * config.scale,
    y: gridY * config.scale,
  };
}

/**
 * Convert chainage coordinates to screen coordinates using curved corridor geometry.
 *
 * This function:
 * 1. Gets the geographic point at chainage (s, t) using corridor geometry
 * 2. Projects to local coordinates relative to corridor origin
 * 3. Applies isometric projection to get screen coordinates
 *
 * @param s - Distance along corridor (metres)
 * @param t - Lateral offset from centreline (metres, positive = right)
 * @param geometry - Corridor LineString geometry
 * @param config - Isometric configuration
 * @returns Screen coordinates in pixels
 */
export function chainageToScreenCurved(
  s: number,
  t: number,
  geometry: LineString,
  config: IsometricConfig
): ScreenCoord {
  // Get geographic coordinates at this chainage position
  const lngLat = chainageToLngLat(geometry, s, t);

  if (!lngLat) {
    // Fallback to straight projection if outside corridor bounds
    return chainageToScreen(s, t, config);
  }

  // Use corridor start point as local origin
  const localOrigin = geometry.coordinates[0] as [number, number];

  // Convert to local coordinates
  const local = lngLatToLocal(lngLat, localOrigin);

  // Apply isometric projection
  return localToScreen(local, config);
}

/**
 * Convert screen coordinates to chainage coordinates using curved corridor geometry.
 *
 * @param screenX - Screen X position (pixels)
 * @param screenY - Screen Y position (pixels)
 * @param geometry - Corridor LineString geometry
 * @param config - Isometric configuration
 * @returns Chainage coordinates in metres
 */
export function screenToChainageCurved(
  screenX: number,
  screenY: number,
  geometry: LineString,
  config: IsometricConfig
): ChainageCoord {
  // Convert screen to local coordinates
  const local = screenToLocal({ x: screenX, y: screenY }, config);

  // Use corridor start point as local origin
  const localOrigin = geometry.coordinates[0] as [number, number];

  // Convert local to geographic coordinates
  const lngLat = localToLngLat(local, localOrigin);

  // Project onto corridor to get chainage
  const chainage = geoLngLatToChainage(geometry, lngLat);

  return {
    s: chainage.s,
    t: chainage.t,
  };
}

/**
 * Calculate screen bounding box for a curved corridor
 *
 * @param geometry - Corridor LineString geometry
 * @param halfWidth - Half the road width in metres
 * @param config - Isometric configuration
 * @param sampleInterval - Distance between sample points (metres)
 * @returns Screen bounding box
 */
export function getScreenBoundsCurved(
  geometry: LineString,
  halfWidth: number,
  config: IsometricConfig,
  sampleInterval: number = 10
): { left: number; top: number; right: number; bottom: number } {
  const points = sampleCorridorPoints(geometry, sampleInterval);
  const screenPoints: ScreenCoord[] = [];

  for (const point of points) {
    // Sample both edges of the road
    screenPoints.push(chainageToScreenCurved(point.s, -halfWidth, geometry, config));
    screenPoints.push(chainageToScreenCurved(point.s, halfWidth, geometry, config));
  }

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

/**
 * Calculate depth for curved corridors.
 * Uses local coordinates for proper isometric depth sorting.
 *
 * @param s - Distance along corridor (metres)
 * @param t - Lateral offset from centreline (metres)
 * @param geometry - Corridor LineString geometry
 * @param config - Isometric configuration
 * @returns Depth value for sorting
 */
export function calculateDepthCurved(
  s: number,
  t: number,
  geometry: LineString,
  config: IsometricConfig
): number {
  const lngLat = chainageToLngLat(geometry, s, t);
  if (!lngLat) {
    return calculateDepth(s, t, config.scale);
  }

  const localOrigin = geometry.coordinates[0] as [number, number];
  const local = lngLatToLocal(lngLat, localOrigin);

  // Depth increases with x + y (bottom-right is in front)
  return (local.x + local.y) / config.scale;
}
