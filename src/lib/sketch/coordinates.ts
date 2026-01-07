/**
 * Isometric Coordinate Utilities
 *
 * Converts between chainage coordinates (s, t) and isometric screen coordinates.
 * Uses a 2:1 isometric projection (tile width = 2 × tile height).
 */

// ============================================================================
// Constants
// ============================================================================

// Tile dimensions for 2:1 isometric projection
export const TILE_WIDTH = 64; // pixels
export const TILE_HEIGHT = 32; // pixels

// Default scale: metres per grid unit
export const DEFAULT_SCALE = 10;

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
