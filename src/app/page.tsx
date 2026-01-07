'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type maplibregl from 'maplibre-gl';
import { useSchemeStore } from '@/stores/schemeStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import SearchBox from '@/components/map/SearchBox';
import Toolbar from '@/components/panels/Toolbar';
import ProductLibrary from '@/components/panels/ProductLibrary';
import PropertiesPanel from '@/components/panels/PropertiesPanel';
import CanvasPropertiesPanel from '@/components/custom-canvas/CanvasPropertiesPanel';
import CanvasTotalsPanel from '@/components/custom-canvas/CanvasTotalsPanel';
import TotalsPanel from '@/components/panels/TotalsPanel';
import CorridorSettings from '@/components/panels/CorridorSettings';
import type { MapViewHandle } from '@/components/map/MapView';
import type { Product } from '@/types';

// Dynamic imports for components that use browser APIs
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="text-slate-500">Loading map...</div>
    </div>
  ),
});

const SchemeCanvas = dynamic(() => import('@/components/canvas/SchemeCanvas'), {
  ssr: false,
});

const RunPlacement = dynamic(() => import('@/components/canvas/RunPlacement'), {
  ssr: false,
});

const CustomCanvasView = dynamic(() => import('@/components/custom-canvas/CustomCanvasView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="text-slate-500">Loading canvas...</div>
    </div>
  ),
});

const SketchCanvas = dynamic(
  () => import('@/components/SketchMode/SketchCanvas').then((mod) => mod.SketchCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100">
        <div className="text-slate-500">Loading sketch view...</div>
      </div>
    ),
  }
);

const SketchToolbar = dynamic(
  () => import('@/components/SketchMode/SketchToolbar').then((mod) => mod.SketchToolbar),
  { ssr: false }
);

export default function Home() {
  const mapRef = useRef<MapViewHandle>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [placementMode, setPlacementMode] = useState<{ productId: string; isRun?: boolean } | null>(null);

  // Global keyboard shortcuts
  useKeyboardShortcuts();

  const name = useSchemeStore((state) => state.name);
  const setName = useSchemeStore((state) => state.setName);
  const corridor = useSchemeStore((state) => state.corridor);
  const selectedElementId = useSchemeStore((state) => state.selectedElementId);
  const selectElement = useSchemeStore((state) => state.selectElement);
  const schemeMode = useSchemeStore((state) => state.schemeMode);
  const setSchemeMode = useSchemeStore((state) => state.setSchemeMode);
  const isCarriagewayConfirmed = corridor?.carriageway.confirmed ?? false;

  // Canvas store state
  const canvasSelection = useCanvasStore((state) => state.selection);

  // Check mode
  const isCanvasMode = schemeMode === 'canvas';
  const isSketchMode = schemeMode === 'sketch';
  const isMapMode = schemeMode === 'map';

  // Determine if canvas has any selection
  const hasCanvasSelection =
    canvasSelection.selectedRoadIds.length > 0 ||
    canvasSelection.selectedJunctionIds.length > 0 ||
    canvasSelection.selectedMarkingIds.length > 0 ||
    canvasSelection.selectedSignageIds.length > 0 ||
    canvasSelection.selectedFurnitureIds.length > 0 ||
    canvasSelection.selectedProductIds.length > 0;

  // Determine which panel to show
  const showProperties = isCanvasMode ? hasCanvasSelection : selectedElementId !== null;

  const handleSearchSelect = useCallback(
    (result: {
      lat: number;
      lon: number;
      name: string;
      bbox?: [number, number, number, number];
    }) => {
      if (result.bbox) {
        mapRef.current?.fitBounds([
          [result.bbox[0], result.bbox[1]],
          [result.bbox[2], result.bbox[3]],
        ]);
      } else {
        mapRef.current?.flyTo([result.lon, result.lat], 15);
      }
    },
    []
  );

  const handleSelectProduct = useCallback((product: Product) => {
    // Linear products use run placement mode
    const isRun = product.type === 'linear';
    setPlacementMode({ productId: product.id, isRun });
    // Clear any selected element when entering placement mode
    selectElement(null);
  }, [selectElement]);

  const handlePlacementComplete = useCallback(() => {
    setPlacementMode(null);
  }, []);

  // Cancel placement mode on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && placementMode) {
        setPlacementMode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [placementMode]);

  // Handle map ready callback
  const handleMapReady = useCallback((map: maplibregl.Map) => {
    setMapInstance(map);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FF6B35] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Highways Scheme Planner</h1>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setSchemeMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isMapMode
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Map
          </button>
          <button
            onClick={() => setSchemeMode('sketch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isSketchMode
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Isometric visualisation view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Sketch
          </button>
          <button
            onClick={() => setSchemeMode('canvas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isCanvasMode
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Canvas
          </button>
        </div>

        {/* Search Box - only show in map mode */}
        {isMapMode && (
          <div className="flex-1 max-w-md">
            <SearchBox onSelect={handleSearchSelect} />
          </div>
        )}

        {/* Spacer for canvas/sketch mode */}
        {(isCanvasMode || isSketchMode) && <div className="flex-1" />}

        {/* Scheme Name */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-2 py-1 text-sm font-medium text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#FF6B35] focus:outline-none"
            placeholder="Untitled Scheme"
          />
          {(isMapMode || isSketchMode) && corridor && (
            <span className="text-sm text-slate-400">
              •{' '}
              {corridor.totalLength >= 1000
                ? `${(corridor.totalLength / 1000).toFixed(2)} km`
                : `${corridor.totalLength.toFixed(0)} m`}
            </span>
          )}
        </div>

        {/* Status indicator - map mode only */}
        {isMapMode && corridor && (
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isCarriagewayConfirmed ? 'bg-green-500' : 'bg-amber-500'
              }`}
            />
            <span className="text-xs text-slate-500">
              {isCarriagewayConfirmed ? 'Ready for placement' : 'Confirm carriageway width'}
            </span>
          </div>
        )}

        {/* Canvas mode indicator */}
        {isCanvasMode && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF6B35]" />
            <span className="text-xs text-slate-500">Custom Layout Mode</span>
          </div>
        )}

        {/* Sketch mode indicator */}
        {isSketchMode && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-500">Isometric View</span>
          </div>
        )}

        {/* Placement mode indicator - map mode only */}
        {isMapMode && placementMode && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            placementMode.isRun ? 'bg-purple-100' : 'bg-[#FFF0EB]'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              placementMode.isRun ? 'bg-purple-500' : 'bg-[#FF6B35]'
            }`} />
            <span className={`text-xs font-medium ${
              placementMode.isRun ? 'text-purple-700' : 'text-[#E55A2B]'
            }`}>
              {placementMode.isRun ? 'Run Placement' : 'Placement Mode'}
            </span>
            <button
              onClick={() => setPlacementMode(null)}
              className={placementMode.isRun ? 'ml-1 text-purple-600 hover:text-purple-800' : 'ml-1 text-[#FF6B35] hover:text-[#E55A2B]'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden h-full">
        {/* Left Panel - Product Library or Properties */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
          {showProperties ? (
            isCanvasMode ? (
              <CanvasPropertiesPanel />
            ) : (
              <PropertiesPanel />
            )
          ) : (
            <ProductLibrary
              onSelectProduct={handleSelectProduct}
              selectedProductId={placementMode?.productId}
            />
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 relative h-full">
          {isCanvasMode ? (
            /* Custom Canvas Mode */
            <CustomCanvasView />
          ) : isSketchMode ? (
            /* Sketch Mode - Isometric Visualisation */
            <div className="flex flex-col h-full">
              <SketchToolbar />
              <div className="flex-1 relative">
                <SketchCanvas className="w-full h-full" />
                {/* Empty state if no corridor */}
                {!corridor && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                    <div className="text-center p-8">
                      <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">No Corridor Defined</h3>
                      <p className="text-sm text-slate-500 max-w-xs">
                        Switch to Map mode and draw a corridor to visualise products in Sketch mode.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Map Mode */
            <>
              <MapView ref={mapRef} onMapReady={handleMapReady} />

              {/* Scheme Canvas (product overlay) */}
              {isCarriagewayConfirmed && mapInstance && (
                <SchemeCanvas
                  map={mapInstance}
                  placementMode={placementMode}
                  onPlacementComplete={handlePlacementComplete}
                />
              )}

              {/* Floating Toolbar - positioned below map zoom controls */}
              <div className="absolute top-32 right-4 z-10">
                <Toolbar />
              </div>

              {/* Corridor Settings */}
              {corridor && (
                <div className="absolute bottom-4 left-4 z-10 w-80">
                  <CorridorSettings />
                </div>
              )}

              {/* Run Placement Tool */}
              {placementMode?.isRun && mapInstance && (
                <RunPlacement
                  map={mapInstance}
                  productId={placementMode.productId}
                  onComplete={handlePlacementComplete}
                  onCancel={handlePlacementComplete}
                />
              )}

              {/* Placement mode instructions (discrete products only) */}
              {placementMode && !placementMode.isRun && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-[#FF6B35] text-white px-4 py-2 rounded-lg shadow-lg">
                  <p className="text-sm">
                    Click on the corridor to place product • <kbd className="px-1 bg-[#E55A2B] rounded">Esc</kbd> to cancel
                  </p>
                </div>
              )}
            </>
          )}
        </main>

        {/* Right Panel - Totals */}
        <aside className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0">
          {isCanvasMode ? <CanvasTotalsPanel /> : <TotalsPanel />}
        </aside>
      </div>
    </div>
  );
}
