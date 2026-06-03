import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Grid3X3, List, Star, ShoppingBag, Store, X } from 'lucide-react';
import { useProducts, useCategoryTree, usePublicConfig, useSellers, useBrands } from '../../lib/query-hooks';
import AnimatedProductCard from '../../components/AnimatedProductCard';
import { SkeletonGrid } from '../../components/Skeleton';
import EmptyState from '../shared/EmptyState';

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  
  const params = {
    page: searchParams.get('page') || '1',
    limit: '20',
    search: searchParams.get('search') || undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    sellerId: searchParams.get('sellerId') || undefined,
    brandId: searchParams.get('brandId') || undefined,
    minPrice: searchParams.get('minPrice') || undefined,
    maxPrice: searchParams.get('maxPrice') || undefined,
    minRating: searchParams.get('minRating') || undefined,
    inStock: searchParams.get('inStock') || undefined,
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: searchParams.get('sortOrder') || 'desc',
  };

  const { data, isLoading } = useProducts(params);
  const { data: catData } = useCategoryTree();
  const { data: sellersData } = useSellers({ search: searchParams.get('search') || undefined, limit: 8 });
  const { data: brandsData } = useBrands({ limit: 20 });
  const { data: publicConfig } = usePublicConfig();
  
  const products = data?.data || [];
  const pagination = data?.pagination;
  const categories = catData?.data || [];
  const sellers = sellersData?.data || [];
  const brands = brandsData?.data || [];
  const catalog = publicConfig?.data?.['marketplace.catalog'] || {};

  const updateParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const clearFilters = () => setSearchParams({});

  const findLabel = (items: any[], id: string | null, fallback: string) => items.find((item) => item.id === id)?.name || items.find((item) => item.id === id)?.storeName || fallback;
  const activeChips = [
    searchParams.get('search') && { key: 'search', label: `Search: ${searchParams.get('search')}` },
    searchParams.get('categoryId') && { key: 'categoryId', label: `Category: ${findLabel(categories, searchParams.get('categoryId'), 'Selected')}` },
    searchParams.get('sellerId') && { key: 'sellerId', label: `Vendor: ${findLabel(sellers, searchParams.get('sellerId'), 'Selected')}` },
    searchParams.get('brandId') && { key: 'brandId', label: `Brand: ${findLabel(brands, searchParams.get('brandId'), 'Selected')}` },
    (searchParams.get('minPrice') || searchParams.get('maxPrice')) && { key: 'price', label: `${searchParams.get('minPrice') || '0'} - ${searchParams.get('maxPrice') || 'Any'} TZS` },
    searchParams.get('minRating') && { key: 'minRating', label: `${searchParams.get('minRating')}+ stars` },
    searchParams.get('inStock') === 'true' && { key: 'inStock', label: 'In stock' },
  ].filter(Boolean) as { key: string; label: string }[];
  const hasFilters = activeChips.length > 0;
  const removeChip = (key: string) => {
    if (key === 'price') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('minPrice');
      newParams.delete('maxPrice');
      newParams.set('page', '1');
      setSearchParams(newParams);
      return;
    }
    updateParam(key, null);
  };

  return (
    <div className="page-container">
      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Filters</h3>
            {hasFilters && <button onClick={clearFilters} className="text-xs transition-colors" style={{ color: 'rgb(var(--color-primary-600))' }}>Clear all</button>}
          </div>

          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search..."
              defaultValue={searchParams.get('search') || ''}
              onChange={(e) => updateParam('search', e.target.value || null)}
              className="input-field"
            />
          </div>

          {/* Categories */}
          {catalog.categoriesEnabled !== false && <div>
            <h4 className="text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>Categories</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {categories.map((cat: any) => (
                <label key={cat.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchParams.get('categoryId') === cat.id}
                    onChange={() => updateParam('categoryId', searchParams.get('categoryId') === cat.id ? null : cat.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{cat.name}</span>
                  <span className="text-xs ml-auto" style={{ color: 'rgb(var(--color-text-disabled))' }}>({cat._count?.products || 0})</span>
                </label>
              ))}
            </div>
          </div>}

          {/* Price Range */}
          <div>
            <h4 className="text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>Price Range</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="range"
                  min="0"
                  max="5000000"
                  step="10000"
                  value={Number(searchParams.get('minPrice') || 0)}
                  onChange={(e) => updateParam('minPrice', e.target.value === '0' ? null : e.target.value)}
                  className="w-full accent-primary-600"
                  aria-label="Minimum price"
                />
                <input
                  type="range"
                  min="0"
                  max="5000000"
                  step="10000"
                  value={Number(searchParams.get('maxPrice') || 5000000)}
                  onChange={(e) => updateParam('maxPrice', e.target.value === '5000000' ? null : e.target.value)}
                  className="w-full accent-primary-600"
                  aria-label="Maximum price"
                />
              </div>
              <div className="flex gap-2 items-center">
              <input type="number" placeholder="Min" defaultValue={searchParams.get('minPrice') || ''} onChange={(e) => updateParam('minPrice', e.target.value || null)} className="input-field text-sm w-full" />
              <span style={{ color: 'rgb(var(--color-text-disabled))' }}>-</span>
              <input type="number" placeholder="Max" defaultValue={searchParams.get('maxPrice') || ''} onChange={(e) => updateParam('maxPrice', e.target.value || null)} className="input-field text-sm w-full" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>Rating</h4>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((rating) => (
                <button key={rating} onClick={() => updateParam('minRating', searchParams.get('minRating') === String(rating) ? null : String(rating))} className="flex w-full items-center gap-1 rounded px-1 py-1 text-left hover:bg-gray-50">
                  {[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}
                  <span className="ml-1 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>& up</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={searchParams.get('inStock') === 'true'}
                onChange={() => updateParam('inStock', searchParams.get('inStock') === 'true' ? null : 'true')}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>In stock only</span>
            </label>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>Brands</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {brands.map((brand: any) => (
                <label key={brand.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchParams.get('brandId') === brand.id}
                    onChange={() => updateParam('brandId', searchParams.get('brandId') === brand.id ? null : brand.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{brand.name}</span>
                </label>
              ))}
              {!brands.length && <p className="text-xs" style={{ color: 'rgb(var(--color-text-disabled))' }}>No brands available.</p>}
            </div>
          </div>

          {catalog.sellersEnabled !== false && <div>
            <h4 className="text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>Vendors</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {sellers.map((seller: any) => (
                <label key={seller.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchParams.get('sellerId') === seller.id}
                    onChange={() => updateParam('sellerId', searchParams.get('sellerId') === seller.id ? null : seller.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{seller.storeName}</span>
                  <Link to={`/sellers/${seller.storeSlug}`} className="text-xs transition-colors" style={{ color: 'rgb(var(--color-primary-600))' }}>Store</Link>
                </label>
              ))}
              {!sellers.length && <p className="text-xs" style={{ color: 'rgb(var(--color-text-disabled))' }}>No vendor matches yet.</p>}
            </div>
          </div>}
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Top Bar */}
          {activeChips.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => removeChip(chip.key)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100"
                >
                  {chip.label}
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}

          <details className="mb-4 rounded-lg border p-3 lg:hidden" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
            <summary className="cursor-pointer text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Filters</summary>
            <div className="mt-3 grid gap-3">
              <input
                type="text"
                placeholder="Search products..."
                defaultValue={searchParams.get('search') || ''}
                onChange={(e) => updateParam('search', e.target.value || null)}
                className="input-field"
              />
              <div className="grid grid-cols-2 gap-2">
                <select value={searchParams.get('categoryId') || ''} onChange={(e) => updateParam('categoryId', e.target.value || null)} className="select-field text-sm">
                  <option value="">All categories</option>
                  {categories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
                <select value={searchParams.get('brandId') || ''} onChange={(e) => updateParam('brandId', e.target.value || null)} className="select-field text-sm">
                  <option value="">All brands</option>
                  {brands.map((brand: any) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Min price" defaultValue={searchParams.get('minPrice') || ''} onChange={(e) => updateParam('minPrice', e.target.value || null)} className="input-field text-sm" />
                <input type="number" placeholder="Max price" defaultValue={searchParams.get('maxPrice') || ''} onChange={(e) => updateParam('maxPrice', e.target.value || null)} className="input-field text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={searchParams.get('minRating') || ''} onChange={(e) => updateParam('minRating', e.target.value || null)} className="select-field text-sm">
                  <option value="">Any rating</option>
                  {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating}+ stars</option>)}
                </select>
                <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-secondary))' }}>
                  <input
                    type="checkbox"
                    checked={searchParams.get('inStock') === 'true'}
                    onChange={() => updateParam('inStock', searchParams.get('inStock') === 'true' ? null : 'true')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  In stock
                </label>
              </div>
              {hasFilters && <button onClick={clearFilters} className="btn-secondary btn-sm w-full">Clear filters</button>}
            </div>
          </details>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <select value={`${params.sortBy}:${params.sortOrder}`} onChange={(e) => { const [s, o] = e.target.value.split(':'); updateParam('sortBy', s); updateParam('sortOrder', o); }} className="select-field text-sm">
                <option value="createdAt:desc">Newest</option>
                <option value="basePrice:asc">Price: Low to High</option>
                <option value="basePrice:desc">Price: High to Low</option>
                <option value="rating:desc">Best Rating</option>
                <option value="totalSales:desc">Most Sold</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{pagination?.total || 0} products</span>
              <button
                onClick={() => setViewMode('grid')}
                className="p-1.5 rounded transition-colors"
                style={{
                  backgroundColor: viewMode === 'grid' ? 'rgb(var(--color-primary-100))' : 'transparent',
                  color: viewMode === 'grid' ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-disabled))',
                }}
                aria-label="Grid view"
              >
                <Grid3X3 className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="p-1.5 rounded transition-colors"
                style={{
                  backgroundColor: viewMode === 'list' ? 'rgb(var(--color-primary-100))' : 'transparent',
                  color: viewMode === 'list' ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-disabled))',
                }}
                aria-label="List view"
              >
                <List className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {sellers.length > 0 && searchParams.get('search') && (
            <div className="mb-6 rounded-lg p-4" style={{ border: '1px solid', borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  <Store className="h-4 w-4" style={{ color: 'rgb(var(--color-primary-600))' }} aria-hidden="true" /> Matching Vendors
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {sellers.slice(0, 4).map((seller: any) => (
                  <Link
                    key={seller.id}
                    to={`/sellers/${seller.storeSlug}`}
                    className="rounded-lg p-3 transition-colors"
                    style={{ border: '1px solid', borderColor: 'rgb(var(--color-border))' }}
                  >
                    <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{seller.storeName}</p>
                    <p className="mt-1 line-clamp-1 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{seller.storeDescription || seller.storeLocation || 'Vendor store'}</p>
                    <p className="mt-2 text-xs" style={{ color: 'rgb(var(--color-primary-600))' }}>{seller._count?.products || 0} products</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <SkeletonGrid items={8} columns={4} className="gap-4" />
            </div>
          ) : products.length === 0 ? (
            <EmptyState icon={<ShoppingBag className="w-8 h-8" />} title="No products found" description="Try adjusting your filters or search terms" actionLabel="Clear Filters" onAction={clearFilters} />
          ) : (
            <>
              <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 md:gap-6' : 'grid-cols-1 gap-4'}`}>
                {products.map((product: any) => (
                  <AnimatedProductCard key={product.id} product={product} variant={viewMode === 'list' ? 'list' : 'default'} />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => updateParam('page', String(page))}
                      className="w-10 h-10 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: page === (Number(params.page) || 1) ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-surface))',
                        color: page === (Number(params.page) || 1) ? 'white' : 'rgb(var(--color-text-secondary))',
                        border: page === (Number(params.page) || 1) ? 'none' : '1px solid',
                        borderColor: 'rgb(var(--color-border))',
                      }}
                      aria-label={`Page ${page}`}
                      aria-current={page === (Number(params.page) || 1) ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
