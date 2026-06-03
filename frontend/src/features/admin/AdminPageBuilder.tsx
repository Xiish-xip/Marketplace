import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save, Eye, EyeOff, Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
  Copy, Check, X, Settings, Layout, Grid, Layers, Type, Image,
  Square, Maximize, Minus, FileText, Code, Mail, Star, Percent,
  ShoppingBag, List, Columns, FolderTree, ChevronsLeftRight, Store,
  Megaphone, Shield, Pointer, Video, ExternalLink, Undo, Redo,
  Monitor, Tablet, Smartphone, PanelLeft, PanelRight, PanelBottom,
  AlertCircle, RefreshCw, Search, ArrowUpDown, ChevronRight,
  Palette, EyeIcon, Grip, Move, PaintBucket, BoxSelect,
  Columns3, Play
} from 'lucide-react';
import RichTextField from '../../components/fields/RichTextField';
import ImageUploadField from '../../components/fields/ImageUploadField';
import ColorPickerField from '../../components/fields/ColorPickerField';
import IconPickerField from '../../components/fields/IconPickerField';
import LinkSelectorField from '../../components/fields/LinkSelectorField';
import DimensionControlField from '../../components/fields/DimensionControlField';
import RepeaterField from '../../components/fields/RepeaterField';
import VideoUrlField from '../../components/fields/VideoUrlField';
import {
  useComponentTypes,
  useCreateLayout,
  useUpdateLayout,
  useDeleteLayout,
  useDuplicateLayout,
  useAddSection,
  useUpdateSection,
  useDeleteSection,
  useReorderSections,
  useSeedComponents,
  useLayoutById,
  useLayouts,
  useLayoutTree,
  useSaveLayoutTree,
} from '../../lib/page-builder-hooks';
import { useAuthStore } from '../../lib/auth-store';
import {
  PageLayout, PageSection, ComponentDefinition, LayoutBlock, PageLayoutJson,
  COMPONENT_ICONS, COMPONENT_CATEGORIES, COMPONENT_FIELD_SCHEMAS, FieldSchema,
  generateBlockId, createDefaultBlock, findBlockById, findBlockWithParent,
  removeBlockById, duplicateBlockInTree, moveBlockInTree, syncColumnSlots
} from '../../lib/page-builder-types';
import { useConfirm } from '../../components/ConfirmDialog';

const iconMap: Record<string, React.ReactNode> = {
  Layout: <Layout className="w-4 h-4" />,
  Grid: <Grid className="w-4 h-4" />,
  ChevronsLeftRight: <ChevronsLeftRight className="w-4 h-4" />,
  Star: <Star className="w-4 h-4" />,
  Percent: <Percent className="w-4 h-4" />,
  FolderTree: <FolderTree className="w-4 h-4" />,
  List: <List className="w-4 h-4" />,
  Layers: <Layers className="w-4 h-4" />,
  Megaphone: <Megaphone className="w-4 h-4" />,
  Columns: <Columns className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />,
  Pointer: <Pointer className="w-4 h-4" />,
  Store: <Store className="w-4 h-4" />,
  Mail: <Mail className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
  Image: <Image className="w-4 h-4" />,
  Video: <Video className="w-4 h-4" />,
  Code: <Code className="w-4 h-4" />,
  Maximize: <Maximize className="w-4 h-4" />,
  Minus: <Minus className="w-4 h-4" />,
  Square: <Square className="w-4 h-4" />,
  Columns3: <Columns3 className="w-4 h-4" />,
};

function LiveHeroPreview({ settings }: { settings: any }) {
  return (
    <div className="relative overflow-hidden rounded-lg" style={{ minHeight: settings.height === 'large' ? '320px' : '240px', backgroundColor: 'var(--color-primary)' }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
        {settings.eyebrow && <span className="text-sm opacity-80 mb-2 uppercase tracking-wider">{settings.eyebrow}</span>}
        {settings.title && <div className="text-2xl font-bold mb-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_p]:text-sm" dangerouslySetInnerHTML={{ __html: settings.title }} />}
        {settings.subtitle && <div className="text-sm opacity-90 mb-4 [&_p]:text-sm [&_h3]:text-base" dangerouslySetInnerHTML={{ __html: settings.subtitle }} />}
      </div>
    </div>
  );
}

function LiveProductGridPreview({ settings }: { settings: any }) {
  const items = Array.from({ length: settings.columns || 4 });
  return (
    <div className="py-4">
      {settings.title && <h3 className="text-lg font-bold mb-3" style={{ color: 'rgb(var(--color-text))' }}>{settings.title}</h3>}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${settings.columns || 4}, 1fr)` }}>
        {items.map((_, i) => (
          <div key={i} className="rounded-lg p-3" style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
            <div className="aspect-square rounded mb-2" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }} />
            <div className="h-3 rounded w-3/4 mb-1" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }} />
            <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveCategoryRailPreview({ settings }: { settings: any }) {
  return (
    <div className="py-4">
      {settings.title && <h3 className="text-lg font-bold mb-3" style={{ color: 'rgb(var(--color-text))' }}>{settings.title}</h3>}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-24 text-center">
            <div className="w-20 h-20 rounded-full mx-auto mb-1" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveTextPreview({ settings }: { settings: any }) {
  return (
    <div className="py-4" style={{ color: 'rgb(var(--color-text))', textAlign: settings.alignment || 'left' }}>
      <div dangerouslySetInnerHTML={{ __html: settings.content || '<p>Text content</p>' }} />
    </div>
  );
}

function LiveDividerPreview() {
  return <div className="py-4"><div className="w-full h-px" style={{ backgroundColor: 'rgb(var(--color-border))' }} /></div>;
}

function LiveSpacerPreview({ settings }: { settings: any }) {
  return <div style={{ height: settings.height || '2rem' }} />;
}

function LiveBannerPreview({ settings }: { settings: any }) {
  return (
    <div className="flex items-center justify-between rounded-lg p-3" style={{ backgroundColor: 'var(--color-primary)' }}>
      <div className="text-white">
        <div className="text-sm font-bold" dangerouslySetInnerHTML={{ __html: settings.title || 'Special Offer' }} />
        {settings.text && <p className="text-[10px] opacity-80 mt-0.5">{settings.text}</p>}
      </div>
      <span className="shrink-0 bg-white text-gray-900 px-3 py-1 rounded-full text-[10px] font-semibold">{settings.buttonText || 'Shop Now'}</span>
    </div>
  );
}

function LiveTrustCardsPreview({ settings }: { settings: any }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {(settings.cards || []).slice(0, 4).map((card: any, i: number) => (
        <div key={i} className="text-center p-3 rounded-lg text-[10px]" style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
          <Shield className="w-4 h-4 mx-auto mb-1" style={{ color: 'rgb(var(--color-primary-600))' }} />
          <div className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{card.title}</div>
          <div className="opacity-70" style={{ color: 'rgb(var(--color-text-muted))' }}>{card.text}</div>
        </div>
      ))}
    </div>
  );
}

function LiveNewsletterPreview({ settings }: { settings: any }) {
  return (
    <div className="text-center py-4 px-2 rounded-lg" style={{ backgroundColor: settings.backgroundColor || 'rgb(var(--color-surface-muted))' }}>
      <div className="text-sm font-bold" style={{ color: 'rgb(var(--color-text))' }}>{settings.title || 'Stay Updated'}</div>
      <div className="flex gap-1 mt-2 max-w-xs mx-auto">
        <input type="email" readOnly placeholder={settings.placeholder || 'Your email'} className="flex-1 px-2 py-1 rounded text-[10px]" style={{ border: '1px solid rgb(var(--color-border))' }} />
        <button className="px-3 py-1 rounded text-[10px] font-medium text-white" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>{settings.buttonText || 'Subscribe'}</button>
      </div>
    </div>
  );
}

function LivePromoBannersPreview({ settings }: { settings: any }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min((settings.banners || []).length || 2, 3)}, 1fr)` }}>
      {(settings.banners || []).slice(0, 3).map((b: any, i: number) => (
        <div key={i} className="rounded-lg p-3 text-white text-center min-h-[80px] flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
          <div className="text-sm font-bold">{b.title}</div>
          <p className="text-[10px] opacity-80">{b.text}</p>
        </div>
      ))}
    </div>
  );
}

function LiveCtaCardsPreview({ settings }: { settings: any }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
      {(settings.cards || []).slice(0, 2).map((card: any, i: number) => (
        <div key={i} className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
          <div className="text-sm font-bold" style={{ color: 'rgb(var(--color-text))' }}>{card.title}</div>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>{card.text}</p>
        </div>
      ))}
    </div>
  );
}

function LiveImagePreview({ settings }: { settings: any }) {
  return (
    <div className="py-2 text-center">
      {settings.src ? (
        <img src={settings.src} alt={settings.alt || ''} className="max-h-24 mx-auto rounded" style={{ borderRadius: settings.borderRadius || '0.5rem' }} />
      ) : (
        <div className="h-20 flex items-center justify-center rounded" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
          <Image className="w-6 h-6" style={{ color: 'rgb(var(--color-text-disabled))' }} />
        </div>
      )}
      <div className="text-[10px] mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>Image Block</div>
    </div>
  );
}

function LiveVideoPreview({ settings }: { settings: any }) {
  return (
    <div className="py-2 text-center">
      <div className="aspect-video rounded flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
        {settings.url ? (
          <div className="flex items-center gap-2 text-xs">
            <Play className="w-4 h-4" /> Video
          </div>
        ) : (
          <Video className="w-6 h-6" style={{ color: 'rgb(var(--color-text-disabled))' }} />
        )}
      </div>
    </div>
  );
}

function LiveSellerStripPreview({ settings }: { settings: any }) {
  return (
    <div className="py-3 text-center">
      <div className="text-sm font-bold" style={{ color: 'rgb(var(--color-text))' }}>{settings.title || 'Trusted Sellers'}</div>
      <div className="flex justify-center gap-2 mt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-8 h-8 rounded-full" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }} />
        ))}
      </div>
    </div>
  );
}

function LiveCustomHtmlPreview({ settings }: { settings: any }) {
  return (
    <div className="py-2 text-center text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
      <Code className="w-4 h-4 mx-auto mb-1" />
      {settings.html ? 'Custom HTML' : 'No HTML content'}
    </div>
  );
}

function LiveTabbedShowcasePreview({ settings }: { settings: any }) {
  return (
    <div className="py-2">
      <div className="text-sm font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>{settings.title || 'Discover'}</div>
      <div className="flex gap-1">
        {(settings.tabs || []).slice(0, 4).map((tab: any, i: number) => (
          <span key={i} className={`px-2 py-0.5 text-[10px] rounded-full ${i === 0 ? 'text-white' : ''}`}
            style={{ backgroundColor: i === 0 ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-surface-muted))' }}>
            {tab.label || `Tab ${i + 1}`}
          </span>
        ))}
      </div>
    </div>
  );
}

function LiveProductCarouselPreview({ settings }: { settings: any }) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold" style={{ color: 'rgb(var(--color-text))' }}>{settings.title || 'Best Sellers'}</span>
        <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>Carousel</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-16 shrink-0">
            <div className="aspect-square rounded" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveImageGalleryPreview({ settings }: { settings: any }) {
  return (
    <div className="py-2">
      <div className="text-sm font-bold" style={{ color: 'rgb(var(--color-text))' }}>{settings.title || 'Gallery'}</div>
      <div className="grid gap-1 mt-1" style={{ gridTemplateColumns: `repeat(${settings.columns || 3}, 1fr)` }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aspect-square rounded" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }} />
        ))}
      </div>
    </div>
  );
}

function LiveVideoPlayerPreview({ settings }: { settings: any }) {
  return <LiveVideoPreview settings={settings} />;
}

function LiveLogoCloudPreview({ settings }: { settings: any }) {
  return (
    <div className="py-2 text-center">
      <div className="text-xs font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>{settings.title || 'Trusted By'}</div>
      <div className="flex justify-center gap-3">
        {Array.from({ length: (settings.logos || []).length || 3 }).map((_, i) => (
          <div key={i} className="w-12 h-8 rounded" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }} />
        ))}
      </div>
    </div>
  );
}

function LiveIconGridPreview({ settings }: { settings: any }) {
  return (
    <div className="py-2">
      <div className="text-sm font-bold" style={{ color: 'rgb(var(--color-text))' }}>{settings.title || 'Features'}</div>
      <div className="grid gap-1 mt-1" style={{ gridTemplateColumns: `repeat(${(settings.columns || 4)}, 1fr)` }}>
        {(settings.icons || []).slice(0, 4).map((icon: any, i: number) => (
          <div key={i} className="text-center p-2 rounded text-[10px]" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
            <Star className="w-4 h-4 mx-auto mb-1" />
            <div className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{icon.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveParallaxBannerPreview({ settings }: { settings: any }) {
  return (
    <div className="py-3 text-center rounded" style={{ backgroundColor: 'rgb(var(--color-primary))', minHeight: Math.min(parseInt(settings.height) || 60, 120) }}>
      <div className="text-white">
        <div className="text-sm font-bold">{settings.title || 'Parallax Banner'}</div>
        {settings.subtitle && <div className="text-[10px] opacity-80">{settings.subtitle}</div>}
      </div>
    </div>
  );
}

function LiveMasonryGalleryPreview({ settings }: { settings: any }) {
  return (
    <div className="py-2">
      <div className="text-sm font-bold" style={{ color: 'rgb(var(--color-text))' }}>{settings.title || 'Masonry Gallery'}</div>
      <div className="flex gap-1 mt-1" style={{ columns: settings.columns || 3 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded mb-1" style={{ backgroundColor: 'rgb(var(--color-surface-muted))', height: `${30 + i * 15}px` }} />
        ))}
      </div>
    </div>
  );
}

function BlockPreview({ block }: { block: LayoutBlock }) {
  const s = block.settings;
  switch (block.type) {
    case 'hero': return <LiveHeroPreview settings={s} />;
    case 'product_grid':
    case 'featured_products':
    case 'deal_rail':
      return <LiveProductGridPreview settings={{ ...s, title: s.title }} />;
    case 'category_rail':
    case 'category_scroller':
      return <LiveCategoryRailPreview settings={s} />;
    case 'text_block':
      return <LiveTextPreview settings={s} />;
    case 'divider': return <LiveDividerPreview />;
    case 'spacer': return <LiveSpacerPreview settings={s} />;
    case 'container':
      return <div className="p-2 border border-dashed rounded" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Container: {s.maxWidth || '1280px'}</span>
      </div>;
    case 'columns':
      return (
        <div className="space-y-2 rounded border border-dashed p-2" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text))' }}>{s.columnCount || block.children.length || 2} columns</span>
            <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>Drop blocks into each slot</span>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${s.columnCount || block.children.length || 2}, minmax(0, 1fr))` }}>
            {Array.from({ length: s.columnCount || block.children.length || 2 }).map((_, i) => (
              <div key={i} className="min-h-[48px] rounded border border-dashed p-2 text-center text-[10px]" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface-muted))', color: 'rgb(var(--color-text-muted))' }}>
                Column {i + 1}
                <div className="mt-1 font-medium">{block.children[i]?.children?.length || 0} blocks</div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'image_block': return <LiveImagePreview settings={s} />;
    case 'banner': return <LiveBannerPreview settings={s} />;
    case 'trust_cards': return <LiveTrustCardsPreview settings={s} />;
    case 'newsletter': return <LiveNewsletterPreview settings={s} />;
    case 'promo_banners': return <LivePromoBannersPreview settings={s} />;
    case 'cta_cards': return <LiveCtaCardsPreview settings={s} />;
    case 'seller_strip': return <LiveSellerStripPreview settings={s} />;
    case 'custom_html': return <LiveCustomHtmlPreview settings={s} />;
    case 'video_block': return <LiveVideoPreview settings={s} />;
    case 'tabbed_showcase': return <LiveTabbedShowcasePreview settings={s} />;
    case 'product_carousel': return <LiveProductCarouselPreview settings={s} />;
    case 'image_gallery': return <LiveImageGalleryPreview settings={s} />;
    case 'video_player': return <LiveVideoPlayerPreview settings={s} />;
    case 'logo_cloud': return <LiveLogoCloudPreview settings={s} />;
    case 'icon_grid': return <LiveIconGridPreview settings={s} />;
    case 'parallax_banner': return <LiveParallaxBannerPreview settings={s} />;
    case 'masonry_gallery': return <LiveMasonryGalleryPreview settings={s} />;
    default:
      return (
        <div className="py-4 text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
          <p className="text-sm font-medium">{block.type}</p>
        </div>
      );
  }
}

function FullPagePreview({ tree }: { tree: LayoutBlock[] }) {
  function renderBlock(block: LayoutBlock): React.ReactNode {
    const s = block.settings;
    switch (block.type) {
      case 'hero':
        return (
          <section className="relative overflow-hidden" style={{ minHeight: s.height === 'large' ? '480px' : s.height === 'medium' ? '360px' : '280px', backgroundColor: 'var(--color-primary)' }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-6 text-center">
              {s.eyebrow && <span className="text-sm md:text-base uppercase tracking-widest mb-3 opacity-80">{s.eyebrow}</span>}
              {s.title && <div className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 max-w-3xl [&_h1]:text-3xl [&_h1]:md:text-5xl [&_h1]:font-bold [&_h2]:text-2xl [&_h2]:font-bold [&_p]:text-base [&_p]:opacity-90" dangerouslySetInnerHTML={{ __html: s.title }} />}
              {s.subtitle && <div className="text-base md:text-lg opacity-90 mb-6 max-w-xl" dangerouslySetInnerHTML={{ __html: s.subtitle }} />}
            </div>
          </section>
        );
      case 'product_grid':
      case 'featured_products':
      case 'deal_rail':
      case 'product_carousel':
        return (
          <section className="py-8 md:py-12">
            <div className="max-w-7xl mx-auto px-4">
              {s.title && <h2 className="text-xl md:text-2xl font-bold mb-6" style={{ color: 'rgb(var(--color-text))' }}>{s.title}</h2>}
              <div className="pb-product-grid" style={{ gap: '1rem', '--pb-grid-desktop': String(Math.min(s.columns || 4, 4)), '--pb-grid-tablet': String(Math.min(s.columns || 3, 3)), '--pb-grid-mobile': '2' } as React.CSSProperties}>
                {Array.from({ length: (s.columns || 4) * (s.rows || 1) }).map((_, i) => (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
                    <div className="aspect-square" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }} />
                    <div className="p-3 space-y-2">
                      <div className="h-3 rounded w-3/4" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }} />
                      <div className="h-4 rounded w-1/2" style={{ backgroundColor: 'rgb(var(--color-primary-100))' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      case 'category_rail':
      case 'category_scroller':
        return (
          <section className="py-8 md:py-12">
            <div className="max-w-7xl mx-auto px-4">
              {s.title && <h2 className="text-xl md:text-2xl font-bold mb-6" style={{ color: 'rgb(var(--color-text))' }}>{s.title}</h2>}
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(100px, 1fr))` }}>
                {Array.from({ length: s.limit || 8 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
                    <div className="w-12 h-12 rounded-full" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }} />
                    <div className="h-2 rounded w-16" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      case 'text_block':
        return (
          <section className="py-8 md:py-12">
            <div className="max-w-7xl mx-auto px-4">
              <div className="prose max-w-none" style={{ color: 'rgb(var(--color-text))', textAlign: s.alignment || 'left' }} dangerouslySetInnerHTML={{ __html: s.content || '' }} />
            </div>
          </section>
        );
      case 'image_block':
        return (
          <section className="py-8 md:py-12">
            <div className="max-w-7xl mx-auto px-4">
              <figure className="overflow-hidden" style={{ borderRadius: s.borderRadius || '0.5rem' }}>
                {s.src ? <img src={s.src} alt={s.alt || ''} className="w-full h-auto" /> : (
                  <div className="w-full h-48 flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
                    <Image className="w-8 h-8" style={{ color: 'rgb(var(--color-text-disabled))' }} />
                  </div>
                )}
              </figure>
            </div>
          </section>
        );
      case 'divider':
        return <div className="max-w-7xl mx-auto px-4 py-4"><hr style={{ borderColor: 'rgb(var(--color-border))' }} /></div>;
      case 'spacer':
        return <div style={{ height: s.height || '2rem' }} />;
      case 'container':
        return (
          <div className="mx-auto" style={{ maxWidth: s.maxWidth || '1280px', paddingLeft: s.paddingX || '1rem', paddingRight: s.paddingX || '1rem' }}>
            {block.children.map(child => <div key={child.id}>{renderBlock(child)}</div>)}
          </div>
        );
      case 'columns':
        return (
          <section className="py-8 md:py-12">
            <div className="max-w-7xl mx-auto px-4">
              <div className="pb-columns-grid" style={{ gap: s.gap || '1.5rem', alignItems: s.verticalAlign || 'stretch', '--pb-columns-desktop': String(s.desktopColumns || s.columnCount || block.children.length || 2), '--pb-columns-tablet': String(s.tabletColumns || Math.min(s.columnCount || block.children.length || 2, 2)), '--pb-columns-mobile': String(s.mobileColumns || 1) } as React.CSSProperties}>
                {Array.from({ length: s.columnCount || block.children.length || 2 }).map((_, i) => (
                  <div key={i} className="min-h-[100px]">
                    {block.children[i]?.children?.map(child => <div key={child.id}>{renderBlock(child)}</div>)}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      case 'column':
        return <>{block.children.map(child => <div key={child.id}>{renderBlock(child)}</div>)}</>;
      default:
        return (
          <section className="py-8">
            <div className="max-w-7xl mx-auto px-4 text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <div className="p-8 rounded-xl" style={{ border: '1px dashed rgb(var(--color-border))' }}>
                <Layout className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">{block.type}</p>
              </div>
            </div>
          </section>
        );
    }
  }
  return (
    <div style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      {tree.map((block) => <div key={block.id}>{renderBlock(block)}</div>)}
    </div>
  );
}

function LeftSidebar({ componentTypes, tree, selectedBlockId, onAddBlock, onSelectBlock, onDeleteBlock, onClose }: {
  componentTypes: ComponentDefinition[];
  tree: LayoutBlock[];
  selectedBlockId: string | null;
  onAddBlock: (type: string) => void;
  onSelectBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'palette' | 'navigator'>('palette');
  const [search, setSearch] = useState('');
  const categories = ['content', 'products', 'marketing', 'layout'];
  const filtered = componentTypes.filter(c =>
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.type.toLowerCase().includes(search.toLowerCase())
  );
  function renderTree(blocks: LayoutBlock[], depth = 0): React.ReactNode {
    return blocks.map((block) => (
      <div key={block.id}>
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors" style={{ paddingLeft: `${12 + depth * 16}px`, backgroundColor: selectedBlockId === block.id ? 'rgb(var(--color-primary-100))' : 'transparent', color: selectedBlockId === block.id ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text))' }} onClick={() => onSelectBlock(block.id)}>
          <span className="shrink-0 w-4 h-4 flex items-center justify-center" style={{ color: 'rgb(var(--color-primary-500))' }}>
            {COMPONENT_ICONS[block.type] ? iconMap[COMPONENT_ICONS[block.type]] : <Layout className="w-3 h-3" />}
          </span>
          <span className="truncate flex-1">{block.settings.label || block.settings.title || block.type}</span>
          <button onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id); }} className="opacity-0 hover:opacity-100 p-0.5 rounded" style={{ color: 'rgb(var(--color-danger))' }}><X className="w-3 h-3" /></button>
        </div>
        {block.children.length > 0 && renderTree(block.children, depth + 1)}
      </div>
    ));
  }
  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex border-b shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <button onClick={() => setTab('palette')} className="flex-1 py-2.5 text-xs font-medium text-center transition-colors" style={{ borderBottomColor: tab === 'palette' ? 'rgb(var(--color-primary-600))' : 'transparent', color: tab === 'palette' ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))' }}><Plus className="w-3.5 h-3.5 inline mr-1" /> Add</button>
        <button onClick={() => setTab('navigator')} className="flex-1 py-2.5 text-xs font-medium text-center transition-colors" style={{ borderBottomColor: tab === 'navigator' ? 'rgb(var(--color-primary-600))' : 'transparent', color: tab === 'navigator' ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))' }}><List className="w-3.5 h-3.5 inline mr-1" /> Navigator</button>
      </div>
      {tab === 'palette' && componentTypes.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'rgb(var(--color-primary-50))' }}><Layout className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} /></div>
          <p className="text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>No blocks yet</p>
          <p className="text-xs mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>Add components from the palette so the page is not empty</p>
          <button onClick={() => { window.dispatchEvent(new CustomEvent('seed-page-components')); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white shadow-sm" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}><RefreshCw className="w-3.5 h-3.5" /> Seed Components</button>
        </div>
      )}
      {tab === 'palette' && componentTypes.length > 0 && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2 w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-7 pr-2 py-1.5 rounded text-xs" style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text))' }} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
            {categories.map((cat) => {
              const items = filtered.filter(c => c.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1" style={{ color: 'rgb(var(--color-text-muted))' }}>{COMPONENT_CATEGORIES[cat] || cat}</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {items.map((comp) => (
                      <button key={comp.id} onClick={() => onAddBlock(comp.type)} onDragStart={(e) => { e.dataTransfer.setData('blockType', comp.type); e.dataTransfer.effectAllowed = 'copy'; }} draggable className="flex items-center gap-1.5 p-2 rounded text-[10px] transition-all hover:shadow-sm text-left" style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text-secondary))' }}>
                        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-600))' }}>
                          {comp.icon ? iconMap[comp.icon] || <Layout className="w-3 h-3" /> : <Layout className="w-3 h-3" />}
                        </div>
                        <span className="leading-tight">{comp.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tab === 'navigator' && (
        <div className="flex-1 overflow-y-auto p-2">
          {tree.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'rgb(var(--color-text-muted))' }}><p className="text-xs">No blocks yet</p></div>
          ) : renderTree(tree)}
        </div>
      )}
    </div>
  );
}

function EditorCanvas({ tree, componentTypes, selectedBlockId, onSelectBlock, onDeleteBlock, onDuplicateBlock, onMoveBlock, onDropBlock, onAddBlockToColumn }: {
  tree: LayoutBlock[];
  componentTypes: ComponentDefinition[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: 'up' | 'down') => void;
  onDropBlock: (type: string, index: number) => void;
  onAddBlockToColumn?: (columnId: string, type: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [internalDragBlockId, setInternalDragBlockId] = useState<string | null>(null);
  const [dropTargetBlockId, setDropTargetBlockId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; blockId: string } | null>(null);
  const quickAddTypes = useMemo(
    () => componentTypes.filter(c => ['text_block', 'image_block', 'product_grid', 'banner', 'custom_html'].includes(c.type)).slice(0, 5),
    [componentTypes]
  );

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    try {
      e.preventDefault();
      if (!e.dataTransfer.types.includes('blockType')) return;
      setIsDragOver(true);
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top + canvasRef.current.scrollTop;
        const sectionEls = canvasRef.current.querySelectorAll('[data-block-index]');
        let idx = tree.length;
        sectionEls.forEach((el) => {
          const elIdx = Number(el.getAttribute('data-block-index'));
          const elRect = el.getBoundingClientRect();
          const midY = elRect.top + elRect.height / 2 - rect.top + canvasRef.current!.scrollTop;
          if (y > midY) idx = Math.max(idx, elIdx + 1);
          else idx = Math.min(idx, elIdx);
        });
        setDragIndex(idx);
      }
    } catch (error) {
      setIsDragOver(false);
      setDragIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    try {
      e.preventDefault();
      setIsDragOver(false);
      setHoveredColumnId(null);
      const type = e.dataTransfer.getData('blockType');
      if (type && dragIndex !== null) onDropBlock(type, dragIndex);
      else if (type) onDropBlock(type, tree.length);
      setDragIndex(null);
    } catch (error) {
      setIsDragOver(false);
      setDragIndex(null);
      setHoveredColumnId(null);
    }
  };

  const handleDragLeave = () => { setIsDragOver(false); setDragIndex(null); setHoveredColumnId(null); };

  const handleColumnDrop = (columnId: string, e: React.DragEvent) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      const type = e.dataTransfer.getData('blockType');
      if (type && onAddBlockToColumn) onAddBlockToColumn(columnId, type);
      setHoveredColumnId(null);
    } catch { setHoveredColumnId(null); }
  };

  const handleBlockDragStart = (e: React.DragEvent, blockId: string) => {
    e.dataTransfer.setData('blockId', blockId);
    e.dataTransfer.setData('blockType', '__internal_reorder__');
    e.dataTransfer.effectAllowed = 'move';
    setInternalDragBlockId(blockId);
  };

  const handleBlockDragOver = (e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    if (internalDragBlockId && internalDragBlockId !== blockId) setDropTargetBlockId(blockId);
  };

  const handleBlockDragLeave = () => setDropTargetBlockId(null);

  const handleBlockDrop = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData('blockId') || internalDragBlockId;
    if (draggedId && draggedId !== targetBlockId && (window as any).__onReorderBlock) {
      (window as any).__onReorderBlock(draggedId, targetBlockId);
    }
    setInternalDragBlockId(null);
    setDropTargetBlockId(null);
  };

  const handleContextMenuOpen = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectBlock(blockId);
    setContextMenu({ x: e.clientX, y: e.clientY, blockId });
  };

  function renderBlockWrapper(block: LayoutBlock, index: number, depth = 0): React.ReactNode {
    const isSelected = selectedBlockId === block.id;
    const isColumn = block.type === 'column';
    const isHoveredColumn = hoveredColumnId === block.id;
    const isDropTarget = dropTargetBlockId === block.id && internalDragBlockId && internalDragBlockId !== block.id;

    return (
      <div key={block.id} data-block-index={index}>
        {!isColumn && isDragOver && dragIndex === index && <div className="h-1 rounded-full mb-1" style={{ backgroundColor: 'rgb(var(--color-primary-400))' }} />}
        {isDropTarget && <div className="h-1 rounded-full mb-1" style={{ backgroundColor: 'rgb(var(--color-accent))' }} />}
        <div
          draggable={!isColumn}
          onDragStart={(e) => handleBlockDragStart(e, block.id)}
          onDragOver={(e) => handleBlockDragOver(e, block.id)}
          onDragLeave={handleBlockDragLeave}
          onDrop={(e) => handleBlockDrop(e, block.id)}
          onContextMenu={(e) => handleContextMenuOpen(e, block.id)}
          className={`relative group rounded-lg transition-all ${isSelected ? 'ring-2' : 'hover:ring-1'}`}
          style={{
            border: `${isHoveredColumn ? '2px' : '1px'} solid`,
            borderColor: isDropTarget ? 'rgb(var(--color-accent))' : isHoveredColumn ? 'rgb(var(--color-primary-400))' : isSelected ? 'rgb(var(--color-primary-400))' : 'rgb(var(--color-border))',
            backgroundColor: isColumn ? 'rgb(var(--color-surface-muted))' : 'rgb(var(--color-surface))',
            marginLeft: isColumn ? 0 : `${depth * 16}px`,
            cursor: isColumn ? 'default' : 'grab',
          }}
          onClick={() => onSelectBlock(block.id)}
        >
          {!isColumn && (
            <div className={`flex items-center justify-between px-2 py-1 border-b ${isSelected ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`} style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface-muted))' }}>
              <div className="flex items-center gap-1.5 text-[10px]">
                <GripVertical className="w-3 h-3 cursor-grab" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <span className="font-medium px-1 py-0.5 rounded text-[9px]" style={{ backgroundColor: 'rgb(var(--color-primary-100))', color: 'rgb(var(--color-primary-700))' }}>{block.type}</span>
                <span className="truncate max-w-[120px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{block.settings.title || block.settings.label || ''}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={(e) => { e.stopPropagation(); onMoveBlock(block.id, 'up'); }} className="p-0.5 rounded hover:bg-black/5" style={{ color: 'rgb(var(--color-text-muted))' }}><ChevronUp className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); onMoveBlock(block.id, 'down'); }} className="p-0.5 rounded hover:bg-black/5" style={{ color: 'rgb(var(--color-text-muted))' }}><ChevronDown className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); onDuplicateBlock(block.id); }} className="p-0.5 rounded hover:bg-black/5" style={{ color: 'rgb(var(--color-text-muted))' }}><Copy className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id); }} className="p-0.5 rounded hover:bg-red-50" style={{ color: 'rgb(var(--color-danger))' }}><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          )}
          <div className="p-2">
            {isColumn ? (
              <div className="min-h-[60px] rounded transition-colors" style={{ backgroundColor: isHoveredColumn ? 'rgb(var(--color-primary-50))' : 'transparent' }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; setHoveredColumnId(block.id); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHoveredColumnId(null); }}
                onDrop={(e) => handleColumnDrop(block.id, e)}
              >
                <div className="flex items-center gap-1 mb-1"><Columns className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} /><span className="text-[10px] font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>{block.settings.label || 'Column'}</span></div>
                {block.children.length > 0 ? (
                  <div className="space-y-1">
                    {block.children.map((child, ci) => (
                      <React.Fragment key={child.id}>
                        {isHoveredColumn && <div className="h-1 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-300))' }} />}
                        {renderBlockWrapper(child, ci, depth + 1)}
                      </React.Fragment>
                    ))}
                    {isHoveredColumn && block.children.length > 0 && <div className="h-1 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-300))' }} />}
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded p-3 text-center transition-colors" style={{ borderColor: isHoveredColumn ? 'rgb(var(--color-primary-400))' : 'rgb(var(--color-border))', backgroundColor: isHoveredColumn ? 'rgb(var(--color-primary-50))' : 'transparent' }}>
                    <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-disabled))' }}>{isHoveredColumn ? 'Drop here' : 'Drop blocks here'}</p>
                  </div>
                )}
                {quickAddTypes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {quickAddTypes.map((comp) => (
                      <button key={comp.type} type="button" onClick={(e) => { e.stopPropagation(); onAddBlockToColumn?.(block.id, comp.type); }} className="rounded px-1.5 py-1 text-[10px] font-medium" style={{ border: '1px solid rgb(var(--color-border))', color: 'rgb(var(--color-text-secondary))', backgroundColor: 'rgb(var(--color-surface))' }}>+ {comp.label}</button>
                    ))}
                  </div>
                )}
              </div>
            ) : block.type === 'columns' ? (
              <div className="space-y-2">
                <BlockPreview block={block} />
                <div className="pb-columns-grid" style={{ gap: block.settings.gap || '1rem', alignItems: block.settings.verticalAlign || 'stretch', '--pb-columns-desktop': String(block.settings.desktopColumns || block.settings.columnCount || block.children.length || 2), '--pb-columns-tablet': String(block.settings.tabletColumns || Math.min(block.settings.columnCount || block.children.length || 2, 2)), '--pb-columns-mobile': String(block.settings.mobileColumns || 1) } as React.CSSProperties}>
                  {Array.from({ length: block.settings.columnCount || block.children.length || 2 }).map((_, columnIndex) => {
                    const column = block.children[columnIndex] || { id: `${block.id}_placeholder_${columnIndex}`, type: 'column', settings: { label: `Column ${columnIndex + 1}` }, children: [] };
                    return renderBlockWrapper(column, columnIndex, depth + 1);
                  })}
                </div>
              </div>
            ) : <BlockPreview block={block} />}
          </div>
          {block.type === 'container' && block.children.length > 0 && (
            <div className="px-2 pb-2 space-y-1">{block.children.map((child, ci) => renderBlockWrapper(child, ci, depth + 1))}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={canvasRef} className="flex-1 overflow-y-auto p-4" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {isDragOver && !hoveredColumnId && (
        <div className="text-center py-6 rounded-xl border-2 border-dashed mb-3" style={{ borderColor: 'rgb(var(--color-primary-300))', backgroundColor: 'rgb(var(--color-primary-50))' }}>
          <p className="text-xs font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>Drop at position {dragIndex !== null ? dragIndex + 1 : 'end'}</p>
        </div>
      )}
      {tree.length === 0 && !isDragOver && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Layout className="w-12 h-12 mb-3" style={{ color: 'rgb(var(--color-text-disabled))' }} />
          <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>Empty page</p>
          <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-disabled))' }}>Add blocks from the palette or drag them here</p>
        </div>
      )}
      <div className="space-y-2">{tree.map((block, index) => renderBlockWrapper(block, index))}</div>
      {contextMenu && (
        <div className="fixed z-50 rounded-lg shadow-lg border py-1 min-w-[140px]" style={{ top: contextMenu.y, left: contextMenu.x, backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
          onClick={() => setContextMenu(null)}>
          <button onClick={() => { onDuplicateBlock(contextMenu.blockId); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100" style={{ color: 'rgb(var(--color-text))' }}>Duplicate</button>
          <button onClick={() => { onMoveBlock(contextMenu.blockId, 'up'); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100" style={{ color: 'rgb(var(--color-text))' }}>Move Up</button>
          <button onClick={() => { onMoveBlock(contextMenu.blockId, 'down'); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100" style={{ color: 'rgb(var(--color-text))' }}>Move Down</button>
          <div className="h-px my-1" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
          <button onClick={() => { onDeleteBlock(contextMenu.blockId); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50" style={{ color: 'rgb(var(--color-danger))' }}>Delete</button>
        </div>
      )}
    </div>
  );
}

const COMMON_EFFECT_FIELDS: FieldSchema[] = [
  { key: 'animation', label: 'Entrance Animation', type: 'select', defaultValue: 'none', options: [{ label: 'None', value: 'none' }, { label: 'Fade in', value: 'fade-in' }, { label: 'Fade up', value: 'fade-up' }, { label: 'Slide left', value: 'slide-left' }, { label: 'Zoom in', value: 'zoom-in' }], group: 'Effects' },
  { key: 'animationDuration', label: 'Duration (ms)', type: 'number', defaultValue: 500, group: 'Effects' },
  { key: 'animationDelay', label: 'Delay (ms)', type: 'number', defaultValue: 0, group: 'Effects' },
  { key: 'hoverEffect', label: 'Hover Effect', type: 'select', defaultValue: 'none', options: [{ label: 'None', value: 'none' }, { label: 'Lift', value: 'lift' }, { label: 'Glow', value: 'glow' }, { label: 'Zoom', value: 'zoom' }, { label: 'Tilt', value: 'tilt' }], group: 'Effects' },
  { key: 'shadow', label: 'Shadow', type: 'select', defaultValue: 'none', options: [{ label: 'None', value: 'none' }, { label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' }], group: 'Effects' },
  { key: 'backgroundColor', label: 'Background', type: 'color', defaultValue: '', group: 'Style' },
  { key: 'textColor', label: 'Text Color', type: 'color', defaultValue: '', group: 'Style' },
  { key: 'borderRadius', label: 'Border Radius', type: 'text', defaultValue: '', group: 'Style' },
  { key: 'paddingTop', label: 'Padding Top', type: 'text', defaultValue: '', group: 'Spacing' },
  { key: 'paddingBottom', label: 'Padding Bottom', type: 'text', defaultValue: '', group: 'Spacing' },
];

function InspectorPanel({ block, componentDef, onUpdateSettings, onClose }: {
  block: LayoutBlock;
  componentDef?: ComponentDefinition;
  onUpdateSettings: (blockId: string, settings: Record<string, any>) => void;
  onClose: () => void;
}) {
  const [localSettings, setLocalSettings] = useState(block.settings || {});
  const [panel, setPanel] = useState<'review' | 'edit' | 'effects'>('review');
  const [activeGroup, setActiveGroup] = useState<string>('Content');
  const schemas = COMPONENT_FIELD_SCHEMAS[block.type] || [];
  const groups = schemas.length > 0 ? [...new Set(schemas.map(s => s.group || 'General'))] : ['General'];
  const effectKeys = useMemo(() => new Set(COMMON_EFFECT_FIELDS.map(field => field.key)), []);
  const defaultProps = componentDef?.defaultProps || {};

  useEffect(() => {
    setLocalSettings(block.settings || {});
    setPanel('review');
    const nextSchemas = COMPONENT_FIELD_SCHEMAS[block.type] || [];
    setActiveGroup(nextSchemas[0]?.group || 'General');
  }, [block.id, block.type, block.settings]);

  const allKeys = useMemo(() => {
    const schemaKeys = schemas.map(s => s.key);
    const settingsKeys = Object.keys(localSettings);
    return [...new Set([...schemaKeys, ...settingsKeys])];
  }, [schemas, localSettings]);

  const handleChange = (key: string, value: any) => {
    setLocalSettings(prev => {
      const next = { ...prev, [key]: value };
      onUpdateSettings(block.id, next);
      return next;
    });
  };

  const handleSave = () => {
    onUpdateSettings(block.id, localSettings);
  };

  function renderField(key: string, forcedSchema?: FieldSchema) {
    const schema = forcedSchema || schemas.find(s => s.key === key);
    const value = localSettings[key] !== undefined ? localSettings[key] : schema?.defaultValue ?? defaultProps[key];
    const label = schema?.label || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (schema?.type === 'boolean' || typeof value === 'boolean') {
      return (
        <div key={key} className="flex items-center justify-between py-1">
          <label className="text-[11px] font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>{label}</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={!!value} onChange={(e) => handleChange(key, e.target.checked)} className="sr-only peer" />
            <div className="w-8 h-4 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all" style={{ backgroundColor: value ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-border))' }} />
          </label>
        </div>
      );
    }
    if (schema?.type === 'select' && schema.options) {
      return (
        <div key={key} className="py-1">
          <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'rgb(var(--color-text-secondary))' }}>{label}</label>
          <select value={String(value ?? '')} onChange={(e) => handleChange(key, e.target.value)} className="w-full px-2 py-1.5 rounded text-xs" style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text))' }}>
            {schema.options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      );
    }
    if (schema?.type === 'number' || typeof value === 'number') {
      const numValue = value != null ? Number(value) : (schema?.defaultValue != null ? Number(schema.defaultValue) : 0);
      return (
        <div key={key} className="py-1">
          <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'rgb(var(--color-text-secondary))' }}>{label}</label>
          <input type="number" value={isNaN(numValue) ? 0 : numValue} onChange={(e) => handleChange(key, Number(e.target.value))} className="w-full px-2 py-1.5 rounded text-xs" style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text))' }} />
        </div>
      );
    }
    if (schema?.type === 'richtext') {
      return (
        <div key={key} className="py-2">
          <RichTextField label={label} value={value ?? ''} onChange={(val) => handleChange(key, val)} placeholder={schema?.placeholder || 'Start writing...'} description={schema?.description} />
        </div>
      );
    }
    if (schema?.type === 'image') {
      return (
        <div key={key} className="py-2">
          <ImageUploadField label={label} value={value ?? ''} onChange={(val) => handleChange(key, val)} placeholder={schema?.placeholder || 'Enter image URL...'} description={schema?.description} />
        </div>
      );
    }
    if (schema?.type === 'video') {
      return (
        <div key={key} className="py-2">
          <VideoUrlField label={label} value={value ?? ''} onChange={(val) => handleChange(key, val)} placeholder={schema?.placeholder || 'Enter video URL...'} description={schema?.description} />
        </div>
      );
    }
    if (schema?.type === 'icon') {
      return (
        <div key={key} className="py-2">
          <IconPickerField label={label} value={value ?? ''} onChange={(val) => handleChange(key, val)} placeholder={schema?.placeholder || 'Search icons...'} description={schema?.description} />
        </div>
      );
    }
    if (schema?.type === 'link') {
      return (
        <div key={key} className="py-2">
          <LinkSelectorField label={label} value={value ?? ''} onChange={(val) => handleChange(key, val)} placeholder={schema?.placeholder || 'Select URL...'} description={schema?.description} />
        </div>
      );
    }
    if (schema?.type === 'dimension') {
      return (
        <div key={key} className="py-1">
          <DimensionControlField label={label} value={value ?? ''} onChange={(val) => handleChange(key, val)} description={schema?.description} />
        </div>
      );
    }
    if (schema?.type === 'repeater' && schema.itemFields) {
      const currentValue: any[] = value ?? schema.defaultValue ?? [];
      return (
        <div key={key} className="py-2">
          <RepeaterField label={label} value={currentValue} onChange={(val) => handleChange(key, val)} defaultNewItem={schema.defaultValue?.[0] || {}} description={schema?.description}
            renderItem={({ item, index, onChange: itemOnChange }) => (
              <div className="space-y-1.5">
                {schema.itemFields!.map((subField) => {
                  const subValue = item[subField.key] !== undefined ? item[subField.key] : subField.defaultValue;
                  const subLabel = subField.label || subField.key;
                  return <div key={subField.key}><label className="block text-[10px] font-medium mb-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>{subLabel}</label>
                    <input type="text" value={String(subValue ?? '')} onChange={(e) => itemOnChange(index, subField.key, e.target.value)} className="w-full px-2 py-1 rounded text-[10px]" style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text))' }} /></div>;
                })}
              </div>
            )}
          />
        </div>
      );
    }
    if (schema?.type === 'color') {
      return (
        <div key={key} className="py-1">
          <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'rgb(var(--color-text-secondary))' }}>{label}</label>
          <div className="flex gap-2">
            <input type="text" value={String(value ?? '')} onChange={(e) => handleChange(key, e.target.value)} className="flex-1 px-2 py-1.5 rounded text-xs" style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text))' }} />
            <input type="color" value={value?.startsWith('#') ? value : '#6b7280'} onChange={(e) => handleChange(key, e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
          </div>
        </div>
      );
    }
    return (
      <div key={key} className="py-1">
        <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'rgb(var(--color-text-secondary))' }}>{label}</label>
        <input type="text" value={String(value ?? '')} onChange={(e) => handleChange(key, e.target.value)} className="w-full px-2 py-1.5 rounded text-xs" style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text))' }} />
      </div>
    );
  }

  const editableKeys = allKeys.filter(key => !effectKeys.has(key));
  const populatedSettings = Object.entries(localSettings).filter(([, value]) => value !== '' && value !== null && value !== undefined);
  const reviewSummary = [
    { label: 'Type', value: componentDef?.label || block.type },
    { label: 'Children', value: String(block.children?.length || 0) },
    { label: 'Configured', value: `${populatedSettings.length} settings` },
    { label: 'Animation', value: localSettings.animation && localSettings.animation !== 'none' ? localSettings.animation : 'None' },
    { label: 'Hover', value: localSettings.hoverEffect && localSettings.hoverEffect !== 'none' ? localSettings.hoverEffect : 'None' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex items-center gap-2"><Settings className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-primary-600))' }} /><h3 className="text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Inspector</h3></div>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-gray-100"><X className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} /></button>
      </div>
      <div className="px-3 py-2 border-b shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex items-center gap-2"><span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-primary-100))', color: 'rgb(var(--color-primary-700))' }}>{block.type}</span><span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{block.id.slice(0, 12)}...</span></div>
      </div>
      <div className="grid grid-cols-3 gap-1 border-b p-2 shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
        {(['review', 'edit', 'effects'] as const).map((item) => (
          <button key={item} type="button" onClick={() => setPanel(item)} className="rounded-md px-2 py-1.5 text-[10px] font-semibold capitalize transition-colors" style={{ backgroundColor: panel === item ? 'rgb(var(--color-primary-100))' : 'transparent', color: panel === item ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text-muted))' }}>{item}</button>
        ))}
      </div>
      {panel === 'edit' && groups.length > 1 && (
        <div className="flex overflow-x-auto border-b shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
          {groups.map(g => (
            <button key={g} onClick={() => setActiveGroup(g)} className={`shrink-0 px-3 py-1.5 text-[10px] font-medium ${activeGroup === g ? 'border-b-2' : ''}`} style={{ borderBottomColor: activeGroup === g ? 'rgb(var(--color-primary-600))' : 'transparent', color: activeGroup === g ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))' }}>{g}</button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {panel === 'review' && (
          <div className="space-y-3">
            <div className="rounded-lg border p-3" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface-muted))' }}>
              <p className="text-[11px] font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Block Review</p>
              <div className="mt-2 space-y-1.5">{reviewSummary.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 text-[11px]"><span style={{ color: 'rgb(var(--color-text-muted))' }}>{row.label}</span><span className="truncate font-medium" style={{ color: 'rgb(var(--color-text))' }}>{row.value}</span></div>
              ))}</div>
            </div>
            <div className="rounded-lg border p-3" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <p className="text-[11px] font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Fast Edit</p>
              <div className="mt-2 space-y-0.5">{editableKeys.slice(0, 4).map(key => renderField(key))}</div>
            </div>
          </div>
        )}
        {panel === 'edit' && editableKeys.filter(key => { if (!activeGroup) return true; const s = schemas.find(s => s.key === key); return (s?.group || 'General') === activeGroup; }).map(key => renderField(key))}
        {panel === 'effects' && <div className="space-y-3">{COMMON_EFFECT_FIELDS.map(field => renderField(field.key, field))}</div>}
      </div>
      <div className="p-3 border-t shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <button onClick={handleSave} className="w-full py-1.5 rounded text-xs font-medium text-white transition-opacity hover:opacity-90" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>Apply Changes</button>
      </div>
    </div>
  );
}

function LayoutManager({ layouts, onSelect, onDelete, onDuplicate, onNew }: { layouts: any[]; onSelect: (id: string) => void; onDelete: (id: string) => void; onDuplicate: (id: string) => void; onNew: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>Page Layouts</h2>
        <button onClick={onNew} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>+ New Layout</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(layouts || []).map((layout: any) => (
          <div key={layout.id} className="rounded-xl p-4 transition-all hover:shadow-md cursor-pointer" style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }} onClick={() => navigate(`/admin/page-builder/${layout.id}`)}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2"><Layout className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} /><h3 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>{layout.title}</h3></div>
              <div className="flex items-center gap-1">
                {!layout.isActive && layout.isActive !== undefined && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)' }}>Inactive</span>}
                {layout.isPublished ? <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: 'rgb(var(--color-success))' }}>Live</span> : <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgb(var(--color-surface-muted))', color: 'rgb(var(--color-text-muted))' }}>Draft</span>}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}><span>{layout._count?.sections || 0} sections</span><span className="capitalize">{layout.pageType}</span></div>
            <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <button onClick={(e) => { e.stopPropagation(); onDuplicate(layout.id); }} className="text-xs px-2 py-1 rounded flex items-center gap-1" style={{ color: 'rgb(var(--color-text-secondary))' }}><Copy className="w-3 h-3" /> Duplicate</button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(layout.id); }} className="text-xs px-2 py-1 rounded flex items-center gap-1" style={{ color: 'rgb(var(--color-danger))' }}><Trash2 className="w-3 h-3" /> Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function normalizeColumnsInTree(blocks: LayoutBlock[]): LayoutBlock[] {
  return blocks.map((block) => {
    const next = { ...block, children: normalizeColumnsInTree(block.children || []) };
    return block.type === 'columns' ? syncColumnSlots(next) : next;
  });
}

export default function AdminPageBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirmAction = useConfirm();
  const [view, setView] = useState<'manager' | 'editor'>('manager');
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [newLayoutModal, setNewLayoutModal] = useState(false);
  const [newLayoutData, setNewLayoutData] = useState({ title: '', slug: '', description: '', pageType: 'custom' });
  const [layoutTitle, setLayoutTitle] = useState('');
  const [tree, setTree] = useState<LayoutBlock[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [history, setHistory] = useState<LayoutBlock[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [previewWidth, setPreviewWidth] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const { data: componentTypesData, isLoading: compLoading } = useComponentTypes();
  const { data: layoutsData, isLoading: layoutsLoading } = useLayouts();
  const { data: layoutTreeData, isLoading: treeLoading } = useLayoutTree(id || '');
  const layoutTreeSave = useSaveLayoutTree();

  const createLayout = useCreateLayout();
  const updateLayout = useUpdateLayout();
  const deleteLayout = useDeleteLayout();
  const duplicateLayout = useDuplicateLayout();
  const seedComponents = useSeedComponents();

  const componentTypes: ComponentDefinition[] = componentTypesData?.data || [];
  const layouts = layoutsData?.data || [];
  const currentLayoutJson: PageLayoutJson | null = layoutTreeData?.data || null;

  useEffect(() => {
    if (currentLayoutJson) {
      const normalizedTree = normalizeColumnsInTree(currentLayoutJson.tree || []);
      setTree(normalizedTree);
      setLayoutTitle(currentLayoutJson.title);
      setHistory([JSON.parse(JSON.stringify(normalizedTree))]);
      setHistoryIndex(0);
    }
  }, [currentLayoutJson]);

  useEffect(() => { setView(id ? 'editor' : 'manager'); }, [id]);

  useEffect(() => {
    const handler = () => { seedComponents.mutate(undefined); };
    window.addEventListener('seed-page-components', handler);
    return () => window.removeEventListener('seed-page-components', handler);
  }, []);

  const selectedBlock = useMemo(() => findBlockById(tree, selectedBlockId || ''), [tree, selectedBlockId]);
  const selectedComponentDef = useMemo(() => componentTypes.find(c => c.type === selectedBlock?.type), [componentTypes, selectedBlock]);

  const commitTree = useCallback((nextTree: LayoutBlock[]) => {
    const snapshot = JSON.parse(JSON.stringify(nextTree));
    setTree(snapshot);
    setHistory(prev => {
      const base = prev.slice(0, historyIndex + 1);
      const next = [...base, snapshot].slice(-50);
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setTree(JSON.parse(JSON.stringify(history[nextIndex])));
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setTree(JSON.parse(JSON.stringify(history[nextIndex])));
  }, [history, historyIndex]);

  // ── Internal reorder handler via window bridge ──
  useEffect(() => {
    const reorderHandler = (draggedId: string, targetId: string) => {
      const copy = JSON.parse(JSON.stringify(tree));
      const dragBlock = findBlockById(copy, draggedId);
      const targetBlock = findBlockById(copy, targetId);
      if (!dragBlock || !targetBlock) return;
      const removeFromList = (list: LayoutBlock[], id: string): LayoutBlock[] => {
        const idx = list.findIndex(b => b.id === id);
        if (idx >= 0) return list.filter(b => b.id !== id);
        return list.map(b => ({ ...b, children: removeFromList(b.children, id) }));
      };
      const insertBefore = (list: LayoutBlock[], targetId: string, block: LayoutBlock): LayoutBlock[] => {
        const idx = list.findIndex(b => b.id === targetId);
        if (idx >= 0) { list.splice(idx, 0, block); return list; }
        return list.map(b => ({ ...b, children: insertBefore(b.children, targetId, block) }));
      };
      const clean = JSON.parse(JSON.stringify(copy));
      const block = JSON.parse(JSON.stringify(dragBlock));
      const removed = removeFromList(clean, draggedId);
      const result = insertBefore(removed, targetId, block);
      commitTree(result);
    };
    (window as any).__onReorderBlock = reorderHandler;
    return () => { delete (window as any).__onReorderBlock; };
  }, [tree]);

  // ── Actions (must be before keyboard shortcut which references them) ──
  const handleNewLayout = () => {
    const slug = newLayoutData.slug || newLayoutData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    createLayout.mutate({ ...newLayoutData, slug, isSystem: false }, {
      onSuccess: (res: any) => {
        setNewLayoutModal(false);
        setNewLayoutData({ title: '', slug: '', description: '', pageType: 'custom' });
        if (res?.data?.id) navigate(`/admin/page-builder/${res.data.id}`);
      },
    });
  };

  const handleActiveToggle = () => {
    if (currentLayoutJson) updateLayout.mutate({ id: currentLayoutJson.id, data: { isActive: !currentLayoutJson.isActive } });
  };

  const handlePublishToggle = () => {
    if (currentLayoutJson) updateLayout.mutate({ id: currentLayoutJson.id, data: { isPublished: !currentLayoutJson.isPublished } });
  };

  const handleSaveAll = () => {
    if (currentLayoutJson) layoutTreeSave.mutate({ id: currentLayoutJson.id, tree });
  };

  const handleAddBlock = (type: string) => {
    const def = componentTypes.find(c => c.type === type);
    const newBlock = createDefaultBlock(type, def?.defaultProps);
    commitTree([...tree, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const handleAddBlockToColumn = (columnId: string, type: string) => {
    const def = componentTypes.find(c => c.type === type);
    const newBlock = createDefaultBlock(type, def?.defaultProps);
    const copy = JSON.parse(JSON.stringify(tree));
    const column = findBlockById(copy, columnId);
    if (column) column.children.push(newBlock);
    commitTree(copy);
    setSelectedBlockId(newBlock.id);
  };

  const handleDropBlock = (type: string, index: number) => {
    const def = componentTypes.find(c => c.type === type);
    const newBlock = createDefaultBlock(type, def?.defaultProps);
    const copy = [...tree];
    copy.splice(index, 0, newBlock);
    commitTree(copy);
    setSelectedBlockId(newBlock.id);
  };

  // Single handleUpdateSettings - no duplicates! Uses ref to avoid stale closures in debounce
  const settingsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleUpdateSettings = useCallback((blockId: string, settings: Record<string, any>) => {
    // Update tree directly without history push to avoid lag on every keystroke
    setTree(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const block = findBlockById(copy, blockId);
      if (block) {
        block.settings = settings;
        if (block.type === 'columns') Object.assign(block, syncColumnSlots(block));
      }
      return copy;
    });
    // Debounced history snapshot (only after 2s of inactivity)
    if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current);
    settingsTimerRef.current = setTimeout(() => {
      setTree(prev => {
        setHistory(h => {
          const base = h.slice(0, historyIndex + 1);
          const next = [...base, JSON.parse(JSON.stringify(prev))].slice(-50);
          setHistoryIndex(next.length - 1);
          return next;
        });
        return prev;
      });
    }, 2000);
  }, [historyIndex]);

  const handleDeleteBlock = async (blockId: string) => {
    const confirmed = await confirmAction({
      title: 'Delete block?',
      message: 'This removes the block from the current page layout.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    commitTree(removeBlockById(JSON.parse(JSON.stringify(tree)), blockId));
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  };

  const handleDeleteLayout = async (layoutId: string) => {
    const confirmed = await confirmAction({
      title: 'Delete layout?',
      message: 'This removes the page layout and its sections.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (confirmed) deleteLayout.mutate(layoutId);
  };

  const handleDuplicateBlock = (blockId: string) => {
    commitTree(duplicateBlockInTree(JSON.parse(JSON.stringify(tree)), blockId));
  };

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    commitTree(moveBlockInTree(JSON.parse(JSON.stringify(tree)), blockId, direction));
  };

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === 'z' && event.shiftKey) { event.preventDefault(); handleRedo(); }
      else if (meta && event.key.toLowerCase() === 'z') { event.preventDefault(); handleUndo(); }
      else if (meta && event.key.toLowerCase() === 'd' && selectedBlockId) { event.preventDefault(); handleDuplicateBlock(selectedBlockId); }
      else if (event.key === 'Delete' || event.key === 'Backspace') {
        const target = event.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable && selectedBlockId) { event.preventDefault(); handleDeleteBlock(selectedBlockId); }
      } else if (event.key === 'Escape') { setSelectedBlockId(null); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRedo, handleUndo, selectedBlockId, handleDuplicateBlock, handleDeleteBlock]);

  // ── Auto-save with dirty flag tracking (avoids infinite loops) ──
  const isDirtyRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Mark as dirty whenever tree changes from user interaction (not from auto-save response)
  useEffect(() => {
    if (view !== 'editor' || historyIndex < 0 || !currentLayoutJson) return;
    isDirtyRef.current = true;
  }, [tree, view, historyIndex, currentLayoutJson]);

  // Separate auto-save effect that runs on a fixed interval when dirty
  useEffect(() => {
    if (!currentLayoutJson || view !== 'editor') return;
    
    const doAutoSave = () => {
      if (isDirtyRef.current && !layoutTreeSave.isPending) {
        isDirtyRef.current = false;
        setSaveStatus('saving');
        layoutTreeSave.mutate(
          { id: currentLayoutJson.id, tree, silent: true },
          { onSuccess: () => setSaveStatus('saved') }
        );
      }
    };
    
    // Check every 15 seconds if there are unsaved changes
    autoSaveTimerRef.current = setInterval(doAutoSave, 15000);
    
    // Also save on unmount/page leave
    const handleBeforeUnload = () => {
      if (isDirtyRef.current) doAutoSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentLayoutJson?.id, view]); // only re-create when layout changes

  if (view === 'manager') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
        <LayoutManager layouts={layouts} onSelect={(id) => navigate(`/admin/page-builder/${id}`)} onDelete={(id) => void handleDeleteLayout(id)} onDuplicate={(id) => duplicateLayout.mutate(id)} onNew={() => setNewLayoutModal(true)} />
        {newLayoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setNewLayoutModal(false)}>
            <div className="rounded-xl p-6 w-full max-w-md shadow-xl" style={{ backgroundColor: 'rgb(var(--color-surface))' }} onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>Create New Layout</h2>
              <div className="space-y-3">
                <div><label className="block text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>Title</label>
                  <input type="text" value={newLayoutData.title} onChange={(e) => setNewLayoutData({ ...newLayoutData, title: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg))', color: 'rgb(var(--color-text))' }} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>Slug</label>
                  <input type="text" value={newLayoutData.slug} onChange={(e) => setNewLayoutData({ ...newLayoutData, slug: e.target.value })} placeholder="Auto-generated from title" className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg))', color: 'rgb(var(--color-text))' }} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>Description</label>
                  <textarea rows={2} value={newLayoutData.description} onChange={(e) => setNewLayoutData({ ...newLayoutData, description: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg))', color: 'rgb(var(--color-text))' }} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>Page Type</label>
                  <select value={newLayoutData.pageType} onChange={(e) => setNewLayoutData({ ...newLayoutData, pageType: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg))', color: 'rgb(var(--color-text))' }}>
                    <option value="custom">Custom</option><option value="home">Home</option><option value="product_list">Product List</option><option value="product_detail">Product Detail</option><option value="landing">Landing</option></select></div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={() => setNewLayoutModal(false)} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid rgb(var(--color-border))', color: 'rgb(var(--color-text-secondary))' }}>Cancel</button>
                <button onClick={handleNewLayout} disabled={!newLayoutData.title} className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>Create</button>
              </div>
            </div>
          </div>
        )}
        {componentTypes.length === 0 && !compLoading && (
          <div className="fixed bottom-4 right-4">
            <button onClick={() => seedComponents.mutate()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white shadow-lg" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}><RefreshCw className="w-4 h-4" /> Seed Components</button>
          </div>
        )}
      </div>
    );
  }

  if (!currentLayoutJson) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
        <div className="text-center"><AlertCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Layout not found</p>
          <button onClick={() => navigate('/admin/page-builder')} className="mt-2 text-sm font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>Back to layouts</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/page-builder')} className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>← Layouts</button>
          <div className="w-px h-5" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
          <input type="text" value={layoutTitle} onChange={(e) => setLayoutTitle(e.target.value)} className="text-sm font-semibold bg-transparent border-none outline-none rounded" style={{ color: 'rgb(var(--color-text))' }} />
          {currentLayoutJson.isSystem && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgb(var(--color-warning-100))', color: 'rgb(var(--color-warning-700))' }}>System</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreviewMode(!previewMode)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: previewMode ? 'rgb(var(--color-primary-600))' : 'transparent', color: previewMode ? 'white' : 'rgb(var(--color-text-muted))', border: previewMode ? 'none' : '1px solid rgb(var(--color-border))' }}>
            {previewMode ? <Eye className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}{previewMode ? 'Exit Preview' : 'Preview'}
          </button>
          <button onClick={() => { if (currentLayoutJson) layoutTreeSave.mutate({ id: currentLayoutJson.id, tree }, { onSuccess: () => window.open(`/page/${currentLayoutJson.slug}`, '_blank') }); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid rgb(var(--color-border))', color: 'rgb(var(--color-text-secondary))' }}><ExternalLink className="w-3.5 h-3.5" /> View Live</button>
          <div className="w-px h-5" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
          <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-1.5 rounded-lg disabled:opacity-40" style={{ border: '1px solid rgb(var(--color-border))', color: 'rgb(var(--color-text-muted))' }}><Undo className="w-3.5 h-3.5" /></button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded-lg disabled:opacity-40" style={{ border: '1px solid rgb(var(--color-border))', color: 'rgb(var(--color-text-muted))' }}><Redo className="w-3.5 h-3.5" /></button>
          <div className="flex rounded-lg border" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <button onClick={() => setPreviewWidth('mobile')} className="p-1.5"><Smartphone className="w-3.5 h-3.5" /></button>
            <button onClick={() => setPreviewWidth('tablet')} className="p-1.5"><Tablet className="w-3.5 h-3.5" /></button>
            <button onClick={() => setPreviewWidth('desktop')} className="p-1.5"><Monitor className="w-3.5 h-3.5" /></button>
          </div>
          <span className="text-[11px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'All saved' : 'Ready'}</span>
          {!previewMode && (
            <>
              <button onClick={() => setShowLeftSidebar(!showLeftSidebar)} className="p-1.5 rounded-lg text-xs" style={{ color: showLeftSidebar ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))', backgroundColor: showLeftSidebar ? 'rgb(var(--color-primary-50))' : 'transparent' }}><PanelLeft className="w-4 h-4" /></button>
              <button onClick={() => setShowInspector(!showInspector)} className="p-1.5 rounded-lg text-xs" style={{ color: showInspector ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))', backgroundColor: showInspector ? 'rgb(var(--color-primary-50))' : 'transparent' }}><PanelRight className="w-4 h-4" /></button>
              <div className="w-px h-5" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
            </>
          )}
          <button onClick={handleSaveAll} disabled={layoutTreeSave.isPending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}><Save className="w-3.5 h-3.5" /> {layoutTreeSave.isPending ? 'Saving...' : 'Save'}</button>
          <button onClick={handleActiveToggle} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: currentLayoutJson.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: currentLayoutJson.isActive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)', border: `1px solid ${currentLayoutJson.isActive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}` }}>
            {currentLayoutJson.isActive ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}{currentLayoutJson.isActive ? 'Active' : 'Inactive'}
          </button>
          <button onClick={handlePublishToggle} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: currentLayoutJson.isPublished ? 'rgb(var(--color-warning-500))' : 'rgb(var(--color-success))' }}>
            {currentLayoutJson.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}{currentLayoutJson.isPublished ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {previewMode ? (
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'rgb(var(--color-bg))' }}><div className="max-w-7xl mx-auto"><FullPagePreview tree={tree} /></div></div>
        ) : (
          <>
            {showLeftSidebar && (
              <div className="w-64 shrink-0" style={{ borderRight: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
                <LeftSidebar componentTypes={componentTypes} tree={tree} selectedBlockId={selectedBlockId} onAddBlock={handleAddBlock} onSelectBlock={setSelectedBlockId} onDeleteBlock={handleDeleteBlock} onClose={() => setShowLeftSidebar(false)} />
              </div>
            )}
            <div className="flex flex-1 justify-center overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
              <div className="flex min-h-0 transition-all" style={{ width: previewWidth === 'mobile' ? 375 : previewWidth === 'tablet' ? 768 : '100%', maxWidth: '100%' }}>
                <EditorCanvas tree={tree} componentTypes={componentTypes} selectedBlockId={selectedBlockId} onSelectBlock={setSelectedBlockId} onDeleteBlock={handleDeleteBlock} onDuplicateBlock={handleDuplicateBlock} onMoveBlock={handleMoveBlock} onDropBlock={handleDropBlock} onAddBlockToColumn={handleAddBlockToColumn} />
              </div>
            </div>
            {showInspector && (
              <div className="w-72 shrink-0" style={{ borderLeft: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
                {selectedBlock && selectedBlock.type !== 'column' ? (
                  <InspectorPanel block={selectedBlock} componentDef={selectedComponentDef} onUpdateSettings={handleUpdateSettings} onClose={() => setShowInspector(false)} />
                ) : (
                  <div className="flex items-center justify-center h-full p-4">
                    <div className="text-center"><BoxSelect className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgb(var(--color-text-disabled))' }} />
                      <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{selectedBlock?.type === 'column' ? 'Columns are containers. Drop blocks into them or select a block to edit.' : 'Select a block to edit'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-1 shrink-0" style={{ borderTop: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          <span>{previewMode ? 'Preview Mode' : `${tree.length} blocks`}</span>
          <div className="w-px h-3" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
          <span style={{ color: currentLayoutJson.isActive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)' }}>{currentLayoutJson.isActive ? 'Active' : 'Inactive'}</span>
          <div className="w-px h-3" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
          <span>{currentLayoutJson.isPublished ? 'Published' : 'Draft'}</span>
          <div className="w-px h-3" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
          <span>{layoutTreeSave.isPending ? 'Unsaved changes' : 'All saved'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          <span>/{currentLayoutJson.slug}</span>
          {currentLayoutJson.slug && (
            <a href={`/page/${currentLayoutJson.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline" style={{ color: 'rgb(var(--color-primary-600))' }}><ExternalLink className="w-3 h-3" /> View page</a>
          )}
        </div>
      </div>
    </div>
  );
}
