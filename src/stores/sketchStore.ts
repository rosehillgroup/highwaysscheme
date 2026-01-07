/**
 * Sketch Mode Store
 *
 * Manages state for the isometric Sketch Mode view.
 * Works in tandem with schemeStore - products are stored in schemeStore,
 * this store handles view-specific state for the Phaser-based visualisation.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export interface SketchViewState {
  // Mode toggle
  isSketchMode: boolean;

  // View settings
  scale: number; // metres per grid unit (default: 10)
  zoom: number; // 0.5 to 2.0
  cameraOffset: { x: number; y: number };

  // Interaction state
  selectedProductId: string | null;
  hoveredProductId: string | null;
  isDragging: boolean;
  dragStartPosition: { x: number; y: number } | null;

  // Grid settings
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number; // metres

  // Display options
  showChainageLabels: boolean;
  showProductLabels: boolean;
}

export interface SketchViewActions {
  // Mode
  toggleSketchMode: () => void;
  setSketchMode: (enabled: boolean) => void;

  // View controls
  setScale: (scale: number) => void;
  setZoom: (zoom: number) => void;
  panCamera: (dx: number, dy: number) => void;
  resetCamera: () => void;

  // Selection
  selectProduct: (id: string | null) => void;
  setHoveredProduct: (id: string | null) => void;

  // Dragging
  startDrag: (x: number, y: number) => void;
  endDrag: () => void;

  // Grid settings
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;

  // Display options
  toggleChainageLabels: () => void;
  toggleProductLabels: () => void;
}

export type SketchStore = SketchViewState & SketchViewActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: SketchViewState = {
  isSketchMode: false,
  scale: 5, // 5 metres per grid unit (matches DEFAULT_SCALE in coordinates.ts)
  zoom: 1.0,
  cameraOffset: { x: 0, y: 0 },
  selectedProductId: null,
  hoveredProductId: null,
  isDragging: false,
  dragStartPosition: null,
  showGrid: true,
  snapToGrid: true,
  gridSize: 5, // 5 metre grid
  showChainageLabels: true,
  showProductLabels: true,
};

// ============================================================================
// Store
// ============================================================================

export const useSketchStore = create<SketchStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ======================================================================
      // Mode Actions
      // ======================================================================

      toggleSketchMode: () => {
        set((state) => ({
          isSketchMode: !state.isSketchMode,
          // Reset selection when switching modes
          selectedProductId: null,
          hoveredProductId: null,
        }));
      },

      setSketchMode: (enabled: boolean) => {
        set({
          isSketchMode: enabled,
          selectedProductId: null,
          hoveredProductId: null,
        });
      },

      // ======================================================================
      // View Controls
      // ======================================================================

      setScale: (scale: number) => {
        // Clamp scale between 1 and 50 metres per grid unit
        const clampedScale = Math.max(1, Math.min(50, scale));
        set({ scale: clampedScale });
      },

      setZoom: (zoom: number) => {
        // Clamp zoom between 0.25 and 3.0
        const clampedZoom = Math.max(0.25, Math.min(3.0, zoom));
        set({ zoom: clampedZoom });
      },

      panCamera: (dx: number, dy: number) => {
        set((state) => ({
          cameraOffset: {
            x: state.cameraOffset.x + dx,
            y: state.cameraOffset.y + dy,
          },
        }));
      },

      resetCamera: () => {
        set({
          cameraOffset: { x: 0, y: 0 },
          zoom: 1.0,
        });
      },

      // ======================================================================
      // Selection
      // ======================================================================

      selectProduct: (id: string | null) => {
        set({ selectedProductId: id });
      },

      setHoveredProduct: (id: string | null) => {
        set({ hoveredProductId: id });
      },

      // ======================================================================
      // Dragging
      // ======================================================================

      startDrag: (x: number, y: number) => {
        set({
          isDragging: true,
          dragStartPosition: { x, y },
        });
      },

      endDrag: () => {
        set({
          isDragging: false,
          dragStartPosition: null,
        });
      },

      // ======================================================================
      // Grid Settings
      // ======================================================================

      toggleGrid: () => {
        set((state) => ({ showGrid: !state.showGrid }));
      },

      toggleSnapToGrid: () => {
        set((state) => ({ snapToGrid: !state.snapToGrid }));
      },

      setGridSize: (size: number) => {
        const clampedSize = Math.max(1, Math.min(50, size));
        set({ gridSize: clampedSize });
      },

      // ======================================================================
      // Display Options
      // ======================================================================

      toggleChainageLabels: () => {
        set((state) => ({ showChainageLabels: !state.showChainageLabels }));
      },

      toggleProductLabels: () => {
        set((state) => ({ showProductLabels: !state.showProductLabels }));
      },
    }),
    { name: 'sketch-store' }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectIsSketchMode = (state: SketchStore) => state.isSketchMode;
export const selectZoom = (state: SketchStore) => state.zoom;
export const selectCameraOffset = (state: SketchStore) => state.cameraOffset;
export const selectSelectedProductId = (state: SketchStore) => state.selectedProductId;
export const selectShowGrid = (state: SketchStore) => state.showGrid;
