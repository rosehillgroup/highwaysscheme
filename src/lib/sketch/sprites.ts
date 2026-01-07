/**
 * Sprite Definitions for Sketch Mode
 *
 * Defines how products are rendered in the isometric view.
 * For MVP, uses procedurally generated graphics (rectangles, shapes).
 * Later can be upgraded to detailed isometric sprites.
 */

import type { ProductCategory } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface SpriteConfig {
  /** Product category */
  category: ProductCategory;
  /** Base colour for the sprite */
  colour: number;
  /** Accent colour (for highlights/edges) */
  accentColour: number;
  /** Width in isometric grid units */
  gridWidth: number;
  /** Length in isometric grid units (along corridor) */
  gridLength: number;
  /** Height in pixels (for 3D effect) */
  heightPixels: number;
  /** Anchor point Y (0=top, 1=bottom) for depth sorting */
  anchorY: number;
  /** Shape type for procedural generation */
  shape: 'rectangle' | 'rounded' | 'hexagon' | 'diamond';
}

// ============================================================================
// Colour Palette
// ============================================================================

export const COLOURS = {
  // Product colours
  speedCushion: 0x2c3e50, // Dark blue-grey (rubber)
  speedCushionRed: 0xc0392b, // Red variant
  island: 0x27ae60, // Green (traffic island)
  refuge: 0x27ae60, // Green (pedestrian refuge)
  ncld: 0x7f8c8d, // Grey (concrete-like)
  laneSeparator: 0x95a5a6, // Light grey
  raisedTable: 0x34495e, // Dark grey

  // Accent colours (lighter versions for 3D effect)
  speedCushionLight: 0x3d566e,
  islandLight: 0x2ecc71,
  ncldLight: 0x95a5a6,

  // Road colours
  carriageway: 0x34495e, // Dark grey asphalt
  centreline: 0xecf0f1, // White line
  cycleLane: 0x2ecc71, // Green cycle lane

  // Selection/hover
  selected: 0xf1c40f, // Yellow highlight
  hovered: 0x3498db, // Blue highlight
};

// ============================================================================
// Product Sprite Configurations
// ============================================================================

/**
 * Get sprite configuration for a product category
 * Dimensions are in grid units (1 grid unit = scale metres)
 */
export function getSpriteConfig(
  category: ProductCategory,
  dimensions: { length: number; width: number; height: number },
  scale: number
): SpriteConfig {
  // Convert mm to metres, then to grid units
  const lengthM = dimensions.length / 1000;
  const widthM = dimensions.width / 1000;
  const heightM = dimensions.height / 1000;

  // Grid units
  const gridLength = lengthM / scale;
  const gridWidth = widthM / scale;

  // Height in pixels (exaggerated for visibility, cap at 30px)
  const heightPixels = Math.min(30, Math.max(8, heightM * 100));

  switch (category) {
    case 'speed-cushion':
      return {
        category,
        colour: COLOURS.speedCushion,
        accentColour: COLOURS.speedCushionLight,
        gridWidth,
        gridLength,
        heightPixels,
        anchorY: 0.8,
        shape: 'rounded',
      };

    case 'island':
      return {
        category,
        colour: COLOURS.island,
        accentColour: COLOURS.islandLight,
        gridWidth,
        gridLength,
        heightPixels,
        anchorY: 0.8,
        shape: 'hexagon',
      };

    case 'refuge':
      return {
        category,
        colour: COLOURS.refuge,
        accentColour: COLOURS.islandLight,
        gridWidth,
        gridLength,
        heightPixels,
        anchorY: 0.8,
        shape: 'diamond',
      };

    case 'ncld':
      return {
        category,
        colour: COLOURS.ncld,
        accentColour: COLOURS.ncldLight,
        gridWidth,
        gridLength,
        heightPixels: 12, // Lower profile
        anchorY: 0.7,
        shape: 'rectangle',
      };

    case 'lane-separator':
      return {
        category,
        colour: COLOURS.laneSeparator,
        accentColour: COLOURS.ncldLight,
        gridWidth,
        gridLength,
        heightPixels: 12,
        anchorY: 0.7,
        shape: 'rounded',
      };

    case 'raised-table':
      return {
        category,
        colour: COLOURS.raisedTable,
        accentColour: COLOURS.speedCushionLight,
        gridWidth,
        gridLength,
        heightPixels: 10,
        anchorY: 0.75,
        shape: 'rectangle',
      };

    default:
      return {
        category,
        colour: COLOURS.ncld,
        accentColour: COLOURS.ncldLight,
        gridWidth: 0.2,
        gridLength: 0.2,
        heightPixels: 10,
        anchorY: 0.8,
        shape: 'rectangle',
      };
  }
}

// ============================================================================
// Sprite Generation Utilities
// ============================================================================

/**
 * Calculate isometric sprite dimensions in pixels
 */
export function calculateSpriteDimensions(
  gridWidth: number,
  gridLength: number,
  tileWidth: number,
  tileHeight: number
): { width: number; height: number } {
  // In isometric view, a grid square becomes a diamond
  // Width = (gridWidth + gridLength) * tileWidth/2
  // Height = (gridWidth + gridLength) * tileHeight/2 + heightOffset
  const isoWidth = (gridWidth + gridLength) * (tileWidth / 2);
  const isoHeight = (gridWidth + gridLength) * (tileHeight / 2);

  return {
    width: Math.max(16, isoWidth),
    height: Math.max(8, isoHeight),
  };
}

/**
 * Get product colour based on variant (if applicable)
 */
export function getVariantColour(
  baseConfig: SpriteConfig,
  variantColor?: 'black' | 'red'
): SpriteConfig {
  if (variantColor === 'red') {
    return {
      ...baseConfig,
      colour: COLOURS.speedCushionRed,
      accentColour: 0xd45d55, // Lighter red
    };
  }
  return baseConfig;
}

// ============================================================================
// Default Textures (Key names for Phaser texture generation)
// ============================================================================

export const TEXTURE_KEYS = {
  // Ground
  carriageway: 'ground-carriageway',
  cycleLane: 'ground-cycle-lane',
  verge: 'ground-verge',

  // Products (generated dynamically based on category)
  speedCushion: 'product-speed-cushion',
  island: 'product-island',
  refuge: 'product-refuge',
  ncld: 'product-ncld',
  laneSeparator: 'product-lane-separator',
  raisedTable: 'product-raised-table',

  // UI
  selectionRing: 'ui-selection-ring',
  hoverRing: 'ui-hover-ring',
} as const;

/**
 * Generate texture key for a specific product
 */
export function getProductTextureKey(productId: string, variantId?: string): string {
  return variantId ? `product-${productId}-${variantId}` : `product-${productId}`;
}
