'use client';

import dynamic from 'next/dynamic';
import { useSchemeStore } from '@/stores/schemeStore';
import SearchBox from '@/components/map/SearchBox';
import Toolbar from '@/components/panels/Toolbar';
import ProductLibrary from '@/components/panels/ProductLibrary';
import TotalsPanel from '@/components/panels/TotalsPanel';

// Dynamic import for MapView (requires window object)
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="text-slate-500">Loading map...</div>
    </div>
  ),
});

export default function Home() {
  const name = useSchemeStore((state) => state.name);
  const corridor = useSchemeStore((state) => state.corridor);
  const activePanel = useSchemeStore((state) => state.activePanel);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Highways Scheme Planner</h1>
        </div>

        {/* Search Box */}
        <div className="flex-1 max-w-md">
          <SearchBox
            onSelect={(result) => {
              // Will trigger map fly-to via MapView
              console.log('Selected:', result);
            }}
          />
        </div>

        {/* Scheme Name */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="font-medium">{name}</span>
          {corridor && (
            <span className="text-slate-400">
              • {(corridor.totalLength / 1000).toFixed(2)} km
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Product Library */}
        {activePanel === 'library' && (
          <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
            <ProductLibrary />
          </aside>
        )}

        {/* Map Container */}
        <main className="flex-1 relative">
          <MapView />

          {/* Floating Toolbar */}
          <div className="absolute top-4 right-4">
            <Toolbar />
          </div>

          {/* Corridor Info */}
          {corridor && (
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Corridor</div>
              <div className="text-sm font-medium text-slate-900">
                {corridor.totalLength.toFixed(0)} m
              </div>
              {corridor.carriageway.confirmed && (
                <div className="text-xs text-slate-600 mt-1">
                  Carriageway: {corridor.carriageway.width} m
                </div>
              )}
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
