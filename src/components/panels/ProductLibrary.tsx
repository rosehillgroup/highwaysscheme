'use client';

import { useState, useMemo, memo, useCallback } from 'react';
import { useSchemeStore } from '@/stores/schemeStore';
import productsData from '@/data/products.json';
import type { Product, ProductCategory } from '@/types';

const products = productsData.products as Product[];
const categories = productsData.categories;

interface ProductLibraryProps {
  onSelectProduct?: (product: Product) => void;
  selectedProductId?: string | null;
}

export default function ProductLibrary({
  onSelectProduct,
  selectedProductId,
}: ProductLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const corridor = useSchemeStore((state) => state.corridor);
  const isCarriagewayConfirmed = corridor?.carriageway.confirmed ?? false;

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === activeCategory);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [activeCategory, searchQuery]);

  const handleProductClick = (product: Product) => {
    if (!isCarriagewayConfirmed) {
      return;
    }
    onSelectProduct?.(product);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
          Product Library
        </h2>

        {/* Search */}
        <div className="mt-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Tabs */}
        <div className="mt-3 flex flex-wrap gap-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto p-2">
        {!isCarriagewayConfirmed && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              Define a corridor and confirm carriageway width to enable product placement.
            </p>
          </div>
        )}

        {selectedProductId && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Placement mode active</strong> — Click on the map to place the product. Press Esc to cancel.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => handleProductClick(product)}
              disabled={!isCarriagewayConfirmed}
              selected={product.id === selectedProductId}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">No products found</div>
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
  const getCategoryColor = (category: ProductCategory): string => {
    switch (category) {
      case 'speed-cushion':
        return 'bg-orange-100 text-orange-800';
      case 'island':
        return 'bg-blue-100 text-blue-800';
      case 'refuge':
        return 'bg-green-100 text-green-800';
      case 'ncld':
        return 'bg-purple-100 text-purple-800';
      case 'lane-separator':
        return 'bg-pink-100 text-pink-800';
      case 'raised-table':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getTypeIcon = (type: Product['type']) => {
    switch (type) {
      case 'discrete':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={2} />
          </svg>
        );
      case 'linear':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeWidth={2} d="M4 12h16" />
          </svg>
        );
      case 'area':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              strokeWidth={2}
              fill="currentColor"
              fillOpacity={0.2}
            />
          </svg>
        );
      case 'extendable':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeWidth={2}
              d="M4 12h6m4 0h6M14 8l4 4-4 4M10 8l-4 4 4 4"
            />
          </svg>
        );
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        disabled
          ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
          : selected
          ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400 ring-opacity-50'
          : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm cursor-pointer'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            selected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {getTypeIcon(product.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-slate-900 truncate">{product.name}</h3>
            <span
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getCategoryColor(product.category)}`}
            >
              {product.type}
            </span>
          </div>

          {/* Dimensions */}
          <div className="mt-1 text-xs text-slate-500">
            {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height}{' '}
            mm
            {product.weight && <span className="ml-2">• {product.weight} kg</span>}
          </div>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="mt-1 text-xs text-slate-400">
              {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''} available
            </div>
          )}

          {/* Linear info */}
          {product.type === 'linear' && product.layoutMode && (
            <div className="mt-1 text-xs text-blue-600">
              {product.layoutMode === 'continuous' ? 'Continuous run' : 'Segmented only'}
            </div>
          )}
        </div>

        {/* Selection indicator */}
        {selected && (
          <div className="shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
});
