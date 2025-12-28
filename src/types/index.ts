// Highways Scheme Planner - Type Definitions

import type { LineString, Position } from 'geojson';

// ============================================================================
// Product Types
// ============================================================================

export type ProductType = 'discrete' | 'linear' | 'area' | 'extendable';

export type ProductCategory =
  | 'speed-cushion'
  | 'island'
  | 'refuge'
  | 'ncld'
  | 'lane-separator'
  | 'raised-table';

export interface Dimensions {
  length: number;  // mm
  width: number;   // mm
  height: number;  // mm
}

export interface ModuleDefinition {
  id: string;
  name: string;
  type: 'end' | 'mid' | 'extension' | 'base' | 'double-end';
  dimensions: Dimensions;
  weight: number;  // kg
}

export interface ProductVariant {
  id: string;
  name: string;
  productCode: string;
  dimensions: Dimensions;
  weight: number;
  color?: 'black' | 'red';
  arrows?: 0 | 1 | 2;
}

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  category: ProductCategory;
  description?: string;
  modules?: ModuleDefinition[];
  defaultPattern?: string;
  dimensions: Dimensions;
  weight?: number;
  variants?: ProductVariant[];
  // For linear products
  layoutMode?: 'continuous' | 'segmented';
  minGapLength?: number;  // mm, for segmented
}

// ============================================================================
// Corridor Types
// ============================================================================

export interface CarriagewayConfig {
  width: number;       // metres
  confirmed: boolean;
}

export interface CycleLaneConfig {
  enabled: boolean;
  width: number;       // metres (default 2.0, min 1.5)
  side: 'nearside' | 'offside';
  bufferWidth?: number;
}

export interface Corridor {
  geometry: LineString;        // WGS84
  totalLength: number;         // metres
  carriageway: CarriagewayConfig;
  cycleLane?: CycleLaneConfig;
}

// ============================================================================
// Element Types
// ============================================================================

export interface ChainagePosition {
  s: number;       // distance along corridor (m)
  t: number;       // lateral offset from centreline (m)
  rotation: number; // relative to corridor bearing (deg)
}

export type SnapTarget = 'carriageway' | 'cycleLane' | 'custom';

export interface RunConfig {
  startS: number;
  endS: number;
  layoutMode: 'continuous' | 'segmented';
  pattern: string;        // e.g., 'end-mid-end'
  gapLength?: number;     // metres (for segmented)
  snapTarget: SnapTarget;
  offset: number;         // metres
}

export interface AreaConfig {
  length: number;  // metres
  width: number;   // metres
}

export interface ResolvedQuantities {
  modules: Record<string, number>;  // moduleId -> count
  cuttingRequired?: boolean;
  linearMetres?: number;
  area?: number;
}

export interface PlacedElement {
  id: string;
  productId: string;
  type: 'discrete' | 'run' | 'area';
  position: ChainagePosition;
  runConfig?: RunConfig;
  areaConfig?: AreaConfig;
  resolved?: ResolvedQuantities;
}

// ============================================================================
// Scheme Types
// ============================================================================

export type ViewMode = 'overview' | 'section';

export interface SectionWindow {
  start: number;  // chainage start (m)
  end: number;    // chainage end (m)
}

export interface SchemeMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuantitySummary {
  byProduct: Record<string, {
    count: number;
    linearMetres?: number;
    area?: number;
    modules: Record<string, number>;
  }>;
  totalProducts: number;
}

// ============================================================================
// Store Types
// ============================================================================

// Snapshot of undoable state
export interface HistorySnapshot {
  corridor: Corridor | null;
  elements: Record<string, PlacedElement>;
  elementOrder: string[];
}

export interface SchemeState {
  // Metadata
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;

  // Corridor
  corridor: Corridor | null;

  // Placed elements (ID-keyed)
  elements: Record<string, PlacedElement>;
  elementOrder: string[];  // z-index

  // Selection
  selectedElementId: string | null;

  // View
  viewMode: ViewMode;
  sectionWindow: SectionWindow;

  // UI State
  activePanel: 'library' | 'properties' | null;
  isDrawingCorridor: boolean;

  // History (for undo/redo)
  history: HistorySnapshot[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface SchemeActions {
  // Corridor actions
  setCorridor: (geometry: LineString) => void;
  confirmCarriagewayWidth: (width: number) => void;
  toggleCycleLane: (config: Partial<CycleLaneConfig> | null) => void;

  // Element actions
  addElement: (productId: string, position: ChainagePosition, type?: PlacedElement['type']) => string;
  updateElement: (id: string, changes: Partial<PlacedElement>) => void;
  removeElement: (id: string) => void;

  // Selection
  selectElement: (id: string | null) => void;

  // View
  setViewMode: (mode: ViewMode) => void;
  setSectionWindow: (window: SectionWindow) => void;

  // UI
  setActivePanel: (panel: SchemeState['activePanel']) => void;
  setIsDrawingCorridor: (isDrawing: boolean) => void;

  // Persistence
  saveToBrowser: () => void;
  loadFromBrowser: (id: string) => void;
  exportJSON: () => string;
  importJSON: (json: string) => void;

  // New scheme
  newScheme: () => void;
  setName: (name: string) => void;

  // History
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Computed
  getQuantities: () => QuantitySummary;
}

export type SchemeStore = SchemeState & SchemeActions;

// ============================================================================
// File Format Types
// ============================================================================

export interface SchemeFile {
  version: 1;
  metadata: SchemeMetadata;
  corridor: Corridor | null;
  elements: PlacedElement[];
  quantities: QuantitySummary;
}

// ============================================================================
// Geometry Utility Types
// ============================================================================

export interface ProjectedPoint {
  x: number;  // metres (local)
  y: number;  // metres (local)
  bearing: number;  // degrees
  chainage: number; // metres along corridor
}

export interface ProjectedCorridor {
  points: ProjectedPoint[];
  totalLength: number;
}
