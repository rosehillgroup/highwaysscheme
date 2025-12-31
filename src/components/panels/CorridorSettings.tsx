'use client';

import { useState } from 'react';
import { useSchemeStore } from '@/stores/schemeStore';

export default function CorridorSettings() {
  const corridor = useSchemeStore((state) => state.corridor);
  const confirmCarriagewayWidth = useSchemeStore((state) => state.confirmCarriagewayWidth);
  const toggleCycleLane = useSchemeStore((state) => state.toggleCycleLane);
  const viewMode = useSchemeStore((state) => state.viewMode);
  const setViewMode = useSchemeStore((state) => state.setViewMode);
  const sectionWindow = useSchemeStore((state) => state.sectionWindow);
  const setSectionWindow = useSchemeStore((state) => state.setSectionWindow);

  const [width, setWidth] = useState(corridor?.carriageway.width ?? 6.5);
  const [cycleLaneWidth, setCycleLaneWidth] = useState(corridor?.cycleLane?.width ?? 2.0);
  const [cycleLaneSide, setCycleLaneSide] = useState<'nearside' | 'offside'>(
    corridor?.cycleLane?.side ?? 'nearside'
  );
  const [cycleLaneBuffer, setCycleLaneBuffer] = useState(corridor?.cycleLane?.bufferWidth ?? 0);

  if (!corridor) return null;

  const isConfirmed = corridor.carriageway.confirmed;
  const hasCycleLane = corridor.cycleLane?.enabled ?? false;

  const handleConfirmWidth = () => {
    if (width >= 2.5 && width <= 20) {
      confirmCarriagewayWidth(width);
    }
  };

  const handleToggleCycleLane = () => {
    if (hasCycleLane) {
      toggleCycleLane(null);
    } else {
      toggleCycleLane({
        enabled: true,
        width: cycleLaneWidth,
        side: cycleLaneSide,
        bufferWidth: cycleLaneBuffer,
      });
    }
  };

  const handleUpdateCycleLane = () => {
    if (hasCycleLane) {
      toggleCycleLane({
        width: cycleLaneWidth,
        side: cycleLaneSide,
        bufferWidth: cycleLaneBuffer,
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
          Corridor Settings
        </h3>

        {/* View Mode Toggle */}
        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === 'overview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('section')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === 'section'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Section
          </button>
        </div>
      </div>

      {/* Corridor Length */}
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">Corridor Length</span>
        <span className="font-medium text-slate-900">{corridor.totalLength.toFixed(0)} m</span>
      </div>

      {/* Carriageway Width */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          Carriageway Width (m)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
            min={2.5}
            max={20}
            step={0.5}
            disabled={isConfirmed}
            className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] disabled:bg-slate-100 disabled:text-slate-500"
          />
          {!isConfirmed ? (
            <button
              onClick={handleConfirmWidth}
              className="px-4 py-2 text-sm font-medium bg-[#FF6B35] text-white rounded-lg hover:bg-[#E55A2B]"
            >
              Confirm
            </button>
          ) : (
            <button
              onClick={() => {
                // Reset to allow editing
                useSchemeStore.setState((state) => ({
                  corridor: state.corridor
                    ? {
                        ...state.corridor,
                        carriageway: { ...state.corridor.carriageway, confirmed: false },
                      }
                    : null,
                }));
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Edit
            </button>
          )}
        </div>
        {!isConfirmed && (
          <p className="text-xs text-slate-500">
            Confirm carriageway width to enable product placement
          </p>
        )}
        {isConfirmed && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Width confirmed - product placement enabled
          </p>
        )}
      </div>

      {/* Cycle Lane Toggle */}
      {isConfirmed && (
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Cycle Lane</label>
            <button
              onClick={handleToggleCycleLane}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                hasCycleLane ? 'bg-green-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  hasCycleLane ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          {hasCycleLane && (
            <div className="space-y-3 pl-2 border-l-2 border-green-200">
              {/* Width */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Width (m) — min 1.5m
                </label>
                <input
                  type="number"
                  value={cycleLaneWidth}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 1.5;
                    setCycleLaneWidth(Math.max(1.5, val));
                  }}
                  onBlur={handleUpdateCycleLane}
                  min={1.5}
                  max={5}
                  step={0.1}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Side */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Side</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCycleLaneSide('nearside');
                      toggleCycleLane({ side: 'nearside' });
                    }}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded ${
                      cycleLaneSide === 'nearside'
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Nearside (Left)
                  </button>
                  <button
                    onClick={() => {
                      setCycleLaneSide('offside');
                      toggleCycleLane({ side: 'offside' });
                    }}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded ${
                      cycleLaneSide === 'offside'
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Offside (Right)
                  </button>
                </div>
              </div>

              {/* Buffer */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Buffer Width (m)
                </label>
                <input
                  type="number"
                  value={cycleLaneBuffer}
                  onChange={(e) => setCycleLaneBuffer(parseFloat(e.target.value) || 0)}
                  onBlur={handleUpdateCycleLane}
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section View Controls */}
      {viewMode === 'section' && (
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Section View</label>
            <span className="text-xs text-slate-500">
              {sectionWindow.end - sectionWindow.start}m window
            </span>
          </div>

          {/* Section Position Slider */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-600">
              Position: {sectionWindow.start.toFixed(0)}m - {sectionWindow.end.toFixed(0)}m
            </label>
            <input
              type="range"
              min={0}
              max={Math.max(0, corridor.totalLength - (sectionWindow.end - sectionWindow.start))}
              value={sectionWindow.start}
              onChange={(e) => {
                const start = parseFloat(e.target.value);
                const windowSize = sectionWindow.end - sectionWindow.start;
                setSectionWindow({ start, end: start + windowSize });
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>0m</span>
              <span>{corridor.totalLength.toFixed(0)}m</span>
            </div>
          </div>

          {/* Window Size */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-600">Window Size</label>
            <div className="flex gap-2">
              {[50, 100, 200, 500].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    const maxStart = Math.max(0, corridor.totalLength - size);
                    const newStart = Math.min(sectionWindow.start, maxStart);
                    setSectionWindow({ start: newStart, end: newStart + size });
                  }}
                  className={`flex-1 px-2 py-1 text-xs font-medium rounded ${
                    Math.abs(sectionWindow.end - sectionWindow.start - size) < 1
                      ? 'bg-[#FF6B35] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {size}m
                </button>
              ))}
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const windowSize = sectionWindow.end - sectionWindow.start;
                const newStart = Math.max(0, sectionWindow.start - windowSize);
                setSectionWindow({ start: newStart, end: newStart + windowSize });
              }}
              disabled={sectionWindow.start <= 0}
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => {
                const windowSize = sectionWindow.end - sectionWindow.start;
                const newStart = Math.min(corridor.totalLength - windowSize, sectionWindow.start + windowSize);
                setSectionWindow({ start: newStart, end: newStart + windowSize });
              }}
              disabled={sectionWindow.end >= corridor.totalLength}
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
