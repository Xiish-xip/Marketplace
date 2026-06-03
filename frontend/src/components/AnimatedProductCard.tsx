import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, Package, ShoppingCart, Star, X } from 'lucide-react';
import { assetUrl } from '../lib/assets';
import { useAddToCart, useAddToWishlist, useRemoveFromWishlist, useWishlist } from '../lib/query-hooks';
import VerifiedBadge from './VerifiedBadge';

interface AnimatedProductCardProps {
  product: any;
  variant?: 'default' | 'compact' | 'list';
  className?: string;
}

export default function AnimatedProductCard({ product, variant = 'default', className = '' }: AnimatedProductCardProps) {
  const { id, slug, title, basePrice, discountPrice, images, rating, totalSales, seller, variants } = product;
  const price = discountPrice || basePrice;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const { data: wishlistData } = useWishlist();

  const productUrl = `/products/${slug || id}`;
  const imageUrls = useMemo(() => {
    return (images || [])
      .map((img: any) => assetUrl(img?.url || img))
      .filter(Boolean);
  }, [images]);
  const activeImage = imageUrls[currentImageIndex] || imageUrls[0];
  const wishlistItems = wishlistData?.data || [];
  const isWishlisted = wishlistItems.some((item: any) => item.productId === id || item.product?.id === id);
  const isList = variant === 'list';
  const isCompact = variant === 'compact';
  const activeVariants = variants || [];
  const firstInStockVariant = activeVariants.find((item: any) => item.stock > 0);
  const totalStock = activeVariants.reduce((sum: number, item: any) => sum + Number(item.stock || 0), 0);
  const canAddToCart = activeVariants.length === 0 || !!firstInStockVariant;

  useEffect(() => {
    if (!isHovered || imageUrls.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length);
    }, 1100);

    return () => clearInterval(interval);
  }, [imageUrls.length, isHovered]);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [id]);

  const handleAddToCart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    addToCart.mutate({ productId: id, variantId: firstInStockVariant?.id, quantity: 1 });
  };

  const handleWishlist = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isWishlisted) removeFromWishlist.mutate(id);
    else addToWishlist.mutate(id);
  };

  const handlePreview = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setPreviewOpen(true);
  };

  return (
    <article
      className={`group overflow-hidden rounded-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${isList ? 'grid grid-cols-[126px_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)]' : 'block'} ${className}`}
      style={{
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid',
        borderColor: 'rgb(var(--color-border))',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative overflow-hidden ${isList ? 'min-h-[148px]' : 'aspect-square'}`} style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
        <Link to={productUrl} className="block h-full w-full" aria-label={title}>
          {imageUrls.length > 0 ? (
            <div className="relative h-full w-full">
              {imageUrls.map((src: string, idx: number) => (
                <img
                  key={`${src}-${idx}`}
                  src={src}
                  alt={title}
                  className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
                    idx === currentImageIndex ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
                  } ${isHovered ? 'group-hover:scale-105' : ''}`}
                  loading="lazy"
                />
              ))}
            </div>
          ) : (
            <div className="grid h-full w-full place-items-center" style={{ color: 'rgb(var(--color-text-disabled))' }}>
              <Package className="h-10 w-10" aria-hidden="true" />
            </div>
          )}
        </Link>

        {imageUrls.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {imageUrls.map((_: string, idx: number) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === currentImageIndex ? 'bg-white w-3' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

        {discountPrice && (
          <span className="absolute top-2 left-2 text-white text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-danger))' }}>
            -{Math.round((1 - discountPrice / basePrice) * 100)}%
          </span>
        )}
        {totalSales > 50 && (
          <span className="absolute left-2 top-8 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-warning) / 0.9)', color: 'white' }}>
            Hot
          </span>
        )}
        {activeVariants.length > 0 && (
          <span className={`absolute left-2 ${totalSales > 50 ? 'top-14' : 'top-8'} text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white`} style={{ backgroundColor: totalStock > 0 ? 'rgb(var(--color-accent-600))' : 'rgb(var(--color-danger))' }}>
            {totalStock > 0 ? `${totalStock.toLocaleString()} in stock` : 'Out of stock'}
          </span>
        )}

        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleWishlist}
            className="grid h-8 w-8 place-items-center rounded-full shadow-sm transition-all hover:scale-105"
            style={{ backgroundColor: 'rgb(var(--color-surface) / 0.92)', color: isWishlisted ? 'rgb(var(--color-danger))' : 'rgb(var(--color-text-secondary))' }}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handlePreview}
            className="grid h-8 w-8 place-items-center rounded-full opacity-100 shadow-sm transition-all hover:scale-105 sm:opacity-0 sm:group-hover:opacity-100"
            style={{ backgroundColor: 'rgb(var(--color-surface) / 0.92)', color: 'rgb(var(--color-text-secondary))' }}
            aria-label="Quick preview"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="absolute inset-x-2 bottom-2 translate-y-0 opacity-100 transition-all duration-300 sm:translate-y-3 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={addToCart.isPending || !canAddToCart}
            className="flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-white shadow-lg disabled:opacity-70"
            style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
          >
            <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
            {!canAddToCart ? 'Out of stock' : addToCart.isPending ? 'Adding...' : 'Add to cart'}
          </button>
        </div>
      </div>

      <div className={`${isCompact ? 'p-2.5' : 'p-3'} ${isList ? 'flex min-w-0 flex-col justify-between' : ''}`}>
        <Link to={productUrl} className={`line-clamp-2 font-medium leading-tight transition-colors hover:text-primary-600 ${isCompact ? 'min-h-[2.5rem] text-xs' : 'text-sm'}`} style={{ color: 'rgb(var(--color-text))' }}>
          {title}
        </Link>
        {seller?.storeName && (
          <Link
            to={`/sellers/${seller.storeSlug || seller.id}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 truncate text-[11px] inline-flex items-center gap-0.5 hover:underline"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            by {seller.storeName}
            {seller.isVerified && <VerifiedBadge size={10} />}
          </Link>
        )}
        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
          <span className={`${isCompact ? 'text-xs' : 'text-sm'} font-bold`} style={{ color: 'rgb(var(--color-primary-600))' }}>{price?.toLocaleString()} TZS</span>
          {discountPrice && (
            <span className="text-[10px] line-through" style={{ color: 'rgb(var(--color-text-muted))' }}>{basePrice?.toLocaleString()}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {rating && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'rgb(var(--color-warning))' }}>
              <Star className="w-2.5 h-2.5 fill-current" /> {rating}
            </span>
          )}
          {totalSales > 0 && (
            <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{totalSales} sold</span>
          )}
        </div>
        {isList && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={handleAddToCart} disabled={!canAddToCart} className="btn-primary btn-sm disabled:opacity-60">
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" /> {canAddToCart ? 'Add' : 'Out'}
            </button>
            <button type="button" onClick={handlePreview} className="btn-secondary btn-sm">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Preview
            </button>
          </div>
        )}
      </div>

      {previewOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setPreviewOpen(false)}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-t-lg shadow-2xl sm:rounded-lg"
            style={{ backgroundColor: 'rgb(var(--color-surface))', pointerEvents: 'auto' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Quick preview</p>
              <button type="button" onClick={() => setPreviewOpen(false)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-gray-100" aria-label="Close preview">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="aspect-square overflow-hidden rounded-lg" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
                {activeImage ? (
                  <img src={activeImage} alt={title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center" style={{ color: 'rgb(var(--color-text-disabled))' }}>
                    <Package className="h-12 w-12" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-col">
                <h3 className="text-lg font-semibold leading-snug" style={{ color: 'rgb(var(--color-text))' }}>{title}</h3>
                {seller?.storeName && (
                  <Link
                    to={`/sellers/${seller.storeSlug || seller.id}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className="mt-1 text-sm inline-flex items-center gap-1 hover:underline"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {seller.storeName}
                    {seller.isVerified && <VerifiedBadge size={12} />}
                  </Link>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xl font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>{price?.toLocaleString()} TZS</span>
                  {discountPrice && <span className="text-sm line-through" style={{ color: 'rgb(var(--color-text-muted))' }}>{basePrice?.toLocaleString()} TZS</span>}
                </div>
                {rating && (
                  <div className="mt-2 flex items-center gap-1 text-sm" style={{ color: 'rgb(var(--color-warning))' }}>
                    <Star className="h-4 w-4 fill-current" aria-hidden="true" /> {rating}
                    {totalSales > 0 && <span className="ml-2" style={{ color: 'rgb(var(--color-text-muted))' }}>{totalSales} sold</span>}
                  </div>
                )}
                <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row">
                  <button type="button" onClick={handleAddToCart} disabled={!canAddToCart} className="btn-primary flex-1 disabled:opacity-60">
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" /> {canAddToCart ? 'Add to cart' : 'Out of stock'}
                  </button>
                  <button type="button" onClick={handleWishlist} className="btn-secondary flex-1">
                    <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} aria-hidden="true" /> {isWishlisted ? 'Saved' : 'Wishlist'}
                  </button>
                </div>
                <Link to={productUrl} className="mt-3 text-center text-sm font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>
                  View full details
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
