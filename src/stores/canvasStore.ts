/**
 * Canvas Store
 *
 * Zustand store for custom canvas mode state.
 * Manages roads, junctions, markings, signage, furniture, and products.
 * Includes undo/redo history and export/import functionality.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  CustomCanvasState,
  CanvasViewport,
  CanvasPoint,
  RoadSegment,
  Junction,
  RoadMarking,
  SignagePlacement,
  FurniturePlacement,
  CanvasProduct,
  DrawTool,
  ToolOptions,
  SelectionState,
  BezierControlPoint,
  DEFAULT_CANVAS_STATE,
  DEFAULT_VIEWPORT,
  DEFAULT_ROAD_WIDTH,
  DEFAULT_SELECTION,
} from '@/types/canvas';

// ============================================================================
// History Types
// ============================================================================

const MAX_HISTORY_SIZE = 50;

interface CanvasHistorySnapshot {
  roads: Record<string, RoadSegment>;
  roadOrder: string[];
  junctions: Record<string, Junction>;
  markings: Record<string, RoadMarking>;
  signage: Record<string, SignagePlacement>;
  furniture: Record<string, FurniturePlacement>;
  products: Record<string, CanvasProduct>;
}

// Create a snapshot of the current undoable state
function createSnapshot(state: CanvasStore): CanvasHistorySnapshot {
  return {
    roads: { ...state.roads },
    roadOrder: [...state.roadOrder],
    junctions: { ...state.junctions },
    markings: { ...state.markings },
    signage: { ...state.signage },
    furniture: { ...state.furniture },
    products: { ...state.products },
  };
}

// ============================================================================
// Export/Import Types
// ============================================================================

export interface CanvasExportData {
  version: number;
  exportedAt: string;
  viewport: CanvasViewport;
  roads: Record<string, RoadSegment>;
  roadOrder: string[];
  junctions: Record<string, Junction>;
  markings: Record<string, RoadMarking>;
  signage: Record<string, SignagePlacement>;
  furniture: Record<string, FurniturePlacement>;
  products: Record<string, CanvasProduct>;
}

// ============================================================================
// Store Actions Interface
// ============================================================================

interface CanvasActions {
  // Viewport
  setPan: (pan: CanvasPoint) => void;
  setZoom: (zoom: number) => void;
  resetViewport: () => void;

  // Tools
  setActiveTool: (tool: DrawTool) => void;
  setToolOptions: (options: Partial<ToolOptions>) => void;

  // Roads
  addRoad: (road: Omit<RoadSegment, 'id'>) => string;
  updateRoad: (id: string, changes: Partial<RoadSegment>) => void;
  removeRoad: (id: string) => void;

  // Junctions
  addJunction: (junction: Omit<Junction, 'id'>) => string;
  updateJunction: (id: string, changes: Partial<Junction>) => void;
  removeJunction: (id: string) => void;

  // Markings
  addMarking: (marking: Omit<RoadMarking, 'id'>) => string;
  updateMarking: (id: string, changes: Partial<RoadMarking>) => void;
  removeMarking: (id: string) => void;

  // Signage
  addSignage: (signage: Omit<SignagePlacement, 'id'>) => string;
  updateSignage: (id: string, changes: Partial<SignagePlacement>) => void;
  removeSignage: (id: string) => void;

  // Furniture
  addFurniture: (furniture: Omit<FurniturePlacement, 'id'>) => string;
  updateFurniture: (id: string, changes: Partial<FurniturePlacement>) => void;
  removeFurniture: (id: string) => void;

  // Products
  addProduct: (product: Omit<CanvasProduct, 'id'>) => string;
  updateProduct: (id: string, changes: Partial<CanvasProduct>) => void;
  removeProduct: (id: string) => void;

  // Selection
  selectRoad: (id: string | null) => void;
  selectJunction: (id: string | null) => void;
  selectMarking: (id: string | null) => void;
  selectSignage: (id: string | null) => void;
  selectFurniture: (id: string | null) => void;
  selectProduct: (id: string | null) => void;
  clearSelection: () => void;

  // Snap settings
  setSnapToGrid: (enabled: boolean) => void;
  setSnapToRoad: (enabled: boolean) => void;
  setGridSize: (size: number) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Export/Import
  exportCanvas: () => CanvasExportData;
  importCanvas: (data: CanvasExportData) => boolean;

  // Reset
  resetCanvas: () => void;
}

// Extended state with history
interface CanvasStoreState extends CustomCanvasState {
  history: CanvasHistorySnapshot[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

export type CanvasStore = CanvasStoreState & CanvasActions;

// ============================================================================
// Initial State
// ============================================================================

const createInitialState = (): CanvasStoreState => ({
  viewport: {
    pan: { x: 0, y: 0 },
    zoom: 1.0,
    workspaceSize: {
      width: 200,
      height: 150,
    },
  },
  roads: {},
  roadOrder: [],
  junctions: {},
  markings: {},
  signage: {},
  furniture: {},
  products: {},
  activeTool: 'select',
  toolOptions: {
    roadWidth: 6.5,
  },
  drawingState: null,
  selection: {
    selectedRoadIds: [],
    selectedJunctionIds: [],
    selectedMarkingIds: [],
    selectedSignageIds: [],
    selectedFurnitureIds: [],
    selectedProductIds: [],
  },
  gridSize: 1.0,
  snapToGrid: true,
  snapToRoad: true,
  // History
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
});

// ============================================================================
// Store
// ============================================================================

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    (set, get) => ({
      ...createInitialState(),

      // ======================================================================
      // Viewport Actions
      // ======================================================================

      setPan: (pan: CanvasPoint) => {
        set((state) => ({
          viewport: { ...state.viewport, pan },
        }));
      },

      setZoom: (zoom: number) => {
        // Clamp zoom between 0.1 and 10
        const clampedZoom = Math.max(0.1, Math.min(10, zoom));
        set((state) => ({
          viewport: { ...state.viewport, zoom: clampedZoom },
        }));
      },

      resetViewport: () => {
        set((state) => ({
          viewport: {
            ...state.viewport,
            pan: { x: 0, y: 0 },
            zoom: 1.0,
          },
        }));
      },

      // ======================================================================
      // Tool Actions
      // ======================================================================

      setActiveTool: (tool: DrawTool) => {
        set({
          activeTool: tool,
          drawingState: null, // Clear any in-progress drawing
        });
      },

      setToolOptions: (options: Partial<ToolOptions>) => {
        set((state) => ({
          toolOptions: { ...state.toolOptions, ...options },
        }));
      },

      // ======================================================================
      // Road Actions
      // ======================================================================

      addRoad: (road: Omit<RoadSegment, 'id'>): string => {
        const id = uuidv4();
        const newRoad: RoadSegment = { id, ...road };

        set((state) => ({
          roads: { ...state.roads, [id]: newRoad },
          roadOrder: [...state.roadOrder, id],
        }));

        get().pushHistory();
        return id;
      },

      updateRoad: (id: string, changes: Partial<RoadSegment>) => {
        set((state) => {
          const road = state.roads[id];
          if (!road) return state;

          return {
            roads: {
              ...state.roads,
              [id]: { ...road, ...changes },
            },
          };
        });
        get().pushHistory();
      },

      removeRoad: (id: string) => {
        set((state) => {
          const { [id]: removed, ...restRoads } = state.roads;

          // Also remove associated markings
          const updatedMarkings = { ...state.markings };
          for (const [markingId, marking] of Object.entries(state.markings)) {
            if (marking.roadSegmentId === id) {
              delete updatedMarkings[markingId];
            }
          }

          return {
            roads: restRoads,
            roadOrder: state.roadOrder.filter((rid) => rid !== id),
            markings: updatedMarkings,
            selection: {
              ...state.selection,
              selectedRoadIds: state.selection.selectedRoadIds.filter((rid) => rid !== id),
            },
          };
        });
        get().pushHistory();
      },

      // ======================================================================
      // Junction Actions
      // ======================================================================

      addJunction: (junction: Omit<Junction, 'id'>): string => {
        const id = uuidv4();
        const newJunction: Junction = { id, ...junction };

        set((state) => ({
          junctions: { ...state.junctions, [id]: newJunction },
        }));

        get().pushHistory();
        return id;
      },

      updateJunction: (id: string, changes: Partial<Junction>) => {
        set((state) => {
          const junction = state.junctions[id];
          if (!junction) return state;

          return {
            junctions: {
              ...state.junctions,
              [id]: { ...junction, ...changes },
            },
          };
        });
        get().pushHistory();
      },

      removeJunction: (id: string) => {
        set((state) => {
          const { [id]: removed, ...restJunctions } = state.junctions;

          // Also disconnect any connected roads
          const updatedRoads = { ...state.roads };
          for (const [roadId, road] of Object.entries(state.roads)) {
            if (road.parentJunctionId === id) {
              updatedRoads[roadId] = { ...road, parentJunctionId: undefined };
            }
          }

          return {
            junctions: restJunctions,
            roads: updatedRoads,
            selection: {
              ...state.selection,
              selectedJunctionIds: state.selection.selectedJunctionIds.filter((jid) => jid !== id),
            },
          };
        });
        get().pushHistory();
      },

      // ======================================================================
      // Marking Actions
      // ======================================================================

      addMarking: (marking: Omit<RoadMarking, 'id'>): string => {
        const id = uuidv4();
        const newMarking: RoadMarking = { id, ...marking };

        set((state) => ({
          markings: { ...state.markings, [id]: newMarking },
        }));

        get().pushHistory();
        return id;
      },

      updateMarking: (id: string, changes: Partial<RoadMarking>) => {
        set((state) => {
          const marking = state.markings[id];
          if (!marking) return state;

          return {
            markings: {
              ...state.markings,
              [id]: { ...marking, ...changes },
            },
          };
        });
        get().pushHistory();
      },

      removeMarking: (id: string) => {
        set((state) => {
          const { [id]: removed, ...restMarkings } = state.markings;
          return {
            markings: restMarkings,
            selection: {
              ...state.selection,
              selectedMarkingIds: state.selection.selectedMarkingIds.filter((mid) => mid !== id),
            },
          };
        });
        get().pushHistory();
      },

      // ======================================================================
      // Signage Actions
      // ======================================================================

      addSignage: (signage: Omit<SignagePlacement, 'id'>): string => {
        const id = uuidv4();
        const newSignage: SignagePlacement = { id, ...signage };

        set((state) => ({
          signage: { ...state.signage, [id]: newSignage },
        }));

        get().pushHistory();
        return id;
      },

      updateSignage: (id: string, changes: Partial<SignagePlacement>) => {
        set((state) => {
          const sign = state.signage[id];
          if (!sign) return state;

          return {
            signage: {
              ...state.signage,
              [id]: { ...sign, ...changes },
            },
          };
        });
        get().pushHistory();
      },

      removeSignage: (id: string) => {
        set((state) => {
          const { [id]: removed, ...restSignage } = state.signage;
          return {
            signage: restSignage,
            selection: {
              ...state.selection,
              selectedSignageIds: state.selection.selectedSignageIds.filter((sid) => sid !== id),
            },
          };
        });
        get().pushHistory();
      },

      // ======================================================================
      // Furniture Actions
      // ======================================================================

      addFurniture: (furniture: Omit<FurniturePlacement, 'id'>): string => {
        const id = uuidv4();
        const newFurniture: FurniturePlacement = { id, ...furniture };

        set((state) => ({
          furniture: { ...state.furniture, [id]: newFurniture },
        }));

        get().pushHistory();
        return id;
      },

      updateFurniture: (id: string, changes: Partial<FurniturePlacement>) => {
        set((state) => {
          const item = state.furniture[id];
          if (!item) return state;

          return {
            furniture: {
              ...state.furniture,
              [id]: { ...item, ...changes },
            },
          };
        });
        get().pushHistory();
      },

      removeFurniture: (id: string) => {
        set((state) => {
          const { [id]: removed, ...restFurniture } = state.furniture;
          return {
            furniture: restFurniture,
            selection: {
              ...state.selection,
              selectedFurnitureIds: state.selection.selectedFurnitureIds.filter((fid) => fid !== id),
            },
          };
        });
        get().pushHistory();
      },

      // ======================================================================
      // Product Actions
      // ======================================================================

      addProduct: (product: Omit<CanvasProduct, 'id'>): string => {
        const id = uuidv4();
        const newProduct: CanvasProduct = { id, ...product };

        set((state) => ({
          products: { ...state.products, [id]: newProduct },
        }));

        get().pushHistory();
        return id;
      },

      updateProduct: (id: string, changes: Partial<CanvasProduct>) => {
        set((state) => {
          const product = state.products[id];
          if (!product) return state;

          return {
            products: {
              ...state.products,
              [id]: { ...product, ...changes },
            },
          };
        });
        get().pushHistory();
      },

      removeProduct: (id: string) => {
        set((state) => {
          const { [id]: removed, ...restProducts } = state.products;
          return {
            products: restProducts,
            selection: {
              ...state.selection,
              selectedProductIds: state.selection.selectedProductIds.filter((pid) => pid !== id),
            },
          };
        });
        get().pushHistory();
      },

      // ======================================================================
      // Selection Actions
      // ======================================================================

      selectRoad: (id: string | null) => {
        set((state) => ({
          selection: {
            ...state.selection,
            selectedRoadIds: id ? [id] : [],
            // Clear other selections
            selectedJunctionIds: [],
            selectedMarkingIds: [],
            selectedSignageIds: [],
            selectedFurnitureIds: [],
          },
        }));
      },

      selectJunction: (id: string | null) => {
        set((state) => ({
          selection: {
            ...state.selection,
            selectedJunctionIds: id ? [id] : [],
            // Clear other selections
            selectedRoadIds: [],
            selectedMarkingIds: [],
            selectedSignageIds: [],
            selectedFurnitureIds: [],
          },
        }));
      },

      selectMarking: (id: string | null) => {
        set((state) => ({
          selection: {
            ...state.selection,
            selectedMarkingIds: id ? [id] : [],
            // Clear other selections
            selectedRoadIds: [],
            selectedJunctionIds: [],
            selectedSignageIds: [],
            selectedFurnitureIds: [],
          },
        }));
      },

      selectSignage: (id: string | null) => {
        set((state) => ({
          selection: {
            ...state.selection,
            selectedSignageIds: id ? [id] : [],
            // Clear other selections
            selectedRoadIds: [],
            selectedJunctionIds: [],
            selectedMarkingIds: [],
            selectedFurnitureIds: [],
          },
        }));
      },

      selectFurniture: (id: string | null) => {
        set((state) => ({
          selection: {
            ...state.selection,
            selectedFurnitureIds: id ? [id] : [],
            // Clear other selections
            selectedRoadIds: [],
            selectedJunctionIds: [],
            selectedMarkingIds: [],
            selectedSignageIds: [],
            selectedProductIds: [],
          },
        }));
      },

      selectProduct: (id: string | null) => {
        set((state) => ({
          selection: {
            ...state.selection,
            selectedProductIds: id ? [id] : [],
            // Clear other selections
            selectedRoadIds: [],
            selectedJunctionIds: [],
            selectedMarkingIds: [],
            selectedSignageIds: [],
            selectedFurnitureIds: [],
          },
        }));
      },

      clearSelection: () => {
        set({
          selection: {
            selectedRoadIds: [],
            selectedJunctionIds: [],
            selectedMarkingIds: [],
            selectedSignageIds: [],
            selectedProductIds: [],
            selectedFurnitureIds: [],
          },
        });
      },

      // ======================================================================
      // Snap Settings
      // ======================================================================

      setSnapToGrid: (enabled: boolean) => {
        set({ snapToGrid: enabled });
      },

      setSnapToRoad: (enabled: boolean) => {
        set({ snapToRoad: enabled });
      },

      setGridSize: (size: number) => {
        set({ gridSize: Math.max(0.1, size) });
      },

      // ======================================================================
      // History
      // ======================================================================

      pushHistory: () => {
        const state = get();
        const snapshot = createSnapshot(state);

        // Truncate any "future" history if we're not at the end
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(snapshot);

        // Limit history size
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
        }

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canUndo: newHistory.length > 1,
          canRedo: false,
        });
      },

      undo: () => {
        const state = get();
        if (state.historyIndex <= 0) return;

        const newIndex = state.historyIndex - 1;
        const snapshot = state.history[newIndex];

        set({
          roads: snapshot.roads,
          roadOrder: snapshot.roadOrder,
          junctions: snapshot.junctions,
          markings: snapshot.markings,
          signage: snapshot.signage,
          furniture: snapshot.furniture,
          products: snapshot.products,
          historyIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: true,
          selection: {
            selectedRoadIds: [],
            selectedJunctionIds: [],
            selectedMarkingIds: [],
            selectedSignageIds: [],
            selectedFurnitureIds: [],
            selectedProductIds: [],
          },
        });
      },

      redo: () => {
        const state = get();
        if (state.historyIndex >= state.history.length - 1) return;

        const newIndex = state.historyIndex + 1;
        const snapshot = state.history[newIndex];

        set({
          roads: snapshot.roads,
          roadOrder: snapshot.roadOrder,
          junctions: snapshot.junctions,
          markings: snapshot.markings,
          signage: snapshot.signage,
          furniture: snapshot.furniture,
          products: snapshot.products,
          historyIndex: newIndex,
          canUndo: true,
          canRedo: newIndex < state.history.length - 1,
          selection: {
            selectedRoadIds: [],
            selectedJunctionIds: [],
            selectedMarkingIds: [],
            selectedSignageIds: [],
            selectedFurnitureIds: [],
            selectedProductIds: [],
          },
        });
      },

      // ======================================================================
      // Export/Import
      // ======================================================================

      exportCanvas: () => {
        const state = get();
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          viewport: state.viewport,
          roads: state.roads,
          roadOrder: state.roadOrder,
          junctions: state.junctions,
          markings: state.markings,
          signage: state.signage,
          furniture: state.furniture,
          products: state.products,
        };
      },

      importCanvas: (data: CanvasExportData) => {
        try {
          if (data.version !== 1) {
            console.error('Unsupported canvas export version:', data.version);
            return false;
          }

          set({
            viewport: data.viewport,
            roads: data.roads,
            roadOrder: data.roadOrder,
            junctions: data.junctions,
            markings: data.markings,
            signage: data.signage,
            furniture: data.furniture,
            products: data.products,
            // Reset history on import
            history: [],
            historyIndex: -1,
            canUndo: false,
            canRedo: false,
            // Clear selection
            selection: {
              selectedRoadIds: [],
              selectedJunctionIds: [],
              selectedMarkingIds: [],
              selectedSignageIds: [],
              selectedFurnitureIds: [],
              selectedProductIds: [],
            },
          });

          // Push initial state to history
          get().pushHistory();
          return true;
        } catch (error) {
          console.error('Failed to import canvas:', error);
          return false;
        }
      },

      // ======================================================================
      // Reset
      // ======================================================================

      resetCanvas: () => {
        set(createInitialState());
      },
    }),
    { name: 'canvas-store' }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectViewport = (state: CanvasStore) => state.viewport;
export const selectRoads = (state: CanvasStore) => state.roads;
export const selectRoadOrder = (state: CanvasStore) => state.roadOrder;
export const selectJunctions = (state: CanvasStore) => state.junctions;
export const selectMarkings = (state: CanvasStore) => state.markings;
export const selectActiveTool = (state: CanvasStore) => state.activeTool;
export const selectSelection = (state: CanvasStore) => state.selection;

export const selectSelectedRoad = (state: CanvasStore) => {
  const selectedId = state.selection.selectedRoadIds[0];
  return selectedId ? state.roads[selectedId] : null;
};

export const selectSelectedJunction = (state: CanvasStore) => {
  const selectedId = state.selection.selectedJunctionIds[0];
  return selectedId ? state.junctions[selectedId] : null;
};

// ============================================================================
// Utilities
// ============================================================================

/** Snap a point to the grid */
export function snapToGrid(point: CanvasPoint, gridSize: number): CanvasPoint {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/** Convert screen coordinates to canvas coordinates */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: CanvasViewport,
  containerRect: DOMRect
): CanvasPoint {
  // Get position relative to container
  const relX = screenX - containerRect.left;
  const relY = screenY - containerRect.top;

  // Convert to canvas coordinates (accounting for pan and zoom)
  // Assuming 100 pixels per metre at zoom 1.0
  const pixelsPerMetre = 100 * viewport.zoom;

  return {
    x: relX / pixelsPerMetre + viewport.pan.x,
    y: relY / pixelsPerMetre + viewport.pan.y,
  };
}

/** Convert canvas coordinates to screen coordinates */
export function canvasToScreen(
  point: CanvasPoint,
  viewport: CanvasViewport,
  containerRect: DOMRect
): { x: number; y: number } {
  const pixelsPerMetre = 100 * viewport.zoom;

  return {
    x: (point.x - viewport.pan.x) * pixelsPerMetre + containerRect.left,
    y: (point.y - viewport.pan.y) * pixelsPerMetre + containerRect.top,
  };
}
