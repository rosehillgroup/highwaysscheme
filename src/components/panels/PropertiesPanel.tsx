'use client';

import { useMemo } from 'react';
import { useSchemeStore } from '@/stores/schemeStore';
import { resolveRun, runToQuantities } from '@/lib/products/runResolver';
import productsData from '@/data/products.json';
import type { Product, PlacedElement } from '@/types';

const productsMap = new Map(
  (productsData.products as Product[]).map((p) => [p.id, p])
);

export default function PropertiesPanel() {
  const selectedElementId = useSchemeStore((state) => state.selectedElementId);
  const elements = useSchemeStore((state) => state.elements);
  const updateElement = useSchemeStore((state) => state.updateElement);
  const removeElement = useSchemeStore((state) => state.removeElement);
  const selectElement = useSchemeStore((state) => state.selectElement);
  const corridor = useSchemeStore((state) => state.corridor);

  const selectedElement = selectedElementId ? elements[selectedElementId] : null;
  const product = selectedElement ? productsMap.get(selectedElement.productId) : null;

  const isRun = selectedElement?.type === 'run' && selectedElement.runConfig;

  // Calculate resolved run details
  const resolvedRun = useMemo(() => {
    if (!isRun || !product || !selectedElement?.runConfig) return null;
    return resolveRun(selectedElement.runConfig, product);
  }, [isRun, product, selectedElement?.runConfig]);

  const handlePositionChange = (field: 's' | 't' | 'rotation', value: number) => {
    if (!selectedElementId || !selectedElement) return;

    updateElement(selectedElementId, {
      position: {
        ...selectedElement.position,
        [field]: value,
      },
    });
  };

  const handleRunConfigChange = (
    field: keyof NonNullable<PlacedElement['runConfig']>,
    value: number | string
  ) => {
    if (!selectedElementId || !selectedElement?.runConfig || !product) return;

    const newRunConfig = {
      ...selectedElement.runConfig,
      [field]: value,
    };

    // Re-resolve the run with new config
    const resolved = resolveRun(newRunConfig, product);

    updateElement(selectedElementId, {
      runConfig: newRunConfig,
      resolved: runToQuantities(resolved),
    });
  };

  const handleDelete = () => {
    if (!selectedElementId) return;
    removeElement(selectedElementId);
    selectElement(null);
  };

  const handleDuplicate = () => {
    if (!selectedElementId || !selectedElement) return;

    const addElement = useSchemeStore.getState().addElement;
    // Offset the duplicate slightly
    const newId = addElement(
      selectedElement.productId,
      {
        s: selectedElement.position.s + 5,
        t: selectedElement.position.t,
        rotation: selectedElement.position.rotation,
      },
      selectedElement.type
    );

    // Copy run config if it exists
    if (selectedElement.runConfig) {
      useSchemeStore.getState().updateElement(newId, {
        runConfig: {
          ...selectedElement.runConfig,
          startS: selectedElement.runConfig.startS + 5,
          endS: selectedElement.runConfig.endS + 5,
        },
        resolved: selectedElement.resolved,
      });
    }
  };

  if (!selectedElement || !product) {
    return (
      <div className="p-4">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
          Properties
        </h2>
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">No element selected</p>
          <p className="mt-1 text-xs text-slate-400">
            Click on a placed product to edit its properties
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Properties
          </h2>
          <button
            onClick={() => selectElement(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-900">{product.name}</h3>
          {isRun && (
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
              Run
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} mm
          {product.weight && <span className="ml-2">• {product.weight} kg</span>}
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Run Configuration */}
        {isRun && selectedElement.runConfig && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Run Configuration
            </h4>

            {/* Start/End Chainage */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Start (m)</label>
                <input
                  type="number"
                  value={selectedElement.runConfig.startS.toFixed(1)}
                  onChange={(e) => handleRunConfigChange('startS', parseFloat(e.target.value) || 0)}
                  min={0}
                  max={selectedElement.runConfig.endS - 1}
                  step={0.5}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">End (m)</label>
                <input
                  type="number"
                  value={selectedElement.runConfig.endS.toFixed(1)}
                  onChange={(e) => handleRunConfigChange('endS', parseFloat(e.target.value) || 0)}
                  min={selectedElement.runConfig.startS + 1}
                  max={corridor?.totalLength}
                  step={0.5}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Run Length Display */}
            <div className="flex justify-between text-sm py-2 px-3 bg-slate-100 rounded">
              <span className="text-slate-600">Run Length</span>
              <span className="font-medium text-slate-900">
                {(selectedElement.runConfig.endS - selectedElement.runConfig.startS).toFixed(1)} m
              </span>
            </div>

            {/* Lateral Offset */}
            <div>
              <label className="block text-xs text-slate-600 mb-1">Lateral Offset (m)</label>
              <input
                type="number"
                value={selectedElement.runConfig.offset.toFixed(2)}
                onChange={(e) => handleRunConfigChange('offset', parseFloat(e.target.value) || 0)}
                step={0.1}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-1 mt-1">
                {corridor?.carriageway && (
                  <>
                    <button
                      onClick={() => handleRunConfigChange('offset', -corridor.carriageway.width / 2)}
                      className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                    >
                      Left
                    </button>
                    <button
                      onClick={() => handleRunConfigChange('offset', 0)}
                      className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                    >
                      Centre
                    </button>
                    <button
                      onClick={() => handleRunConfigChange('offset', corridor.carriageway.width / 2)}
                      className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                    >
                      Right
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Layout Mode (for segmented products) */}
            {product.layoutMode === 'segmented' && (
              <div>
                <label className="block text-xs text-slate-600 mb-1">Gap Length (m)</label>
                <input
                  type="number"
                  value={selectedElement.runConfig.gapLength?.toFixed(1) || '2.0'}
                  onChange={(e) => handleRunConfigChange('gapLength', parseFloat(e.target.value) || 2)}
                  min={0.5}
                  max={10}
                  step={0.5}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Distance between each unit
                </p>
              </div>
            )}

            {/* Resolved Module Counts */}
            {resolvedRun && (
              <div className="pt-3 border-t border-slate-200">
                <h5 className="text-xs font-medium text-slate-700 mb-2">Module Breakdown</h5>
                <div className="space-y-1">
                  {Object.entries(resolvedRun.moduleCounts).map(([moduleId, count]) => {
                    const module = product.modules?.find((m) => m.id === moduleId);
                    return (
                      <div key={moduleId} className="flex justify-between text-sm">
                        <span className="text-slate-600">{module?.name || moduleId}</span>
                        <span className="font-medium text-slate-900">{count}</span>
                      </div>
                    );
                  })}
                </div>
                {resolvedRun.cuttingRequired && (
                  <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Cutting may be required
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Discrete Element Position Controls */}
        {!isRun && (
          <div>
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Position
            </h4>

            {/* Chainage (s) */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Chainage (m)</span>
                <span className="text-xs text-slate-400">
                  max: {corridor?.totalLength.toFixed(0) ?? '—'}
                </span>
              </label>
              <input
                type="number"
                value={selectedElement.position.s.toFixed(1)}
                onChange={(e) => handlePositionChange('s', parseFloat(e.target.value) || 0)}
                min={0}
                max={corridor?.totalLength ?? 1000}
                step={0.5}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Lateral Offset (t) */}
            <div className="space-y-2 mt-3">
              <label className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Lateral Offset (m)</span>
                <span className="text-xs text-slate-400">+ = right, − = left</span>
              </label>
              <input
                type="number"
                value={selectedElement.position.t.toFixed(2)}
                onChange={(e) => handlePositionChange('t', parseFloat(e.target.value) || 0)}
                step={0.1}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-1 mt-1">
                {corridor?.carriageway && (
                  <>
                    <button
                      onClick={() => handlePositionChange('t', -corridor.carriageway.width / 2)}
                      className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                    >
                      Left Edge
                    </button>
                    <button
                      onClick={() => handlePositionChange('t', 0)}
                      className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                    >
                      Centre
                    </button>
                    <button
                      onClick={() => handlePositionChange('t', corridor.carriageway.width / 2)}
                      className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                    >
                      Right Edge
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Rotation */}
            <div className="space-y-2 mt-3">
              <label className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Rotation (°)</span>
                <span className="text-xs text-slate-400">relative to road</span>
              </label>
              <input
                type="number"
                value={selectedElement.position.rotation.toFixed(0)}
                onChange={(e) => handlePositionChange('rotation', parseFloat(e.target.value) || 0)}
                step={5}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-1 mt-1">
                {[0, 90, 180, 270].map((angle) => (
                  <button
                    key={angle}
                    onClick={() => handlePositionChange('rotation', angle)}
                    className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                  >
                    {angle}°
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dimensions (read-only) */}
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Unit Dimensions
          </h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-slate-50 p-2 rounded">
              <div className="text-xs text-slate-500">Length</div>
              <div className="font-medium">{product.dimensions.length} mm</div>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <div className="text-xs text-slate-500">Width</div>
              <div className="font-medium">{product.dimensions.width} mm</div>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <div className="text-xs text-slate-500">Height</div>
              <div className="font-medium">{product.dimensions.height} mm</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-200 space-y-2">
        <button
          onClick={handleDuplicate}
          className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Duplicate
        </button>
        <button
          onClick={handleDelete}
          className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}
