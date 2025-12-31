/**
 * Canvas Mode Types
 *
 * Types for the custom canvas road planning mode.
 * Enables road layout planning without map overlay.
 */

// ============================================================================
// Basic Coordinate Types
// ============================================================================

/** Point in canvas coordinates (metres from origin) */
export interface CanvasPoint {
  x: number;
  y: number;
}

/** Control point for bezier curves */
export interface BezierControlPoint {
  point: CanvasPoint;
  handleIn?: CanvasPoint;   // Relative to point (for incoming curve)
  handleOut?: CanvasPoint;  // Relative to point (for outgoing curve)
}

// ============================================================================
// Road Types
// ============================================================================

export type RoadSegmentType = 'straight' | 'curve' | 'junction-arm';

/** Lane direction */
export type LaneDirection = 'forward' | 'backward' | 'bidirectional';

/** Lane configuration for a road */
export interface LaneConfiguration {
  count: number;
  widths: number[];           // Width per lane (metres)
  directions: LaneDirection[];
}

/** Cycle lane configuration */
export interface CycleLaneConfig {
  enabled: boolean;
  width: number;              // metres (default 2.0)
  side: 'nearside' | 'offside';
  bufferWidth?: number;       // Gap from carriageway edge
}

/** Individual road segment */
export interface RoadSegment {
  id: string;
  type: RoadSegmentType;
  points: BezierControlPoint[];
  width: number;              // Carriageway width (metres)
  lanes: LaneConfiguration;
  cycleLane?: CycleLaneConfig;
  parentJunctionId?: string;  // If this is a junction arm

  // Calculated properties (derived, not stored)
  length?: number;            // Total length in metres
}

// ============================================================================
// Junction Types
// ============================================================================

export type JunctionType =
  | 't-junction'
  | 'crossroads'
  | 'roundabout'
  | 'mini-roundabout'
  | 'staggered';

/** Roundabout-specific configuration */
export interface RoundaboutConfig {
  outerRadius: number;        // metres
  innerRadius: number;        // metres (0 for mini)
  entryWidths: number[];      // Width per entry
  exitWidths: number[];       // Width per exit
}

/** Junction definition */
export interface Junction {
  id: string;
  type: JunctionType;
  position: CanvasPoint;
  rotation: number;           // Degrees
  armIds: string[];           // Connected road segment IDs
  roundaboutConfig?: RoundaboutConfig;
}

// ============================================================================
// Road Marking Types
// ============================================================================

export type MarkingType =
  // Line markings
  | 'centre-line-solid'
  | 'centre-line-dashed'
  | 'centre-line-double'
  | 'edge-line-solid'
  | 'edge-line-dashed'
  | 'lane-divider'
  | 'hatching'
  | 'chevron'
  // Arrow markings
  | 'arrow-straight'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-left-straight'
  | 'arrow-right-straight'
  | 'arrow-all'
  // Junction markings
  | 'box-junction'
  | 'give-way-triangle'
  | 'stop-line'
  // Pedestrian markings
  | 'zebra-crossing'
  | 'signal-crossing'
  // Cycle markings
  | 'advanced-stop-box'
  | 'cycle-logo'
  | 'cycle-lane-symbol'
  // Other
  | 'bus-stop-cage';

/** Road marking placement */
export interface RoadMarking {
  id: string;
  type: MarkingType;
  roadSegmentId: string;
  position: {
    s: number;                // Chainage along road
    t: number;                // Lateral offset
  };
  endS?: number;              // End chainage (for linear markings)
  laneIndex?: number;         // For lane-specific markings
  rotation?: number;          // Additional rotation (degrees)

  // Product linkage
  isProduct: boolean;         // If true, adds to BOM
  productId?: string;         // Linked Rosehill product
  quantity?: number;          // Calculated quantity (m, m2, or units)
}

// ============================================================================
// Signage Types
// ============================================================================

export type SignType =
  // Speed limits (regulatory)
  | 'speed-20'
  | 'speed-30'
  | 'speed-40'
  | 'speed-50'
  | 'national-speed'
  // Regulatory
  | 'stop'
  | 'give-way'
  | 'no-entry'
  | 'no-left-turn'
  | 'no-right-turn'
  | 'no-u-turn'
  | 'one-way'
  | 'keep-left'
  | 'keep-right'
  | 'mini-roundabout'
  // Warning
  | 'warning-junction'
  | 'warning-roundabout'
  | 'warning-bend-left'
  | 'warning-bend-right'
  | 'warning-pedestrians'
  | 'warning-children'
  | 'warning-cyclists'
  | 'warning-road-narrows'
  | 'warning-traffic-signals'
  | 'warning-slippery'
  // Information
  | 'info-parking'
  | 'info-hospital'
  | 'info-pedestrian-crossing'
  | 'info-cycle-route'
  | 'info-bus-stop'
  // Direction
  | 'direction-left'
  | 'direction-right'
  | 'direction-straight';

/** Sign placement */
export interface SignagePlacement {
  id: string;
  signType: SignType;
  position: CanvasPoint;
  rotation: number;           // Degrees
  roadSegmentId?: string;     // Optional association
  productId?: string;         // Rosehill product ID (if applicable)
}

// ============================================================================
// Furniture Types
// ============================================================================

export type FurnitureType =
  // Bollards
  | 'bollard-steel-fixed'
  | 'bollard-steel-removable'
  | 'bollard-steel-fold-down'
  | 'bollard-plastic-flexible'
  | 'bollard-recycled'
  | 'bollard-cast-iron'
  | 'bollard-illuminated'
  // Delineators
  | 'delineator-flexible'
  | 'delineator-arrow'
  | 'delineator-hazard'
  | 'lane-separator'
  | 'cycle-lane-defender'
  // Barriers
  | 'barrier-pedestrian'
  | 'barrier-vrs'
  | 'barrier-water-filled'
  // Pedestrian
  | 'crossing-beacon'
  | 'crossing-stud'
  | 'tactile-paving-blister'
  | 'tactile-paving-corduroy'
  // Cycle
  | 'cycle-stand'
  | 'cycle-shelter'
  | 'cycle-repair-station';

/** Street furniture placement */
export interface FurniturePlacement {
  id: string;
  furnitureType: FurnitureType;
  position: CanvasPoint;
  rotation: number;
  roadSegmentId?: string;
  productId: string;          // Always linked to Rosehill product
}

// ============================================================================
// Canvas Viewport & Tools
// ============================================================================

/** Canvas viewport state (pan/zoom) */
export interface CanvasViewport {
  pan: CanvasPoint;           // Offset in canvas coords (metres)
  zoom: number;               // Scale factor (1.0 = 100%)
  workspaceSize: {
    width: number;            // metres
    height: number;           // metres
  };
}

/** Available drawing tools */
export type DrawTool =
  | 'select'
  | 'road'
  | 'junction-t'
  | 'junction-cross'
  | 'junction-roundabout'
  | 'marking'
  | 'signage'
  | 'furniture'
  | 'product';

/** Tool-specific options */
export interface ToolOptions {
  roadWidth?: number;         // Default road width
  junctionType?: JunctionType;
  markingType?: MarkingType;
  signType?: SignType;
  furnitureType?: FurnitureType;
  productId?: string;         // Selected product ID
  variantId?: string;         // Selected variant ID
}

// ============================================================================
// Canvas Product Types
// ============================================================================

/** Product placement mode */
export type ProductPlacementMode = 'discrete' | 'linear' | 'area';

/** Canvas product placement */
export interface CanvasProduct {
  id: string;
  productId: string;          // Reference to product in products.json
  variantId?: string;         // Specific variant if applicable
  roadSegmentId?: string;     // Associated road (for road-based products)
  position: {
    s: number;                // Chainage along road (if road-based)
    t: number;                // Lateral offset
  } | CanvasPoint;            // Or absolute position
  rotation: number;           // Degrees
  placementMode: ProductPlacementMode;

  // For linear products
  startChainage?: number;
  endChainage?: number;

  // For area products
  width?: number;
  length?: number;

  // Quantity and cost
  quantity: number;
  unitCost?: number;
}

// ============================================================================
// Canvas State
// ============================================================================

/** Drawing state for in-progress operations */
export interface DrawingState {
  tool: DrawTool;
  isDrawing: boolean;
  previewPoints?: CanvasPoint[];
  startPoint?: CanvasPoint;
}

/** Selection state */
export interface SelectionState {
  selectedRoadIds: string[];
  selectedJunctionIds: string[];
  selectedMarkingIds: string[];
  selectedSignageIds: string[];
  selectedFurnitureIds: string[];
  selectedProductIds: string[];
}

/** Complete custom canvas state */
export interface CustomCanvasState {
  // Viewport
  viewport: CanvasViewport;

  // Road network
  roads: Record<string, RoadSegment>;
  roadOrder: string[];        // Z-order for rendering
  junctions: Record<string, Junction>;

  // Markings and furniture
  markings: Record<string, RoadMarking>;
  signage: Record<string, SignagePlacement>;
  furniture: Record<string, FurniturePlacement>;

  // Products
  products: Record<string, CanvasProduct>;

  // Tool state
  activeTool: DrawTool;
  toolOptions: ToolOptions;
  drawingState: DrawingState | null;

  // Selection
  selection: SelectionState;

  // Grid/snap settings
  gridSize: number;           // metres
  snapToGrid: boolean;
  snapToRoad: boolean;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_VIEWPORT: CanvasViewport = {
  pan: { x: 0, y: 0 },
  zoom: 1.0,
  workspaceSize: {
    width: 200,               // 200m default workspace
    height: 150,              // 150m default workspace
  },
};

export const DEFAULT_ROAD_WIDTH = 6.5;    // UK standard carriageway
export const DEFAULT_LANE_WIDTH = 3.25;   // UK standard lane
export const DEFAULT_CYCLE_LANE_WIDTH = 2.0;
export const DEFAULT_GRID_SIZE = 1.0;     // 1 metre grid

export const DEFAULT_SELECTION: SelectionState = {
  selectedRoadIds: [],
  selectedJunctionIds: [],
  selectedMarkingIds: [],
  selectedSignageIds: [],
  selectedFurnitureIds: [],
  selectedProductIds: [],
};

export const DEFAULT_CANVAS_STATE: CustomCanvasState = {
  viewport: DEFAULT_VIEWPORT,
  roads: {},
  roadOrder: [],
  junctions: {},
  markings: {},
  signage: {},
  furniture: {},
  products: {},
  activeTool: 'select',
  toolOptions: {
    roadWidth: DEFAULT_ROAD_WIDTH,
  },
  drawingState: null,
  selection: DEFAULT_SELECTION,
  gridSize: DEFAULT_GRID_SIZE,
  snapToGrid: true,
  snapToRoad: true,
};
