'use client';

import React, { useState, useMemo, memo } from 'react';
import { useSchemeStore } from '@/stores/schemeStore';
import { useCanvasStore } from '@/stores/canvasStore';
import productsData from '@/data/products.json';
import type { Product, ProductCategory } from '@/types';

const products = productsData.products as Product[];
const categories = productsData.categories;

// Category display info
const categoryInfo: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  'speed-cushion': {
    name: 'Speed Cushions',
    color: 'bg-orange-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  island: {
    name: 'Traffic Islands',
    color: 'bg-[#1A365D]',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" strokeWidth={2} />
      </svg>
    ),
  },
  refuge: {
    name: 'Pedestrian Refuges',
    color: 'bg-green-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  ncld: {
    name: 'Cycle Lane Defenders',
    color: 'bg-purple-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  'lane-separator': {
    name: 'Lane Separators',
    color: 'bg-pink-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
  'raised-table': {
    name: 'Raised Tables',
    color: 'bg-amber-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
};

interface ProductLibraryProps {
  onSelectProduct?: (product: Product) => void;
  selectedProductId?: string | null;
}

export default function ProductLibrary({
  onSelectProduct,
  selectedProductId,
}: ProductLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.id))
  );

  const corridor = useSchemeStore((state) => state.corridor);
  const canvasRoadOrder = useCanvasStore((state) => state.roadOrder);

  // User can place products if either:
  // 1. Map mode: corridor carriageway is confirmed
  // 2. Canvas mode: at least one road is drawn
  const hasMapCorridor = corridor?.carriageway.confirmed ?? false;
  const hasCanvasRoads = canvasRoadOrder.length > 0;
  const isReadyForPlacement = hasMapCorridor || hasCanvasRoads;

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};

    let filtered = products;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    for (const product of filtered) {
      if (!groups[product.category]) {
        groups[product.category] = [];
      }
      groups[product.category].push(product);
    }

    return groups;
  }, [searchQuery]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleProductClick = (product: Product) => {
    if (!isReadyForPlacement) return;
    onSelectProduct?.(product);
  };

  const totalProducts = Object.values(groupedProducts).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
          Product Library
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {totalProducts} product{totalProducts !== 1 ? 's' : ''} available
        </p>

        {/* Search */}
        <div className="mt-3 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-slate-900"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Status Messages */}
      {!isReadyForPlacement && (
        <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>Setup required:</strong> Draw a road on the Canvas tab, or select a corridor on the Map tab and confirm its width.
          </p>
        </div>
      )}

      {selectedProductId && (
        <div className="mx-4 mt-3 p-3 bg-[#FFF0EB] border border-[#FF8F5C] rounded-lg">
          <p className="text-xs text-[#E55A2B]">
            <strong>Placement active</strong> — Click on the corridor to place. Press <kbd className="px-1 py-0.5 bg-[#FFD4C4] rounded text-[10px]">Esc</kbd> to cancel.
          </p>
        </div>
      )}

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        {categories.map((category) => {
          const categoryProducts = groupedProducts[category.id] || [];
          if (categoryProducts.length === 0 && searchQuery) return null;

          const info = categoryInfo[category.id] || { name: category.name, color: 'bg-slate-500', icon: null };
          const isExpanded = expandedCategories.has(category.id);

          return (
            <div key={category.id} className="border-b border-slate-100">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg ${info.color} text-white flex items-center justify-center`}>
                  {info.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-slate-900">{info.name}</div>
                  <div className="text-xs text-slate-500">
                    {categoryProducts.length} product{categoryProducts.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Products */}
              {isExpanded && categoryProducts.length > 0 && (
                <div className="px-4 pb-3 space-y-2">
                  {categoryProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => handleProductClick(product)}
                      disabled={!isReadyForPlacement}
                      selected={product.id === selectedProductId}
                    />
                  ))}
                </div>
              )}

              {isExpanded && categoryProducts.length === 0 && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-slate-400 italic">No products in this category</p>
                </div>
              )}
            </div>
          );
        })}

        {totalProducts === 0 && searchQuery && (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">No products found for "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs text-[#FF6B35] hover:underline"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  disabled: boolean;
  selected?: boolean;
}

const ProductCard = memo(function ProductCard({ product, onClick, disabled, selected }: ProductCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        disabled
          ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
          : selected
          ? 'bg-[#FFF0EB] border-[#FF6B35] ring-2 ring-[#FF6B35]/50'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900 truncate">{product.name}</span>
            {product.type === 'linear' && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">
                Linear
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {product.dimensions.length}×{product.dimensions.width}mm
            {product.weight && <span className="text-slate-400"> • {product.weight}kg</span>}
          </div>
        </div>

        {selected && (
          <svg className="w-5 h-5 text-[#FF6B35] shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    </button>
  );
});
