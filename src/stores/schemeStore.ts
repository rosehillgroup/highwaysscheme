import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { LineString } from 'geojson';
import * as turf from '@turf/turf';
import type {
  SchemeStore,
  SchemeState,
  PlacedElement,
  ChainagePosition,
  CycleLaneConfig,
  ViewMode,
  SchemeMode,
  SectionWindow,
  QuantitySummary,
  Corridor,
  HistorySnapshot,
} from '@/types';

const MAX_HISTORY_SIZE = 50;

const STORAGE_KEY = 'highways-scheme-planner-schemes';
const CURRENT_SCHEME_KEY = 'highways-scheme-planner-current';

function createInitialState(): SchemeState {
  return {
    id: uuidv4(),
    name: 'Untitled Scheme',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemeMode: 'map',
    corridor: null,
    elements: {},
    elementOrder: [],
    selectedElementId: null,
    viewMode: 'overview',
    sectionWindow: { start: 0, end: 200 },
    activePanel: 'library',
    isDrawingCorridor: false,
    history: [],
    historyIndex: -1,
    canUndo: false,
    canRedo: false,
  };
}

// Create a snapshot of the current undoable state
function createSnapshot(state: SchemeState): HistorySnapshot {
  return {
    corridor: state.corridor ? JSON.parse(JSON.stringify(state.corridor)) : null,
    elements: JSON.parse(JSON.stringify(state.elements)),
    elementOrder: [...state.elementOrder],
  };
}

export const useSchemeStore = create<SchemeStore>()(
  devtools(
    (set, get) => ({
      ...createInitialState(),

      // ======================================================================
      // Mode Actions
      // ======================================================================

      setSchemeMode: (mode: SchemeMode) => {
        set({
          schemeMode: mode,
          // Reset drawing state when switching modes
          isDrawingCorridor: false,
          selectedElementId: null,
        });
      },

      // ======================================================================
      // Corridor Actions
      // ======================================================================

      setCorridor: (geometry: LineString) => {
        get().pushHistory();
        const length = turf.length(turf.lineString(geometry.coordinates), { units: 'meters' });

        set((state) => ({
          corridor: {
            geometry,
            totalLength: length,
            carriageway: {
              width: 6.5, // Default UK carriageway width
              confirmed: false,
            },
          },
          updatedAt: new Date().toISOString(),
          isDrawingCorridor: false,
          // Reset section window to start of corridor
          sectionWindow: { start: 0, end: Math.min(200, length) },
        }));
      },

      confirmCarriagewayWidth: (width: number) => {
        set((state) => {
          if (!state.corridor) return state;
          return {
            corridor: {
              ...state.corridor,
              carriageway: {
                width,
                confirmed: true,
              },
            },
            updatedAt: new Date().toISOString(),
          };
        });
      },

      toggleCycleLane: (config: Partial<CycleLaneConfig> | null) => {
        set((state) => {
          if (!state.corridor) return state;

          if (config === null) {
            // Remove cycle lane
            const { cycleLane, ...rest } = state.corridor;
            return {
              corridor: rest as Corridor,
              updatedAt: new Date().toISOString(),
            };
          }

          // Add or update cycle lane
          const currentCycleLane = state.corridor.cycleLane || {
            enabled: true,
            width: 2.0,
            side: 'nearside' as const,
          };

          return {
            corridor: {
              ...state.corridor,
              cycleLane: {
                ...currentCycleLane,
                ...config,
                enabled: true,
              },
            },
            updatedAt: new Date().toISOString(),
          };
        });
      },

      // ======================================================================
      // Element Actions
      // ======================================================================

      addElement: (
        productId: string,
        position: ChainagePosition,
        type: PlacedElement['type'] = 'discrete'
      ): string => {
        get().pushHistory();
        const id = uuidv4();
        const element: PlacedElement = {
          id,
          productId,
          type,
          position,
        };

        set((state) => ({
          elements: {
            ...state.elements,
            [id]: element,
          },
          elementOrder: [...state.elementOrder, id],
          selectedElementId: id,
          updatedAt: new Date().toISOString(),
        }));

        return id;
      },

      updateElement: (id: string, changes: Partial<PlacedElement>) => {
        get().pushHistory();
        set((state) => {
          const element = state.elements[id];
          if (!element) return state;

          return {
            elements: {
              ...state.elements,
              [id]: {
                ...element,
                ...changes,
              },
            },
            updatedAt: new Date().toISOString(),
          };
        });
      },

      removeElement: (id: string) => {
        get().pushHistory();
        set((state) => {
          const { [id]: removed, ...restElements } = state.elements;
          return {
            elements: restElements,
            elementOrder: state.elementOrder.filter((eid) => eid !== id),
            selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
            updatedAt: new Date().toISOString(),
          };
        });
      },

      // ======================================================================
      // Selection
      // ======================================================================

      selectElement: (id: string | null) => {
        set({ selectedElementId: id });
      },

      // ======================================================================
      // View
      // ======================================================================

      setViewMode: (mode: ViewMode) => {
        set({ viewMode: mode });
      },

      setSectionWindow: (window: SectionWindow) => {
        set({ sectionWindow: window });
      },

      // ======================================================================
      // UI
      // ======================================================================

      setActivePanel: (panel: SchemeState['activePanel']) => {
        set({ activePanel: panel });
      },

      setIsDrawingCorridor: (isDrawing: boolean) => {
        set({ isDrawingCorridor: isDrawing });
      },

      // ======================================================================
      // Persistence
      // ======================================================================

      saveToBrowser: () => {
        const state = get();
        const schemeData = {
          id: state.id,
          name: state.name,
          createdAt: state.createdAt,
          updatedAt: new Date().toISOString(),
          corridor: state.corridor,
          elements: state.elements,
          elementOrder: state.elementOrder,
        };

        // Get existing schemes
        const existingData = localStorage.getItem(STORAGE_KEY);
        const schemes: Record<string, typeof schemeData> = existingData
          ? JSON.parse(existingData)
          : {};

        // Save/update this scheme
        schemes[state.id] = schemeData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes));

        // Set as current
        localStorage.setItem(CURRENT_SCHEME_KEY, state.id);

        set({ updatedAt: schemeData.updatedAt });
      },

      loadFromBrowser: (id: string) => {
        const existingData = localStorage.getItem(STORAGE_KEY);
        if (!existingData) return;

        const schemes = JSON.parse(existingData);
        const schemeData = schemes[id];
        if (!schemeData) return;

        set({
          id: schemeData.id,
          name: schemeData.name,
          createdAt: schemeData.createdAt,
          updatedAt: schemeData.updatedAt,
          corridor: schemeData.corridor,
          elements: schemeData.elements || {},
          elementOrder: schemeData.elementOrder || [],
          selectedElementId: null,
          viewMode: 'overview',
          sectionWindow: { start: 0, end: 200 },
        });

        localStorage.setItem(CURRENT_SCHEME_KEY, id);
      },

      exportJSON: (): string => {
        const state = get();
        const schemeFile = {
          version: 1,
          metadata: {
            id: state.id,
            name: state.name,
            createdAt: state.createdAt,
            updatedAt: new Date().toISOString(),
          },
          corridor: state.corridor,
          elements: Object.values(state.elements),
          quantities: get().getQuantities(),
        };
        return JSON.stringify(schemeFile, null, 2);
      },

      importJSON: (json: string) => {
        try {
          const schemeFile = JSON.parse(json);
          if (schemeFile.version !== 1) {
            console.error('Unsupported scheme file version');
            return;
          }

          const elements: Record<string, PlacedElement> = {};
          const elementOrder: string[] = [];

          for (const element of schemeFile.elements || []) {
            elements[element.id] = element;
            elementOrder.push(element.id);
          }

          set({
            id: schemeFile.metadata.id || uuidv4(),
            name: schemeFile.metadata.name || 'Imported Scheme',
            createdAt: schemeFile.metadata.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            corridor: schemeFile.corridor,
            elements,
            elementOrder,
            selectedElementId: null,
            viewMode: 'overview',
            sectionWindow: { start: 0, end: 200 },
          });
        } catch (error) {
          console.error('Failed to import scheme:', error);
        }
      },

      // ======================================================================
      // New Scheme
      // ======================================================================

      newScheme: () => {
        set(createInitialState());
      },

      setName: (name: string) => {
        set({ name, updatedAt: new Date().toISOString() });
      },

      // ======================================================================
      // History (Undo/Redo)
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
          corridor: snapshot.corridor,
          elements: snapshot.elements,
          elementOrder: snapshot.elementOrder,
          historyIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: true,
          selectedElementId: null,
          updatedAt: new Date().toISOString(),
        });
      },

      redo: () => {
        const state = get();
        if (state.historyIndex >= state.history.length - 1) return;

        const newIndex = state.historyIndex + 1;
        const snapshot = state.history[newIndex];

        set({
          corridor: snapshot.corridor,
          elements: snapshot.elements,
          elementOrder: snapshot.elementOrder,
          historyIndex: newIndex,
          canUndo: true,
          canRedo: newIndex < state.history.length - 1,
          selectedElementId: null,
          updatedAt: new Date().toISOString(),
        });
      },

      // ======================================================================
      // Computed
      // ======================================================================

      getQuantities: (): QuantitySummary => {
        const state = get();
        const byProduct: QuantitySummary['byProduct'] = {};
        let totalProducts = 0;

        for (const element of Object.values(state.elements)) {
          if (!byProduct[element.productId]) {
            byProduct[element.productId] = {
              count: 0,
              modules: {},
            };
          }

          byProduct[element.productId].count += 1;
          totalProducts += 1;

          // Add resolved modules if available
          if (element.resolved?.modules) {
            for (const [moduleId, count] of Object.entries(element.resolved.modules)) {
              byProduct[element.productId].modules[moduleId] =
                (byProduct[element.productId].modules[moduleId] || 0) + count;
            }
          }

          // Add linear metres for runs
          if (element.runConfig && element.resolved?.linearMetres) {
            byProduct[element.productId].linearMetres =
              (byProduct[element.productId].linearMetres || 0) + element.resolved.linearMetres;
          }

          // Add area for area elements
          if (element.areaConfig && element.resolved?.area) {
            byProduct[element.productId].area =
              (byProduct[element.productId].area || 0) + element.resolved.area;
          }
        }

        return { byProduct, totalProducts };
      },
    }),
    { name: 'scheme-store' }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectCorridor = (state: SchemeStore) => state.corridor;
export const selectElements = (state: SchemeStore) => state.elements;
export const selectSelectedElement = (state: SchemeStore) =>
  state.selectedElementId ? state.elements[state.selectedElementId] : null;
export const selectIsCarriagewayConfirmed = (state: SchemeStore) =>
  state.corridor?.carriageway.confirmed ?? false;
export const selectViewMode = (state: SchemeStore) => state.viewMode;
export const selectSectionWindow = (state: SchemeStore) => state.sectionWindow;

// ============================================================================
// Utilities
// ============================================================================

export function getStoredSchemes(): Array<{ id: string; name: string; updatedAt: string }> {
  if (typeof window === 'undefined') return [];

  const existingData = localStorage.getItem(STORAGE_KEY);
  if (!existingData) return [];

  const schemes = JSON.parse(existingData);
  return Object.values(schemes).map((s: any) => ({
    id: s.id,
    name: s.name,
    updatedAt: s.updatedAt,
  }));
}

export function deleteStoredScheme(id: string): void {
  if (typeof window === 'undefined') return;

  const existingData = localStorage.getItem(STORAGE_KEY);
  if (!existingData) return;

  const schemes = JSON.parse(existingData);
  delete schemes[id];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes));
}
