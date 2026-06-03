import React, { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useParams, Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Minus, Plus, MessageSquareReply, Sparkles, Eye, Store } from 'lucide-react';
import { useProduct, useAddToCart, useAddToWishlist, useAskProductQuestion, useProductQuestions, useProductReviews, useCreateReview, useProducts } from '../../lib/query-hooks';
import { post } from '../../lib/api-enhanced';
import ProductImageGallery from '../../components/ProductImageGallery';
import { SkeletonPage } from '../../components/Skeleton';
import RecentlyViewed from '../shared/RecentlyViewed';
import { useAuthStore } from '../../lib/auth-store';
import { assetUrl } from '../../lib/assets';

import { addRecentlyViewed } from '../shared/RecentlyViewed';
import VerifiedBadge from '../../components/VerifiedBadge';

// JSON-LD structured data for SEO
function ProductJsonLd({ product }: { product: any }) {
  const price = product.discountPrice || product.basePrice;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description?.replace(/<[^>]*>/g, '').substring(0, 200),
    image: product.images?.[0]?.url ? [assetUrl(product.images[0].url)] : [],
    sku: product.id,
    mpn: product.id,
    brand: product.brand ? {
      '@type': 'Brand',
      name: product.brand.name,
    } : undefined,
    offers: {
      '@type': 'Offer',
      url: typeof window !== 'undefined' ? window.location.href : '',
      priceCurrency: 'TZS',
      price: price,
      availability: `https://schema.org/${product.variants?.some((v: any) => v.stock > 0) ? 'InStock' : 'OutOfStock'}`,
      itemCondition: 'https://schema.org/NewCondition',
    },
    aggregateRating: product.rating ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount || 0,
    } : undefined,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

function parseJson(value: any, fallback: any) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function variantLabel(variant: any) {
  const attrs = parseJson(variant.attributes, {});
  const values = Object.entries(attrs)
    .filter(([key]) => !['source', 'supplierVariantId'].includes(key))
    .map(([key, value]) => `${key}: ${value}`);
  return values.length ? values.join(' / ') : variant.sku;
}

function dropshipMappingId(product: any) {
  const specs = parseJson(product?.specifications, {});
  return product?.dropshipMappingId || specs.dropshipMappingId || specs.mappingId || specs.sourceMappingId || null;
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useProduct(slug || '');
  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();
  const { isAuthenticated, user } = useAuthStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', text: '' });
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'reviews' | 'qa'>('overview');

  const product = data?.data;

  // Track recently viewed
  useEffect(() => {
    if (product) {
      addRecentlyViewed({
        id: product.id,
        title: product.title,
        slug: product.slug || product.id,
        image: product.images?.[0]?.url,
        price: product.discountPrice || product.basePrice,
      });
    }
  }, [product?.id]);

  // Fetch related products (same category, excluding current product)
  const { data: relatedData } = useProducts(
    product?.categoryId 
      ? { categoryId: product.categoryId, limit: 8, excludeId: product.id }
      : { limit: 8, sortBy: 'soldCount', sortOrder: 'desc' }
  );
  const relatedProducts = (relatedData?.data || []).filter(
    (p: any) => p.id !== product?.id
  ).slice(0, 6);

  // Fetch recommended products (popular products)
  const { data: recommendedData } = useProducts(
    { limit: 8, sortBy: 'soldCount', sortOrder: 'desc', excludeId: product?.id }
  );
  const recommendedProducts = (recommendedData?.data || []).filter(
    (p: any) => p.id !== product?.id
  ).slice(0, 6);

  const questions = useProductQuestions(product?.id);
  const askQuestion = useAskProductQuestion(product?.id || '');
  const reviews = useProductReviews(product?.id, { limit: 20 });
  const createReview = useCreateReview(product?.id || '');
  const images = product?.images || [];
  const variants = product?.variants || [];
  const totalStock = useMemo(() => variants.reduce((sum: number, variant: any) => sum + Number(variant.stock || 0), 0), [variants]);
  const selectedVariantData = variants.find((variant: any) => variant.id === selectedVariant);
  const maxQuantity = selectedVariantData ? selectedVariantData.stock : totalStock;
  const mappingId = useMemo(() => dropshipMappingId(product), [product?.id, product?.specifications]);
  const backInStock = useMutation({
    mutationFn: () => post(`/dropship/back-in-stock/${mappingId}`, { email: user?.email }),
    onSuccess: () => toast.success('Back-in-stock alert saved'),
  });

  useEffect(() => {
    if (!variants.length) return;
    if (selectedVariant && variants.some((variant: any) => variant.id === selectedVariant && variant.stock > 0)) return;
    const firstInStock = variants.find((variant: any) => variant.stock > 0);
    setSelectedVariant(firstInStock?.id || variants[0]?.id || null);
    setQuantity(1);
  }, [product?.id, variants.length]);

  const ProductCard = ({ p }: { p: any }) => {
    const pPrice = p.discountPrice || p.basePrice;
    const pOrigPrice = p.discountPrice ? p.basePrice : null;
    return (
      <Link
        to={`/products/${p.slug || p.id}`}
        className="group card overflow-hidden flex flex-col transition-all hover:shadow-lg hover:-translate-y-1"
      >
        <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
          {p.images?.[0]?.url ? (
            <img
              src={assetUrl(p.images[0].url)}
              alt={p.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart className="w-8 h-8" style={{ color: 'rgb(var(--color-text-disabled))' }} />
            </div>
          )}
          {pOrigPrice && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              -{Math.round((1 - pPrice / pOrigPrice) * 100)}%
            </span>
          )}
          <button
            onClick={(e) => { e.preventDefault(); addToWishlist.mutate(p.id); }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 dark:bg-gray-900/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-900"
            aria-label="Add to wishlist"
          >
            <Heart className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
        </div>
        <div className="p-3 flex-1 flex flex-col gap-1">
          <p className="text-xs font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
            {p.title}
          </p>
          <div className="flex items-center gap-1.5 mt-auto">
            <span className="text-sm font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>
              {pPrice?.toLocaleString()} TZS
            </span>
            {pOrigPrice && (
              <span className="text-[10px] line-through" style={{ color: 'rgb(var(--color-text-disabled))' }}>
                {pOrigPrice.toLocaleString()} TZS
              </span>
            )}
          </div>
          {p.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{p.rating?.toFixed(1)}</span>
            </div>
          )}
        </div>
      </Link>
    );
  };

  if (isLoading) return <SkeletonPage cards={6} columns={3} />;
  if (!product) return (
    <div className="page-container text-center py-16">
      <p style={{ color: 'rgb(var(--color-text-muted))' }}>Product not found</p>
    </div>
  );

  const price = product.discountPrice || product.basePrice;
  const originalPrice = product.discountPrice ? product.basePrice : null;

  const handleAddToCart = () => {
    if (variants.length && !selectedVariant) return;
    addToCart.mutate({ productId: product.id, variantId: selectedVariant, quantity });
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.text.trim() && !reviewForm.title.trim()) return;
    createReview.mutate(reviewForm, { onSuccess: () => setReviewForm({ rating: 5, title: '', text: '' }) });
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    askQuestion.mutate(question.trim(), { onSuccess: () => setQuestion('') });
  };

  const plainDescription = useMemo(() => {
    return product?.description ? product.description.replace(/<[^>]*>/g, '').trim() : '';
  }, [product?.description]);

  return (
    <div className="page-container">
      {/* JSON-LD structured data for SEO */}
      <ProductJsonLd product={product} />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
        <Link to="/" style={{ color: 'rgb(var(--color-text-muted))' }} className="hover:text-primary-600">Home</Link>
        <span>/</span>
        {product.category && (
          <Link to={`/products?categoryId=${product.category.id}`} className="hover:text-primary-600" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {product.category.name}
          </Link>
        )}
        <span>/</span>
        <span style={{ color: 'rgb(var(--color-text))' }}>{product.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Images - Modern Gallery */}
        <ProductImageGallery 
          images={images}
          productName={product.title}
        />

        {/* Info */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-3" style={{ color: 'rgb(var(--color-text))' }}>{product.title}</h1>

          {/* Rating */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(product.rating || 0) ? 'text-yellow-400 fill-yellow-400' : ''}`}
                  style={{ color: i < Math.round(product.rating || 0) ? undefined : 'rgb(var(--color-text-disabled))' }}
                />
              ))}
            </div>
            <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>({product.reviewCount || 0} reviews)</span>
            {product._count?.wishlistItems > 0 && (
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>| {product._count.wishlistItems} wishlists</span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-end gap-3 mb-6">
            <span className="text-3xl font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>{price?.toLocaleString()} TZS</span>
            {originalPrice && (
              <span className="text-lg line-through" style={{ color: 'rgb(var(--color-text-muted))' }}>{originalPrice.toLocaleString()} TZS</span>
            )}
            {originalPrice && <span className="badge-error">-{Math.round((1 - price / originalPrice) * 100)}% OFF</span>}
          </div>

          {/* Variants */}
          {variants.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>Options</h3>
                <span className={`text-xs font-medium ${totalStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalStock > 0 ? `${totalStock.toLocaleString()} available` : 'Out of stock'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {variants.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVariant(v.id); setQuantity(1); }}
                    disabled={v.stock <= 0}
                    className="px-4 py-2 rounded-lg border text-sm transition-colors"
                    style={{
                      borderColor: selectedVariant === v.id ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-border-strong))',
                      backgroundColor: selectedVariant === v.id ? 'rgb(var(--color-primary-50))' : 'transparent',
                      color: v.stock <= 0 ? 'rgb(var(--color-text-disabled))' : selectedVariant === v.id ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text-secondary))',
                      opacity: v.stock <= 0 ? 0.55 : 1,
                    }}
                  >
                    {variantLabel(v)}
                    <span className="ml-1 font-medium">- {v.price?.toLocaleString()} TZS</span>
                    <span className={`ml-1 ${v.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      ({v.stock > 0 ? `${v.stock.toLocaleString()} left` : 'Sold Out'})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center rounded-lg" style={{ border: '1px solid', borderColor: 'rgb(var(--color-border-strong))' }}>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
              </button>
              <span
                className="px-4 py-2 text-sm font-medium min-w-[40px] text-center"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(Math.max(maxQuantity || 1, 1), quantity + 1))}
                disabled={maxQuantity <= 0 || quantity >= maxQuantity}
                className="p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
              </button>
            </div>
            <button onClick={handleAddToCart} disabled={addToCart.isPending || maxQuantity <= 0 || (variants.length > 0 && !selectedVariant)} className="btn-primary flex-1 py-3 text-base">
              <ShoppingCart className="w-5 h-5" aria-hidden="true" />
              {maxQuantity <= 0 ? 'Out of Stock' : addToCart.isPending ? 'Adding...' : 'Add to Cart'}
            </button>
            <button
              onClick={() => addToWishlist.mutate(product.id)}
              className="p-3 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ border: '1px solid', borderColor: 'rgb(var(--color-border-strong))', color: 'rgb(var(--color-text-muted))' }}
              aria-label="Add to wishlist"
            >
              <Heart className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {maxQuantity <= 0 && mappingId && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-medium text-amber-800">Back-in-stock alerts</span>
                <button
                  type="button"
                  onClick={() => isAuthenticated ? backInStock.mutate() : toast.error('Please sign in first')}
                  disabled={backInStock.isPending}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {backInStock.isPending ? 'Saving...' : 'Notify me'}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5 mb-6">
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'details', label: 'Details' },
                { key: 'reviews', label: 'Reviews' },
                { key: 'qa', label: 'Q&A' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${activeTab === tab.key ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-5 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <p className="leading-relaxed">{plainDescription || 'No description available yet.'}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2">Highlights</p>
                      <ul className="space-y-2">
                        <li>Fast shipping and secure checkout</li>
                        <li>Verified seller rating</li>
                        <li>Saved wishlist and cart sync</li>
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2">Quick specs</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-3"><span className="text-slate-500">Price</span><span className="font-medium text-slate-900 dark:text-white">{price?.toLocaleString()} TZS</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-500">Stock</span><span className="font-medium text-slate-900 dark:text-white">{totalStock > 0 ? `${totalStock.toLocaleString()} available` : 'Out of stock'}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-500">Reviews</span><span className="font-medium text-slate-900 dark:text-white">{product.reviewCount || 0}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>Full Description</h4>
                    <div className="prose prose-sm max-w-none" style={{ color: 'rgb(var(--color-text-secondary))' }} dangerouslySetInnerHTML={{ __html: product.description || '<p>No description available.</p>' }} />
                  </div>
                  {product.specifications && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>Product Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(parseJson(product.specifications, {}))
                          .filter(([key, value]) => !['description', 'images', 'variants', 'shippingMethods', 'warehouses'].includes(key) && value)
                          .map(([key, value]) => (
                            <div key={key} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3">
                              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1')}</p>
                              <p className="font-medium text-slate-900 dark:text-white">{typeof value === 'string' ? value : JSON.stringify(value)}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Customer feedback</p>
                        <p className="text-sm font-semibold mt-2" style={{ color: 'rgb(var(--color-text))' }}>{product.reviewCount || 0} reviews</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < Math.round(product.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {isAuthenticated && (
                    <form onSubmit={handleReviewSubmit} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button key={rating} type="button" onClick={() => setReviewForm({ ...reviewForm, rating })} aria-label={`Rate ${rating} stars`}>
                            <Star className={`h-5 w-5 ${rating <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                      <input value={reviewForm.title} onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })} className="input-field" placeholder="Review title" />
                      <textarea value={reviewForm.text} onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })} className="textarea-field" rows={3} placeholder="Share your experience" />
                      <button type="submit" disabled={createReview.isPending} className="btn-primary w-full">{createReview.isPending ? 'Posting...' : 'Post review'}</button>
                    </form>
                  )}
                  <div className="space-y-4">
                    {(reviews.data?.data || []).length === 0 ? (
                      <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>No reviews yet.</p>
                    ) : (
                      reviews.data?.data?.map((review: any) => (
                        <div key={review.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{review.title || 'Customer review'}</p>
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                              ))}
                            </div>
                          </div>
                          {review.text && <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{review.text}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'qa' && (
                <div className="space-y-4">
                  <form onSubmit={handleAskQuestion} className="grid gap-3">
                    <textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="textarea-field" rows={3} placeholder="Ask the seller a question" />
                    <button disabled={askQuestion.isPending || !product?.id} className="btn-primary w-full">{askQuestion.isPending ? 'Sending...' : 'Ask question'}</button>
                  </form>
                  <div className="space-y-4">
                    {(questions.data?.data || []).length === 0 ? (
                      <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>No questions yet.</p>
                    ) : (
                      questions.data?.data?.map((item: any) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4">
                          <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Q: {item.question}</p>
                          <p className="mt-2 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>A: {item.answer || 'Waiting for seller response'}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seller Info - Clickable with Verified Badge */}
          {product.seller && (
            <div className="pt-6 mt-6" style={{ borderTop: '1px solid', borderColor: 'rgb(var(--color-divider))' }}>
              <Link to={`/sellers/${product.seller.storeSlug || product.seller.id}`}
                className="flex items-center gap-3 group"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-semibold relative"
                  style={{ backgroundColor: 'rgb(var(--color-primary-100))', color: 'rgb(var(--color-primary-700))' }}
                >
                  {product.seller.storeLogo ? (
                    <img src={assetUrl(product.seller.storeLogo)} alt={product.seller.storeName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    product.seller.storeName?.[0] || 'S'
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium group-hover:underline" style={{ color: 'rgb(var(--color-text))' }}>
                      {product.seller.storeName}
                    </p>
                    {product.seller.isVerified && <VerifiedBadge size={16} />}
                  </div>
                  <p className="text-sm flex items-center gap-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {product.seller.rating?.toFixed(1)} Rating
                  </p>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center gap-2 mb-5">
            <Eye className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} />
            <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>Related Products</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {relatedProducts.map((p: any) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recommended Products Section */}
      {recommendedProducts.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-5 h-5" style={{ color: 'rgb(var(--color-accent-600))' }} />
            <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>Recommended For You</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {recommendedProducts.map((p: any) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Viewed */}
      <section className="mt-8 mb-8">
        <RecentlyViewed />
      </section>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <section className="card p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Buyer protection</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Secure shopping, verified sellers, and easy returns.</p>
            </div>
            <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">Trusted</span>
          </div>
          <ul className="space-y-3 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            <li className="flex items-start gap-3"><span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700">✓</span> Secure checkout and order tracking</li>
            <li className="flex items-start gap-3"><span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700">✓</span> Seller ratings and verified reviews</li>
            <li className="flex items-start gap-3"><span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-700">✓</span> Wishlist and cart saved to your account</li>
            <li className="flex items-start gap-3"><span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">✓</span> Free returns within 30 days</li>
          </ul>
        </section>
        <aside className="card p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Bundle and protection</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Get extra value with a curated bundle offer.</p>
            </div>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">Bundle</span>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white">1</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Product + Protection</p>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>Add extended coverage for safer returns and fast support.</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Bundle price</span>
              <span className="font-semibold text-slate-900 dark:text-white">Save 10%</span>
            </div>
          </div>
          <button className="btn-primary w-full">Add protection bundle</button>
        </aside>
      </div>
    </div>
  );
}
