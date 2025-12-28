'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSchemeStore } from '@/stores/schemeStore';
import SearchBox from '@/components/map/SearchBox';
import Toolbar from '@/components/panels/Toolbar';
import ProductLibrary from '@/components/panels/ProductLibrary';
import PropertiesPanel from '@/components/panels/PropertiesPanel';
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

export default function Home() {
  const mapRef = useRef<MapViewHandle>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [placementMode, setPlacementMode] = useState<{ productId: string } | null>(null);

  const name = useSchemeStore((state) => state.name);
  const setName = useSchemeStore((state) => state.setName);
  const corridor = useSchemeStore((state) => state.corridor);
  const selectedElementId = useSchemeStore((state) => state.selectedElementId);
  const selectElement = useSchemeStore((state) => state.selectElement);
  const isCarriagewayConfirmed = corridor?.carriageway.confirmed ?? false;

  // Determine which panel to show
  const showProperties = selectedElementId !== null;

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
    setPlacementMode({ productId: product.id });
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

  // Get map instance from MapView
  useEffect(() => {
    // We need to get the map instance for the SchemeCanvas
    // This is a bit hacky but works for now
    const checkMap = setInterval(() => {
      const mapContainer = document.querySelector('.maplibregl-map');
      if (mapContainer && (mapContainer as any).__maplibre) {
        setMapInstance((mapContainer as any).__maplibre);
        clearInterval(checkMap);
      }
    }, 100);

    return () => clearInterval(checkMap);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
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

        {/* Search Box */}
        <div className="flex-1 max-w-md">
          <SearchBox onSelect={handleSearchSelect} />
        </div>

        {/* Scheme Name */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-2 py-1 text-sm font-medium text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
            placeholder="Untitled Scheme"
          />
          {corridor && (
            <span className="text-sm text-slate-400">
              •{' '}
              {corridor.totalLength >= 1000
                ? `${(corridor.totalLength / 1000).toFixed(2)} km`
                : `${corridor.totalLength.toFixed(0)} m`}
            </span>
          )}
        </div>

        {/* Status indicator */}
        {corridor && (
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

        {/* Placement mode indicator */}
        {placementMode && (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-medium text-blue-700">Placement Mode</span>
            <button
              onClick={() => setPlacementMode(null)}
              className="ml-1 text-blue-600 hover:text-blue-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Product Library or Properties */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
          {showProperties ? (
            <PropertiesPanel />
          ) : (
            <ProductLibrary
              onSelectProduct={handleSelectProduct}
              selectedProductId={placementMode?.productId}
            />
          )}
        </aside>

        {/* Map Container */}
        <main className="flex-1 relative">
          <MapView ref={mapRef} />

          {/* Scheme Canvas (product overlay) */}
          {isCarriagewayConfirmed && mapInstance && (
            <SchemeCanvas
              map={mapInstance}
              placementMode={placementMode}
              onPlacementComplete={handlePlacementComplete}
            />
          )}

          {/* Floating Toolbar */}
          <div className="absolute top-4 right-4 z-10">
            <Toolbar />
          </div>

          {/* Corridor Settings */}
          {corridor && (
            <div className="absolute bottom-4 left-4 z-10 w-80">
              <CorridorSettings />
            </div>
          )}

          {/* Placement mode instructions */}
          {placementMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
              <p className="text-sm">
                Click on the corridor to place product • <kbd className="px-1 bg-blue-500 rounded">Esc</kbd> to cancel
              </p>
            </div>
          )}
        </main>

        {/* Right Panel - Totals */}
        <aside className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0">
          <TotalsPanel />
        </aside>
      </div>
    </div>
  );
}
