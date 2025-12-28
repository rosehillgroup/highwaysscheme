'use client';

import { useMemo } from 'react';
import { useSchemeStore } from '@/stores/schemeStore';
import productsData from '@/data/products.json';
import type { Product } from '@/types';

const productsMap = new Map(
  (productsData.products as Product[]).map((p) => [p.id, p])
);

export default function TotalsPanel() {
  const elements = useSchemeStore((state) => state.elements);
  const getQuantities = useSchemeStore((state) => state.getQuantities);

  const quantities = useMemo(() => getQuantities(), [elements, getQuantities]);

  const productGroups = useMemo(() => {
    const groups: Record<string, { product: Product; count: number; details: Record<string, number> }[]> = {};

    for (const [productId, data] of Object.entries(quantities.byProduct)) {
      const product = productsMap.get(productId);
      if (!product) continue;

      if (!groups[product.category]) {
        groups[product.category] = [];
      }

      groups[product.category].push({
        product,
        count: data.count,
        details: data.modules,
      });
    }

    return groups;
  }, [quantities]);

  const categoryNames: Record<string, string> = {
    'speed-cushion': 'Speed Cushions',
    island: 'Traffic Islands',
    refuge: 'Pedestrian Refuges',
    ncld: 'Cycle Lane Defenders',
    'lane-separator': 'Lane Separators',
    'raised-table': 'Raised Tables',
  };

  const hasProducts = quantities.totalProducts > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
          Bill of Quantities
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {quantities.totalProducts} product{quantities.totalProducts !== 1 ? 's' : ''} placed
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasProducts ? (
          <div className="p-4">
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">No products placed yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Select products from the library and place them on your scheme
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-4">
            {Object.entries(productGroups).map(([category, items]) => (
              <div key={category} className="bg-slate-50 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                  {categoryNames[category] || category}
                </h3>
                <div className="space-y-2">
                  {items.map(({ product, count, details }) => (
                    <div key={product.id} className="bg-white rounded p-2 border border-slate-200">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-slate-900">{product.name}</span>
                        <span className="text-sm font-semibold text-blue-600">{count}</span>
                      </div>

                      {/* Module breakdown for linear products */}
                      {Object.keys(details).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <div className="text-xs text-slate-500 space-y-1">
                            {Object.entries(details).map(([moduleId, moduleCount]) => {
                              const module = product.modules?.find((m) => m.id === moduleId);
                              return (
                                <div key={moduleId} className="flex justify-between">
                                  <span>{module?.name || moduleId}</span>
                                  <span className="font-medium">{moduleCount}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Weight calculation */}
                      {product.weight && (
                        <div className="mt-2 text-xs text-slate-400">
                          Total weight: {(product.weight * count).toLocaleString()} kg
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

      {/* Footer Summary */}
      {hasProducts && (
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-700">Total Products</span>
            <span className="text-lg font-bold text-slate-900">{quantities.totalProducts}</span>
          </div>
        </div>
      )}
    </div>
  );
}
