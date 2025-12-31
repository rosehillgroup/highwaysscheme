'use client';

import React from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import type { RoadSegment, Junction, RoadMarking, SignagePlacement, FurniturePlacement, CanvasProduct, JunctionType, LaneDirection } from '@/types/canvas';
import signageData from '@/data/signage.json';
import furnitureData from '@/data/furniture.json';
import markingsData from '@/data/markings.json';
import productsData from '@/data/products.json';

// Helper to get sign name
function getSignName(signType: string): string {
  const sign = signageData.signs.find((s) => s.id === signType);
  return sign?.name || signType;
}

// Helper to get furniture name
function getFurnitureName(furnitureType: string): string {
  const item = furnitureData.items.find((f) => f.id === furnitureType);
  return item?.name || furnitureType;
}

// Helper to get marking name
function getMarkingName(markingType: string): string {
  const marking = markingsData.markings.find((m) => m.id === markingType);
  return marking?.name || markingType;
}

// Helper to get product name
function getProductName(productId: string): string {
  const product = productsData.products.find((p) => p.id === productId);
  return product?.name || productId;
}

// Junction type labels
const JUNCTION_TYPE_LABELS: Record<JunctionType, string> = {
  't-junction': 'T-Junction',
  'crossroads': 'Crossroads',
  'roundabout': 'Roundabout',
  'mini-roundabout': 'Mini Roundabout',
  'staggered': 'Staggered Junction',
};

/**
 * CanvasPropertiesPanel - Properties panel for custom canvas mode
 *
 * Displays and edits properties for selected elements:
 * - Roads: width, lanes, cycle lane
 * - Junctions: type, rotation
 * - Markings: position, rotation
 * - Signage: position, rotation
 * - Furniture: position, rotation
 * - Products: position, rotation, quantity
 */
export default function CanvasPropertiesPanel() {
  // Store state
  const selection = useCanvasStore((state) => state.selection);
  const roads = useCanvasStore((state) => state.roads);
  const junctions = useCanvasStore((state) => state.junctions);
  const markings = useCanvasStore((state) => state.markings);
  const signage = useCanvasStore((state) => state.signage);
  const furniture = useCanvasStore((state) => state.furniture);
  const products = useCanvasStore((state) => state.products);

  // Store actions
  const updateRoad = useCanvasStore((state) => state.updateRoad);
  const removeRoad = useCanvasStore((state) => state.removeRoad);
  const updateJunction = useCanvasStore((state) => state.updateJunction);
  const removeJunction = useCanvasStore((state) => state.removeJunction);
  const updateMarking = useCanvasStore((state) => state.updateMarking);
  const removeMarking = useCanvasStore((state) => state.removeMarking);
  const updateSignage = useCanvasStore((state) => state.updateSignage);
  const removeSignage = useCanvasStore((state) => state.removeSignage);
  const updateFurniture = useCanvasStore((state) => state.updateFurniture);
  const removeFurniture = useCanvasStore((state) => state.removeFurniture);
  const updateProduct = useCanvasStore((state) => state.updateProduct);
  const removeProduct = useCanvasStore((state) => state.removeProduct);
  const clearSelection = useCanvasStore((state) => state.clearSelection);

  // Get selected elements
  const selectedRoadId = selection.selectedRoadIds[0];
  const selectedJunctionId = selection.selectedJunctionIds[0];
  const selectedMarkingId = selection.selectedMarkingIds[0];
  const selectedSignId = selection.selectedSignageIds[0];
  const selectedFurnitureId = selection.selectedFurnitureIds[0];
  const selectedProductId = selection.selectedProductIds[0];

  const selectedRoad = selectedRoadId ? roads[selectedRoadId] : null;
  const selectedJunction = selectedJunctionId ? junctions[selectedJunctionId] : null;
  const selectedMarking = selectedMarkingId ? markings[selectedMarkingId] : null;
  const selectedSign = selectedSignId ? signage[selectedSignId] : null;
  const selectedFurnitureItem = selectedFurnitureId ? furniture[selectedFurnitureId] : null;
  const selectedProduct = selectedProductId ? products[selectedProductId] : null;

  // No selection - show empty state
  if (!selectedRoad && !selectedJunction && !selectedMarking && !selectedSign && !selectedFurnitureItem && !selectedProduct) {
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
            Click on a road, junction, or placed item to edit
          </p>
        </div>
      </div>
    );
  }

  // Road properties
  if (selectedRoad && selectedRoadId) {
    return (
      <RoadProperties
        road={selectedRoad}
        onUpdate={(changes) => updateRoad(selectedRoadId, changes)}
        onDelete={() => { removeRoad(selectedRoadId); clearSelection(); }}
        onClose={clearSelection}
      />
    );
  }

  // Junction properties
  if (selectedJunction && selectedJunctionId) {
    return (
      <JunctionProperties
        junction={selectedJunction}
        onUpdate={(changes) => updateJunction(selectedJunctionId, changes)}
        onDelete={() => { removeJunction(selectedJunctionId); clearSelection(); }}
        onClose={clearSelection}
      />
    );
  }

  // Marking properties
  if (selectedMarking && selectedMarkingId) {
    return (
      <MarkingProperties
        marking={selectedMarking}
        onUpdate={(changes) => updateMarking(selectedMarkingId, changes)}
        onDelete={() => { removeMarking(selectedMarkingId); clearSelection(); }}
        onClose={clearSelection}
      />
    );
  }

  // Signage properties
  if (selectedSign && selectedSignId) {
    return (
      <SignageProperties
        sign={selectedSign}
        onUpdate={(changes) => updateSignage(selectedSignId, changes)}
        onDelete={() => { removeSignage(selectedSignId); clearSelection(); }}
        onClose={clearSelection}
      />
    );
  }

  // Furniture properties
  if (selectedFurnitureItem && selectedFurnitureId) {
    return (
      <FurnitureProperties
        item={selectedFurnitureItem}
        onUpdate={(changes) => updateFurniture(selectedFurnitureId, changes)}
        onDelete={() => { removeFurniture(selectedFurnitureId); clearSelection(); }}
        onClose={clearSelection}
      />
    );
  }

  // Product properties
  if (selectedProduct && selectedProductId) {
    return (
      <ProductProperties
        product={selectedProduct}
        onUpdate={(changes) => updateProduct(selectedProductId, changes)}
        onDelete={() => { removeProduct(selectedProductId); clearSelection(); }}
        onClose={clearSelection}
      />
    );
  }

  return null;
}

// ============================================================================
// Road Properties Component
// ============================================================================

interface RoadPropertiesProps {
  road: RoadSegment;
  onUpdate: (changes: Partial<RoadSegment>) => void;
  onDelete: () => void;
  onClose: () => void;
}

function RoadProperties({ road, onUpdate, onDelete, onClose }: RoadPropertiesProps) {
  const handleWidthChange = (width: number) => {
    onUpdate({
      width,
      lanes: {
        ...road.lanes,
        widths: road.lanes.widths.map(() => width / road.lanes.count),
      },
    });
  };

  const handleLaneCountChange = (count: number) => {
    const laneWidth = road.width / count;
    const widths = Array(count).fill(laneWidth);
    const directions: LaneDirection[] = count === 1
      ? ['forward']
      : count === 2
        ? ['forward', 'backward']
        : Array(count).fill('forward');

    onUpdate({
      lanes: { count, widths, directions },
    });
  };

  const handleCycleLaneToggle = () => {
    if (road.cycleLane?.enabled) {
      onUpdate({ cycleLane: { ...road.cycleLane, enabled: false } });
    } else {
      onUpdate({
        cycleLane: {
          enabled: true,
          width: 2.0,
          side: 'nearside',
        },
      });
    }
  };

  // Calculate road length from points (approximate)
  const roadLength = road.length ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Road Properties
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Road Info */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded capitalize">
            {road.type}
          </span>
          <span className="text-xs text-slate-500">
            {road.points.length} points
          </span>
        </div>
        {roadLength > 0 && (
          <p className="text-xs text-slate-500 mt-1">
            Length: {roadLength.toFixed(1)} m
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Carriageway Width */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Carriageway Width (m)
          </label>
          <input
            type="number"
            value={road.width.toFixed(1)}
            onChange={(e) => handleWidthChange(parseFloat(e.target.value) || 3)}
            min={3}
            max={20}
            step={0.5}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
          />
          <div className="flex gap-1 mt-2">
            {[5.5, 6.5, 7.3, 10].map((w) => (
              <button
                key={w}
                onClick={() => handleWidthChange(w)}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  Math.abs(road.width - w) < 0.1
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {w}m
              </button>
            ))}
          </div>
        </div>

        {/* Lane Count */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Number of Lanes
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((count) => (
              <button
                key={count}
                onClick={() => handleLaneCountChange(count)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  road.lanes.count === count
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Lane width: {(road.width / road.lanes.count).toFixed(2)} m
          </p>
        </div>

        {/* Cycle Lane */}
        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Cycle Lane
            </label>
            <button
              onClick={handleCycleLaneToggle}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                road.cycleLane?.enabled ? 'bg-[#FF6B35]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  road.cycleLane?.enabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          {road.cycleLane?.enabled && (
            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Width (m)</label>
                <input
                  type="number"
                  value={road.cycleLane.width.toFixed(1)}
                  onChange={(e) =>
                    onUpdate({
                      cycleLane: {
                        ...road.cycleLane!,
                        width: parseFloat(e.target.value) || 1.5,
                      },
                    })
                  }
                  min={1.5}
                  max={3}
                  step={0.1}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Side</label>
                <div className="flex gap-1">
                  {['nearside', 'offside'].map((side) => (
                    <button
                      key={side}
                      onClick={() =>
                        onUpdate({
                          cycleLane: {
                            ...road.cycleLane!,
                            side: side as 'nearside' | 'offside',
                          },
                        })
                      }
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors capitalize ${
                        road.cycleLane?.side === side
                          ? 'bg-[#1A365D] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {side}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Road
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Junction Properties Component
// ============================================================================

interface JunctionPropertiesProps {
  junction: Junction;
  onUpdate: (changes: Partial<Junction>) => void;
  onDelete: () => void;
  onClose: () => void;
}

function JunctionProperties({ junction, onUpdate, onDelete, onClose }: JunctionPropertiesProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Junction Properties
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Junction Info */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-medium text-slate-900">
          {JUNCTION_TYPE_LABELS[junction.type]}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Position: ({junction.position.x.toFixed(1)}, {junction.position.y.toFixed(1)})
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Junction Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Junction Type
          </label>
          <div className="space-y-1">
            {(['t-junction', 'crossroads', 'roundabout', 'mini-roundabout'] as JunctionType[]).map((type) => (
              <button
                key={type}
                onClick={() => onUpdate({ type })}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                  junction.type === type
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {JUNCTION_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Rotation (°)
          </label>
          <input
            type="number"
            value={junction.rotation.toFixed(0)}
            onChange={(e) => onUpdate({ rotation: parseFloat(e.target.value) || 0 })}
            step={15}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
          />
          <div className="flex gap-1 mt-2">
            {[0, 90, 180, 270].map((angle) => (
              <button
                key={angle}
                onClick={() => onUpdate({ rotation: angle })}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  Math.abs(junction.rotation - angle) < 1
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {angle}°
              </button>
            ))}
          </div>
        </div>

        {/* Roundabout Config */}
        {(junction.type === 'roundabout' || junction.type === 'mini-roundabout') && (
          <div className="pt-3 border-t border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Roundabout Settings
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Outer Radius (m)</label>
                <input
                  type="number"
                  value={junction.roundaboutConfig?.outerRadius ?? 10}
                  onChange={(e) =>
                    onUpdate({
                      roundaboutConfig: {
                        ...junction.roundaboutConfig,
                        outerRadius: parseFloat(e.target.value) || 10,
                        innerRadius: junction.roundaboutConfig?.innerRadius ?? 3,
                        entryWidths: junction.roundaboutConfig?.entryWidths ?? [],
                        exitWidths: junction.roundaboutConfig?.exitWidths ?? [],
                      },
                    })
                  }
                  min={5}
                  max={50}
                  step={1}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                />
              </div>
              {junction.type === 'roundabout' && (
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Inner Radius (m)</label>
                  <input
                    type="number"
                    value={junction.roundaboutConfig?.innerRadius ?? 3}
                    onChange={(e) =>
                      onUpdate({
                        roundaboutConfig: {
                          ...junction.roundaboutConfig,
                          outerRadius: junction.roundaboutConfig?.outerRadius ?? 10,
                          innerRadius: parseFloat(e.target.value) || 0,
                          entryWidths: junction.roundaboutConfig?.entryWidths ?? [],
                          exitWidths: junction.roundaboutConfig?.exitWidths ?? [],
                        },
                      })
                    }
                    min={0}
                    max={junction.roundaboutConfig?.outerRadius ?? 10}
                    step={0.5}
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Junction
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Marking Properties Component
// ============================================================================

interface MarkingPropertiesProps {
  marking: RoadMarking;
  onUpdate: (changes: Partial<RoadMarking>) => void;
  onDelete: () => void;
  onClose: () => void;
}

function MarkingProperties({ marking, onUpdate, onDelete, onClose }: MarkingPropertiesProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Marking Properties
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Marking Info */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-medium text-slate-900">{getMarkingName(marking.type)}</h3>
        <p className="text-xs text-slate-500 mt-1">
          Chainage: {marking.position.s.toFixed(1)} m
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Position */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Position
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Chainage (m)</label>
              <input
                type="number"
                value={marking.position.s.toFixed(1)}
                onChange={(e) =>
                  onUpdate({
                    position: { ...marking.position, s: parseFloat(e.target.value) || 0 },
                  })
                }
                step={0.5}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Offset (m)</label>
              <input
                type="number"
                value={marking.position.t.toFixed(2)}
                onChange={(e) =>
                  onUpdate({
                    position: { ...marking.position, t: parseFloat(e.target.value) || 0 },
                  })
                }
                step={0.1}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
              />
            </div>
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Rotation (°)
          </label>
          <input
            type="number"
            value={marking.rotation?.toFixed(0) ?? 0}
            onChange={(e) => onUpdate({ rotation: parseFloat(e.target.value) || 0 })}
            step={15}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
          />
          <div className="flex gap-1 mt-2">
            {[0, 90, 180, 270].map((angle) => (
              <button
                key={angle}
                onClick={() => onUpdate({ rotation: angle })}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  Math.abs((marking.rotation ?? 0) - angle) < 1
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {angle}°
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Marking
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Signage Properties Component
// ============================================================================

interface SignagePropertiesProps {
  sign: SignagePlacement;
  onUpdate: (changes: Partial<SignagePlacement>) => void;
  onDelete: () => void;
  onClose: () => void;
}

function SignageProperties({ sign, onUpdate, onDelete, onClose }: SignagePropertiesProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Sign Properties
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sign Info */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-medium text-slate-900">{getSignName(sign.signType)}</h3>
        <p className="text-xs text-slate-500 mt-1">
          Position: ({sign.position.x.toFixed(1)}, {sign.position.y.toFixed(1)})
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Position */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Position
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600 mb-1">X (m)</label>
              <input
                type="number"
                value={sign.position.x.toFixed(1)}
                onChange={(e) =>
                  onUpdate({
                    position: { ...sign.position, x: parseFloat(e.target.value) || 0 },
                  })
                }
                step={0.5}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Y (m)</label>
              <input
                type="number"
                value={sign.position.y.toFixed(1)}
                onChange={(e) =>
                  onUpdate({
                    position: { ...sign.position, y: parseFloat(e.target.value) || 0 },
                  })
                }
                step={0.5}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
              />
            </div>
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Rotation (°)
          </label>
          <input
            type="number"
            value={sign.rotation.toFixed(0)}
            onChange={(e) => onUpdate({ rotation: parseFloat(e.target.value) || 0 })}
            step={15}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
          />
          <div className="flex gap-1 mt-2">
            {[0, 90, 180, 270].map((angle) => (
              <button
                key={angle}
                onClick={() => onUpdate({ rotation: angle })}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  Math.abs(sign.rotation - angle) < 1
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {angle}°
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Sign
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Furniture Properties Component
// ============================================================================

interface FurniturePropertiesProps {
  item: FurniturePlacement;
  onUpdate: (changes: Partial<FurniturePlacement>) => void;
  onDelete: () => void;
  onClose: () => void;
}

function FurnitureProperties({ item, onUpdate, onDelete, onClose }: FurniturePropertiesProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Furniture Properties
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Furniture Info */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-medium text-slate-900">{getFurnitureName(item.furnitureType)}</h3>
        <p className="text-xs text-slate-500 mt-1">
          Position: ({item.position.x.toFixed(1)}, {item.position.y.toFixed(1)})
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Position */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Position
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600 mb-1">X (m)</label>
              <input
                type="number"
                value={item.position.x.toFixed(1)}
                onChange={(e) =>
                  onUpdate({
                    position: { ...item.position, x: parseFloat(e.target.value) || 0 },
                  })
                }
                step={0.5}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Y (m)</label>
              <input
                type="number"
                value={item.position.y.toFixed(1)}
                onChange={(e) =>
                  onUpdate({
                    position: { ...item.position, y: parseFloat(e.target.value) || 0 },
                  })
                }
                step={0.5}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
              />
            </div>
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Rotation (°)
          </label>
          <input
            type="number"
            value={item.rotation.toFixed(0)}
            onChange={(e) => onUpdate({ rotation: parseFloat(e.target.value) || 0 })}
            step={15}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
          />
          <div className="flex gap-1 mt-2">
            {[0, 45, 90, 180].map((angle) => (
              <button
                key={angle}
                onClick={() => onUpdate({ rotation: angle })}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  Math.abs(item.rotation - angle) < 1
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {angle}°
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Furniture
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Product Properties Component
// ============================================================================

interface ProductPropertiesProps {
  product: CanvasProduct;
  onUpdate: (changes: Partial<CanvasProduct>) => void;
  onDelete: () => void;
  onClose: () => void;
}

function ProductProperties({ product, onUpdate, onDelete, onClose }: ProductPropertiesProps) {
  const productDef = productsData.products.find((p) => p.id === product.productId);
  const variantDef = productDef?.variants?.find((v) => v.id === product.variantId);

  // Get position as CanvasPoint
  const position = 'x' in product.position
    ? product.position
    : { x: 0, y: 0 }; // Fallback for chainage-based positions

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Product Properties
          </h2>
          <button
            onClick={onClose}
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
        <h3 className="text-sm font-medium text-slate-900">{getProductName(product.productId)}</h3>
        {variantDef && (
          <p className="text-xs text-[#FF6B35] mt-0.5">{variantDef.name}</p>
        )}
        {productDef && (
          <p className="text-xs text-slate-500 mt-1">
            {(productDef.dimensions.length / 1000).toFixed(1)}m × {(productDef.dimensions.width / 1000).toFixed(1)}m
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Position */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Position
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600 mb-1">X (m)</label>
              <input
                type="number"
                value={position.x.toFixed(1)}
                onChange={(e) =>
                  onUpdate({
                    position: { x: parseFloat(e.target.value) || 0, y: position.y },
                  })
                }
                step={0.5}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Y (m)</label>
              <input
                type="number"
                value={position.y.toFixed(1)}
                onChange={(e) =>
                  onUpdate({
                    position: { x: position.x, y: parseFloat(e.target.value) || 0 },
                  })
                }
                step={0.5}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
              />
            </div>
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Rotation (°)
          </label>
          <input
            type="number"
            value={product.rotation.toFixed(0)}
            onChange={(e) => onUpdate({ rotation: parseFloat(e.target.value) || 0 })}
            step={15}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
          />
          <div className="flex gap-1 mt-2">
            {[0, 45, 90, 180].map((angle) => (
              <button
                key={angle}
                onClick={() => onUpdate({ rotation: angle })}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  Math.abs(product.rotation - angle) < 1
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {angle}°
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Quantity
          </label>
          <input
            type="number"
            value={product.quantity}
            onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
            min={1}
            max={100}
            step={1}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
          />
        </div>

        {/* Variant Selector */}
        {productDef?.variants && productDef.variants.length > 0 && (
          <div className="pt-3 border-t border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Variant
            </label>
            <div className="space-y-1">
              {productDef.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => onUpdate({ variantId: variant.id })}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                    product.variantId === variant.id
                      ? 'bg-[#1A365D] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {variant.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Product
        </button>
      </div>
    </div>
  );
}
