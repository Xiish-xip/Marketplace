import React from 'react';
import { usePublishedLayoutTree, useActiveHeaderFooter } from '../../lib/page-builder-hooks';
import { LayoutBlock, PageLayoutJson } from '../../lib/page-builder-types';
import { Search, Shield, Layout, ShoppingBag, Store } from 'lucide-react';
import { SkeletonPage } from '../../components/Skeleton';
import { Link } from 'react-router-dom';
import { useCategoryTree, useFeaturedProducts, useProducts } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';
import AnimatedProductCard from '../../components/AnimatedProductCard';

// ── Block Renderer Components ──

function getEffectClass(settings: Record<string, any> = {}) {
  const classes: string[] = [];
  if (settings.animation && settings.animation !== 'none') classes.push(`pb-animate-${settings.animation}`);
  if (settings.hoverEffect && settings.hoverEffect !== 'none') classes.push(`pb-hover-${settings.hoverEffect}`);
  if (settings.shadow && settings.shadow !== 'none') classes.push(`pb-shadow-${settings.shadow}`);
  return classes.join(' ');
}

function getBlockStyle(settings: Record<string, any> = {}): React.CSSProperties {
  return {
    backgroundColor: settings.backgroundColor || undefined,
    color: settings.textColor || undefined,
    borderRadius: settings.borderRadius || undefined,
    paddingTop: settings.paddingTop || undefined,
    paddingBottom: settings.paddingBottom || undefined,
    '--pb-animation-duration': `${Number(settings.animationDuration || 500)}ms`,
    '--pb-animation-delay': `${Number(settings.animationDelay || 0)}ms`,
  } as React.CSSProperties;
}

function BlockFrame({ block, children }: { block: LayoutBlock; children: React.ReactNode }) {
  if (block.type === 'column') return <>{children}</>;
  const className = getEffectClass(block.settings);
  const style = getBlockStyle(block.settings);
  return <div className={className || undefined} style={style}>{children}</div>;
}

function HeroBlock({ block }: { block: LayoutBlock }) {
  const s = block.settings;
  return (
    <section className="relative overflow-hidden" style={{
      minHeight: s.height === 'large' ? '480px' : s.height === 'medium' ? '360px' : '280px',
      backgroundColor: 'var(--color-primary)',
    }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-6 text-center">
        {s.eyebrow && <span className="text-sm md:text-base uppercase tracking-widest mb-3 opacity-80">{s.eyebrow}</span>}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 max-w-3xl">{s.title}</h1>
        {s.subtitle && <p className="text-base md:text-lg opacity-90 mb-6 max-w-xl">{s.subtitle}</p>}
        {s.searchPlaceholder && (
          <div className="w-full max-w-lg relative">
            <input type="text" placeholder={s.searchPlaceholder}
              className="w-full px-5 py-3 rounded-full text-sm text-gray-900 bg-white/95 backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/50" />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>
    </section>
  );
}

function ProductGridBlock({ block }: { block: LayoutBlock }) {
  const s = block.settings;
  const itemLimit = Number(s.limit) || (Number(s.columns || 4) * Number(s.rows || 1));
  const { data: featuredData } = useFeaturedProducts();
  const { data: productData } = useProducts({
    limit: itemLimit,
    categoryId: s.source === 'category' ? s.categoryId : undefined,
    sortBy: block.type === 'deal_rail' ? 'discountPrice' : 'totalSales',
    sortOrder: 'desc',
  });
  const sourceProducts = s.source === 'featured' ? (featuredData?.data || []) : (productData?.data || []);
  const products = block.type === 'deal_rail'
    ? sourceProducts.filter((product: any) => product.discountPrice)
    : sourceProducts;
  const display = products.slice(0, itemLimit);

  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{s.title || 'Featured Products'}</h2>
          {s.showViewAll && (
            <Link to="/products" className="text-sm font-medium flex items-center gap-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
              View All <span className="text-lg">→</span>
            </Link>
          )}
        </div>
        <div
          className="pb-product-grid"
          style={{
            gap: s.gap || '1rem',
            '--pb-grid-desktop': String(Math.min(Number(s.columns || 4), 6)),
            '--pb-grid-tablet': String(Math.min(Number(s.tabletColumns || s.columns || 3), 4)),
            '--pb-grid-mobile': String(Math.min(Number(s.mobileColumns || 2), 2)),
          } as React.CSSProperties}
        >
          {display.length === 0 && (
            <div className="col-span-full text-center py-8" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <ShoppingBag className="w-8 h-8 mx-auto mb-3" />
              <p>No products to display</p>
            </div>
          )}
          {display.map((product: any) => (
            <AnimatedProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryRailBlock({ block }: { block: LayoutBlock }) {
  const s = block.settings;
  const { data: catData } = useCategoryTree();
  const categories = catData?.data || catData || [];
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-bold mb-6" style={{ color: 'rgb(var(--color-text))' }}>{s.title || 'Shop by Category'}</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(100px, 1fr))` }}>
          {categories.slice(0, s.limit || 8).map((cat: any) => (
            <Link key={cat.id} to={`/products?category=${cat.slug}`}
              className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:shadow-md"
              style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
              {cat.image ? (
                <img src={cat.image} alt={cat.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-primary-50))' }}>
                  <Layout className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} />
                </div>
              )}
              <span className="text-xs font-medium text-center" style={{ color: 'rgb(var(--color-text))' }}>{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function TextBlockSection({ block }: { block: LayoutBlock }) {
  const s = block.settings;
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="prose max-w-none" style={{ color: 'rgb(var(--color-text))', textAlign: s.alignment || 'left' }}
          dangerouslySetInnerHTML={{ __html: s.content || '' }} />
      </div>
    </section>
  );
}

function TrustCardsBlock({ block }: { block: LayoutBlock }) {
  const cards = block.settings.cards || [];
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid gap-4 md:grid-cols-4">
          {cards.slice(0, 4).map((card: any, i: number) => (
            <div key={i} className="text-center p-5 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-primary-100))' }}>
                <Shield className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-600))' }} />
              </div>
              <h3 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>{card.title}</h3>
              <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterBlock({ block }: { block: LayoutBlock }) {
  const s = block.settings;
  return (
    <section className="py-12 md:py-16 px-4 text-center" style={{ backgroundColor: s.backgroundColor || 'rgb(var(--color-surface-muted))' }}>
      <div className="max-w-xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>{s.title}</h2>
        <p className="text-sm mb-6" style={{ color: 'rgb(var(--color-text-muted))' }}>{s.subtitle}</p>
        <form className="flex gap-2 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
          <input type="email" placeholder={s.placeholder || 'Your email'}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm"
            style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }} />
          <button type="submit" className="px-6 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>
            {s.buttonText || 'Subscribe'}
          </button>
        </form>
      </div>
    </section>
  );
}

function DividerBlock() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <hr style={{ borderColor: 'rgb(var(--color-border))' }} />
    </div>
  );
}

function SpacerBlock({ block }: { block: LayoutBlock }) {
  return <div style={{ height: block.settings.height || '2rem' }} />;
}

function ContainerBlock({ block, children }: { block: LayoutBlock; children: React.ReactNode }) {
  const s = block.settings;
  return (
    <div className="mx-auto" style={{
      maxWidth: s.maxWidth || '1280px',
      paddingLeft: s.paddingX || '1rem',
      paddingRight: s.paddingX || '1rem',
      paddingTop: s.paddingY || '0',
      paddingBottom: s.paddingY || '0',
    }}>
      {children}
    </div>
  );
}

function ColumnsBlock({ block }: { block: LayoutBlock }) {
  const s = block.settings;
  const count = Number(s.columnCount) || Math.max(block.children.length, 1);
  return (
    <div className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div
          className="pb-columns-grid"
          style={{
            gap: s.gap || '1.5rem',
            alignItems: s.verticalAlign || 'stretch',
            minHeight: s.minHeight || undefined,
            padding: s.padding || undefined,
            '--pb-columns-desktop': String(Number(s.desktopColumns) || count),
            '--pb-columns-tablet': String(Number(s.tabletColumns) || Math.min(count, 2)),
            '--pb-columns-mobile': String(Number(s.mobileColumns) || 1),
          } as React.CSSProperties}
        >
          {Array.from({ length: count }).map((_, i) => (
            <div key={i}>
              {block.children[i]?.type === 'column' ? (
                <RenderBlockChildren blocks={block.children[i].children} />
              ) : block.children[i] ? (
                <RenderBlock block={block.children[i]} />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PromoBannerBlock({ block }: { block: LayoutBlock }) {
  const banners = block.settings.banners || [];
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(banners.length || 2, 3)}, 1fr)` }}>
          {banners.slice(0, 3).map((b: any, i: number) => (
            <Link key={i} to={b.href || '#'} className="rounded-xl p-6 text-white text-center min-h-[160px] flex flex-col items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary)' }}>
              <h3 className="text-lg font-bold">{b.title}</h3>
              <p className="text-sm mt-1 opacity-80">{b.text}</p>
              {b.buttonText && <span className="mt-3 text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-full">{b.buttonText}</span>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function BannerBlock({ block }: { block: LayoutBlock }) {
  const s = block.settings;
  if (s.layout === 'image_background') {
    return (
      <section className="relative overflow-hidden py-16 px-6 text-center text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
        {s.imageUrl && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${s.imageUrl})` }} />}
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">{s.title}</h2>
          <p className="mb-4 opacity-90">{s.text}</p>
          <Link to={s.href || '#'} className="inline-block bg-white text-gray-900 px-6 py-2.5 rounded-full text-sm font-semibold">{s.buttonText || 'Shop Now'}</Link>
        </div>
      </section>
    );
  }
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between rounded-xl p-6 md:p-8 text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">{s.title}</h2>
            <p className="mt-1 opacity-90">{s.text}</p>
          </div>
          <Link to={s.href || '#'} className="shrink-0 bg-white text-gray-900 px-5 py-2.5 rounded-full text-sm font-semibold">{s.buttonText || 'Shop Now'}</Link>
        </div>
      </div>
    </section>
  );
}

function CtaCardsBlock({ block }: { block: LayoutBlock }) {
  const cards = block.settings.cards || [];
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid gap-4 md:grid-cols-2">
          {cards.slice(0, 2).map((card: any, i: number) => (
            <Link key={i} to={card.href || '#'} className="rounded-xl p-6 flex flex-col items-center text-center"
              style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
              <h3 className="font-bold text-lg" style={{ color: 'rgb(var(--color-text))' }}>{card.title}</h3>
              <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>{card.text}</p>
              <span className="mt-3 text-xs font-semibold px-4 py-1.5 rounded-full text-white" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>{card.buttonText}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ImageBlock({ block }: { block: LayoutBlock }) {
  const s = block.settings;
  const content = (
    <figure className={`${s.borderRadius || 'rounded-lg'} overflow-hidden`}>
      {s.src ? (
        <img src={s.src} alt={s.alt || ''} className="w-full h-auto" />
      ) : (
        <div className="w-full h-48 flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-surface-muted))', color: 'rgb(var(--color-text-disabled))' }}>
          <ShoppingBag className="w-8 h-8" />
        </div>
      )}
      {s.caption && <figcaption className="text-xs mt-1 text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>{s.caption}</figcaption>}
    </figure>
  );
  if (s.link) return <a href={s.link}>{content}</a>;
  return content;
}

function SellerStripBlock({ block }: { block: LayoutBlock }) {
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-bold mb-6" style={{ color: 'rgb(var(--color-text))' }}>{block.settings.title || 'Trusted Sellers'}</h2>
        <div className="text-center py-8" style={{ color: 'rgb(var(--color-text-muted))' }}>
          <Store className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Seller strip loaded dynamically</p>
        </div>
      </div>
    </section>
  );
}

function GenericContentBlock({ block }: { block: LayoutBlock }) {
  const s = block.settings || {};
  const title = s.title || s.text || block.type.replace(/_/g, ' ');
  const image = s.imageUrl || s.backgroundImage || s.src || s.poster || s.cover;
  const items = s.items || s.cards || s.stats || s.members || s.testimonials || s.plans || s.logos || s.images || s.tabs || [];

  if (['grid', 'flex_row', 'section', 'tabs_container', 'accordion_container', 'sticky_sidebar'].includes(block.type)) {
    return (
      <section className="py-8 md:py-12" style={{ backgroundColor: s.backgroundColor || undefined }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className={block.type === 'flex_row' ? 'flex flex-wrap' : 'grid'} style={{ gap: s.gap || '1rem', gridTemplateColumns: `repeat(${s.columns || 3}, minmax(0, 1fr))` }}>
            <RenderBlockChildren blocks={block.children} />
          </div>
        </div>
      </section>
    );
  }

  if (block.type === 'announcement_bar') {
    return <div className="px-4 py-2 text-center text-sm" style={{ backgroundColor: s.backgroundColor || '#000', color: s.textColor || '#fff' }}>{s.text}</div>;
  }

  if (block.type === 'video_player' || block.type === 'video_block') {
    return <section className="py-8 md:py-12"><div className="max-w-5xl mx-auto px-4"><video src={assetUrl(s.videoUrl || s.url)} poster={assetUrl(s.poster)} controls={s.controls !== false} autoPlay={!!s.autoplay} loop={!!s.loop} className="w-full rounded-lg bg-black" /></div></section>;
  }

  if (block.type === 'audio_player') {
    return <section className="py-8"><div className="max-w-3xl mx-auto px-4"><h2 className="mb-3 text-xl font-semibold">{title}</h2><audio src={assetUrl(s.audioUrl)} controls className="w-full" /></div></section>;
  }

  if (block.type === 'progress_bar') {
    const percent = Math.max(0, Math.min(100, ((Number(s.value) || 0) / (Number(s.max) || 100)) * 100));
    return <section className="py-8"><div className="max-w-3xl mx-auto px-4"><div className="mb-2 text-sm font-medium">{s.label}</div><div className="h-3 rounded-full bg-gray-200"><div className="h-3 rounded-full bg-gray-900" style={{ width: `${percent}%` }} /></div></div></section>;
  }

  if (block.type === 'code_block') {
    return <section className="py-8"><div className="max-w-5xl mx-auto px-4"><pre className="overflow-auto rounded-lg bg-gray-950 p-4 text-sm text-white"><code>{s.code}</code></pre></div></section>;
  }

  return (
    <section className="py-8 md:py-12" style={{ backgroundImage: image && block.type === 'parallax_banner' ? `url(${assetUrl(image)})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="max-w-7xl mx-auto px-4">
        {title && <h2 className="mb-4 text-xl font-bold capitalize" style={{ color: 'rgb(var(--color-text))' }}>{title}</h2>}
        {image && block.type !== 'parallax_banner' && <img src={assetUrl(image)} alt={s.alt || title} className="mb-4 max-h-96 w-full rounded-lg object-cover" />}
        {s.description && <p className="mb-4 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{s.description}</p>}
        {Array.isArray(items) && items.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            {items.slice(0, 12).map((item: any, index: number) => (
              <article key={index} className="rounded-lg border p-4" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
                {(item.image || item.url || item.logo || item.avatar) && <img src={assetUrl(item.image || item.url || item.logo || item.avatar)} alt={item.alt || item.title || item.name || ''} className="mb-3 h-24 w-full rounded object-cover" />}
                <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{item.title || item.name || item.label || item.question}</h3>
                <p className="mt-1 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{item.text || item.description || item.answer || item.content || item.role}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Main Block Router ──
function RenderBlock({ block }: { block: LayoutBlock }) {
  let content: React.ReactNode;
  switch (block.type) {
    case 'hero': content = <HeroBlock block={block} />; break;
    case 'product_grid':
    case 'featured_products':
    case 'deal_rail':
    case 'product_carousel':
      content = <ProductGridBlock block={{ ...block, settings: { ...block.settings, title: block.settings.title } }} />;
      break;
    case 'category_rail':
    case 'category_scroller':
      content = <CategoryRailBlock block={block} />;
      break;
    case 'text_block':
      content = <TextBlockSection block={block} />;
      break;
    case 'image_block':
      content = <ImageBlock block={block} />;
      break;
    case 'divider': content = <DividerBlock />; break;
    case 'spacer': content = <SpacerBlock block={block} />; break;
    case 'trust_cards': content = <TrustCardsBlock block={block} />; break;
    case 'newsletter': content = <NewsletterBlock block={block} />; break;
    case 'banner': content = <BannerBlock block={block} />; break;
    case 'promo_banners': content = <PromoBannerBlock block={block} />; break;
    case 'cta_cards': content = <CtaCardsBlock block={block} />; break;
    case 'seller_strip': content = <SellerStripBlock block={block} />; break;
    case 'columns':
      content = <ColumnsBlock block={block} />;
      break;
    case 'container':
      content = <ContainerBlock block={block}><RenderBlockChildren blocks={block.children} /></ContainerBlock>;
      break;
    case 'column':
      content = <RenderBlockChildren blocks={block.children} />;
      break;
    default:
      content = <GenericContentBlock block={block} />;
  }
  return <BlockFrame block={block}>{content}</BlockFrame>;
}

function RenderBlockChildren({ blocks }: { blocks: LayoutBlock[] }) {
  return (
    <>
      {blocks.map((child) => (
        <RenderBlock key={child.id} block={child} />
      ))}
    </>
  );
}

// ── Template Renderer (for header/footer) ──
function TemplateRenderer({ layout }: { layout: PageLayoutJson | null }) {
  if (!layout || !layout.tree || layout.tree.length === 0) return null;
  return (
    <>
      {layout.tree.map((block) => (
        <RenderBlock key={block.id} block={block} />
      ))}
    </>
  );
}

// ── Main Dynamic JSON Page Renderer ──
function DynamicPageJsonRenderer({ slug, fallback, showHeaderFooter = true }: {
  slug: string;
  fallback?: React.ReactNode;
  showHeaderFooter?: boolean;
}) {
  const { data, isLoading, error } = usePublishedLayoutTree(slug);
  const { data: hfData } = showHeaderFooter ? useActiveHeaderFooter() : { data: null };
  
  const layout: PageLayoutJson | null = data?.data || null;
  const { header: activeHeader, footer: activeFooter } = hfData || { header: null, footer: null };

  if (isLoading) return <SkeletonPage cards={6} columns={3} />;
  if (!layout || error) return <>{fallback || null}</>;

  return (
    <>
      {/* Active Header from template */}
      {showHeaderFooter && activeHeader && (
        <header className="pb-header">
          <TemplateRenderer layout={activeHeader} />
        </header>
      )}
      {/* Page Content */}
      {layout.tree.map((block) => (
        <RenderBlock key={block.id} block={block} />
      ))}
      {/* Active Footer from template */}
      {showHeaderFooter && activeFooter && (
        <footer className="pb-footer">
          <TemplateRenderer layout={activeFooter} />
        </footer>
      )}
    </>
  );
}

export default DynamicPageJsonRenderer;
export { RenderBlock, RenderBlockChildren, TemplateRenderer };