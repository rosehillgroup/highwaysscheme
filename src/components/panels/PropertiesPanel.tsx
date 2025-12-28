'use client';

import { useMemo } from 'react';
import { useSchemeStore } from '@/stores/schemeStore';
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

  const handlePositionChange = (field: 's' | 't' | 'rotation', value: number) => {
    if (!selectedElementId || !selectedElement) return;

    updateElement(selectedElementId, {
      position: {
        ...selectedElement.position,
        [field]: value,
      },
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
    addElement(selectedElement.productId, {
      s: selectedElement.position.s + 5,
      t: selectedElement.position.t,
      rotation: selectedElement.position.rotation,
    }, selectedElement.type);
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
        <h3 className="text-sm font-medium text-slate-900">{product.name}</h3>
        <p className="text-xs text-slate-500 mt-1">
          {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} mm
          {product.weight && <span className="ml-2">• {product.weight} kg</span>}
        </p>
      </div>

      {/* Position Controls */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
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
              <span className="text-xs text-slate-400">
                + = right, − = left
              </span>
            </label>
            <input
              type="number"
              value={selectedElement.position.t.toFixed(2)}
              onChange={(e) => handlePositionChange('t', parseFloat(e.target.value) || 0)}
              step={0.1}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Quick offset buttons */}
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

            {/* Quick rotation buttons */}
            <div className="flex gap-1 mt-1">
              <button
                onClick={() => handlePositionChange('rotation', 0)}
                className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
              >
                0°
              </button>
              <button
                onClick={() => handlePositionChange('rotation', 90)}
                className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
              >
                90°
              </button>
              <button
                onClick={() => handlePositionChange('rotation', 180)}
                className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
              >
                180°
              </button>
              <button
                onClick={() => handlePositionChange('rotation', 270)}
                className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
              >
                270°
              </button>
            </div>
          </div>
        </div>

        {/* Dimensions (read-only) */}
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Dimensions
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
