'use client';

import { useMemo } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import productsData from '@/data/products.json';
import furnitureData from '@/data/furniture.json';
import type { Product } from '@/types';

const productsMap = new Map(
  (productsData.products as Product[]).map((p) => [p.id, p])
);

/**
 * CanvasTotalsPanel - Shows element counts and product quantities for canvas mode
 */
export default function CanvasTotalsPanel() {
  const roads = useCanvasStore((state) => state.roads);
  const junctions = useCanvasStore((state) => state.junctions);
  const markings = useCanvasStore((state) => state.markings);
  const signage = useCanvasStore((state) => state.signage);
  const furniture = useCanvasStore((state) => state.furniture);
  const products = useCanvasStore((state) => state.products);

  // Calculate element counts
  const elementCounts = useMemo(() => {
    return {
      roads: Object.keys(roads).length,
      junctions: Object.keys(junctions).length,
      markings: Object.keys(markings).length,
      signs: Object.keys(signage).length,
      furniture: Object.keys(furniture).length,
      products: Object.keys(products).length,
    };
  }, [roads, junctions, markings, signage, furniture, products]);

  const totalElements =
    elementCounts.roads +
    elementCounts.junctions +
    elementCounts.markings +
    elementCounts.signs +
    elementCounts.furniture +
    elementCounts.products;

  // Calculate product quantities (from products placed and furniture with productIds)
  const productQuantities = useMemo(() => {
    const quantities: Record<string, { product: Product; count: number }> = {};

    // Count products placed directly
    for (const product of Object.values(products)) {
      const productDef = productsMap.get(product.productId);
      if (productDef) {
        if (!quantities[product.productId]) {
          quantities[product.productId] = { product: productDef, count: 0 };
        }
        quantities[product.productId].count += product.quantity || 1;
      }
    }

    // Count furniture items that have product IDs
    for (const item of Object.values(furniture)) {
      if (item.productId) {
        const productDef = productsMap.get(item.productId);
        if (productDef) {
          if (!quantities[item.productId]) {
            quantities[item.productId] = { product: productDef, count: 0 };
          }
          quantities[item.productId].count += 1;
        } else {
          // Check if it's a furniture item with product link
          const furnitureDef = furnitureData.items.find((f) => f.id === item.furnitureType);
          if (furnitureDef?.productId) {
            const linkedProduct = productsMap.get(furnitureDef.productId);
            if (linkedProduct) {
              if (!quantities[furnitureDef.productId]) {
                quantities[furnitureDef.productId] = { product: linkedProduct, count: 0 };
              }
              quantities[furnitureDef.productId].count += 1;
            }
          }
        }
      }
    }

    return quantities;
  }, [products, furniture]);

  // Group products by category
  const productGroups = useMemo(() => {
    const groups: Record<string, { product: Product; count: number }[]> = {};

    for (const item of Object.values(productQuantities)) {
      const category = item.product.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    }

    return groups;
  }, [productQuantities]);

  const categoryNames: Record<string, string> = {
    'speed-cushion': 'Speed Cushions',
    island: 'Traffic Islands',
    refuge: 'Pedestrian Refuges',
    ncld: 'Cycle Lane Defenders',
    'lane-separator': 'Lane Separators',
    'raised-table': 'Raised Tables',
    bollard: 'Bollards',
  };

  const hasProducts = Object.keys(productQuantities).length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
          Canvas Summary
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {totalElements} element{totalElements !== 1 ? 's' : ''} placed
        </p>
      </div>

      {/* Element Counts */}
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Elements
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 rounded p-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <div>
              <div className="text-xs text-slate-500">Roads</div>
              <div className="text-sm font-semibold text-slate-900">{elementCounts.roads}</div>
            </div>
          </div>
          <div className="bg-slate-50 rounded p-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 4v16M4 12h16" />
            </svg>
            <div>
              <div className="text-xs text-slate-500">Junctions</div>
              <div className="text-sm font-semibold text-slate-900">{elementCounts.junctions}</div>
            </div>
          </div>
          <div className="bg-slate-50 rounded p-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 4v4M12 12v4M12 20v0" strokeLinecap="round" />
            </svg>
            <div>
              <div className="text-xs text-slate-500">Markings</div>
              <div className="text-sm font-semibold text-slate-900">{elementCounts.markings}</div>
            </div>
          </div>
          <div className="bg-slate-50 rounded p-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="9" r="6" />
              <path d="M12 15v6" />
            </svg>
            <div>
              <div className="text-xs text-slate-500">Signs</div>
              <div className="text-sm font-semibold text-slate-900">{elementCounts.signs}</div>
            </div>
          </div>
          <div className="bg-slate-50 rounded p-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="8" y="4" width="8" height="16" rx="4" />
            </svg>
            <div>
              <div className="text-xs text-slate-500">Furniture</div>
              <div className="text-sm font-semibold text-slate-900">{elementCounts.furniture}</div>
            </div>
          </div>
          <div className="bg-slate-50 rounded p-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#FF6B35]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 8h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
              <path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            <div>
              <div className="text-xs text-slate-500">Products</div>
              <div className="text-sm font-semibold text-[#FF6B35]">{elementCounts.products}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Quantities */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Bill of Quantities
          </h3>

          {!hasProducts ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">No products placed yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Place Rosehill products or furniture items to generate quantities
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(productGroups).map(([category, items]) => (
                <div key={category} className="bg-slate-50 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                    {categoryNames[category] || category}
                  </h4>
                  <div className="space-y-2">
                    {items.map(({ product, count }) => (
                      <div key={product.id} className="bg-white rounded p-2 border border-slate-200">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium text-slate-900">{product.name}</span>
                          <span className="text-sm font-semibold text-[#FF6B35]">{count}</span>
                        </div>
                        {product.weight && (
                          <div className="mt-1 text-xs text-slate-400">
                            Weight: {(product.weight * count).toLocaleString()} kg
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Summary */}
      {(hasProducts || totalElements > 0) && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-700">Total Elements</span>
            <span className="text-lg font-bold text-slate-900">{totalElements}</span>
          </div>
          {hasProducts && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">Product Items</span>
              <span className="text-sm font-semibold text-[#FF6B35]">
                {Object.values(productQuantities).reduce((sum, p) => sum + p.count, 0)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
