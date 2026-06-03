import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { assetUrl } from '../lib/assets';

interface ProductImageGalleryProps {
  images: Array<{ url: string; alt?: string }>;
  productName?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export default function ProductImageGallery({ 
  images, 
  productName = 'Product',
  autoPlay = false,
  autoPlayInterval = 4000
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || images.length <= 1) return;
    
    const timer = setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % images.length);
    }, autoPlayInterval);
    
    return () => clearInterval(timer);
  }, [autoPlay, autoPlayInterval, images.length]);

  const nextImage = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goToImage = (index: number) => {
    setSelectedIndex(index);
  };

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square rounded-2xl overflow-hidden flex items-center justify-center" 
           style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
        <p className="text-lg" style={{ color: 'rgb(var(--color-text-disabled))' }}>No Image</p>
      </div>
    );
  }

  const currentImage = images[selectedIndex];

  return (
    <>
      {/* Main Gallery */}
      <div 
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Main Image with 3D effect */}
        <div className="aspect-square rounded-2xl overflow-hidden relative" 
             style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
          <img
            src={assetUrl(currentImage.url)}
            alt={currentImage.alt || productName}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            style={{
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" style={{ color: 'rgb(var(--color-text))' }} />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" style={{ color: 'rgb(var(--color-text))' }} />
              </button>
            </>
          )}

          {/* Expand button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white"
            aria-label="View fullscreen"
          >
            <Maximize2 className="w-4 h-4" style={{ color: 'rgb(var(--color-text))' }} />
          </button>

          {/* Image counter */}
          <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full text-xs font-medium bg-black/60 text-white">
            {selectedIndex + 1} / {images.length}
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => goToImage(idx)}
                className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all duration-200 ${
                  idx === selectedIndex ? 'border-primary-600' : 'border-transparent'
                }`}
                style={{
                  borderColor: idx === selectedIndex ? 'rgb(var(--color-primary-600))' : 'transparent',
                  opacity: idx === selectedIndex ? 1 : 0.7
                }}
              >
                <img
                  src={assetUrl(img.url)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Close fullscreen"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="relative max-w-4xl w-full">
            <img
              src={assetUrl(currentImage.url)}
              alt={currentImage.alt || productName}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToImage(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === selectedIndex ? 'bg-white w-6' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}