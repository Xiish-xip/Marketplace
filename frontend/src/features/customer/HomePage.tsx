import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Sparkles, ArrowRight, ChevronLeft, ChevronRight, Truck, Shield, Clock,
  Star, Package, TrendingUp, Zap, Globe, Award, BadgeCheck, Store, Gift,
  Grid3X3, List, LayoutGrid, Percent, Heart,
  ShoppingCart, Flame, Gem, Leaf, Cpu,
  Smartphone, Home, Watch, Headphones, Camera, Monitor, Car, Bike,
  BookOpen, Dumbbell, Music, PawPrint, Gamepad2, Shirt, Wifi,
  ThumbsUp, X, RotateCcw, Eye
} from 'lucide-react';
import { useCategoryTree, useFeaturedProducts, useProducts, usePublicConfig } from '../../lib/query-hooks';
import { usePublishedLayoutTree } from '../../lib/page-builder-hooks';
import RecentlyViewed from '../shared/RecentlyViewed';
import AnimatedProductCard from '../../components/AnimatedProductCard';
import { SkeletonPage } from '../../components/Skeleton';
import DynamicPageJsonRenderer from '../page-builder/DynamicPageJsonRenderer';
import { assetUrl } from '../../lib/assets';
import { useCurrency } from '../../lib/currency-context';
import { motion } from 'framer-motion';

type ViewMode = 'grid' | 'list' | 'compact';

const catIcon: Record<string, React.ElementType> = {
  'Electronics': Smartphone, 'Phones': Smartphone, 'Laptops': Monitor, 'Computers': Monitor,
  'Fashion': Shirt, 'Clothing': Shirt, 'Home': Home, 'Kitchen': Home,
  'Sports': Dumbbell, 'Fitness': Dumbbell, 'Books': BookOpen, 'Music': Music,
  'Gaming': Gamepad2, 'Toys': Gamepad2, 'Pets': PawPrint, 'Automotive': Car,
  'Cars': Car, 'Watches': Watch, 'Cameras': Camera, 'Headphones': Headphones,
  'Audio': Headphones, 'Beauty': Gem,
};

const gradients = [
  'from-violet-500 to-purple-600', 'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600', 'from-cyan-500 to-blue-600', 'from-fuchsia-500 to-pink-600',
  'from-lime-500 to-green-600', 'from-indigo-500 to-violet-600', 'from-red-500 to-rose-600',
];

// ─── Horizontal Scroll (RecentlyViewed-style, with arrow toggles) ───
function HorizontalScroll({ title, link, icon: Icon, children }: {
  title: string; link?: string; icon?: React.ElementType; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(true);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setLeft(el.scrollLeft > 10);
    setRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', check, { passive: true });
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', check); ro.disconnect(); };
  }, [check]);

  const scroll = (d: number) => ref.current?.scrollBy({ left: d * 360, behavior: 'smooth' });

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
          {Icon && <Icon className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />}
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {(left || right) && (
            <div className="flex gap-1">
              <button onClick={() => scroll(-1)}
                className={`p-1.5 rounded-lg border transition-all ${left ? 'hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm' : 'opacity-20 cursor-default'}`}
                style={{ borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-secondary))' }}
                disabled={!left} aria-label="Scroll left">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => scroll(1)}
                className={`p-1.5 rounded-lg border transition-all ${right ? 'hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm' : 'opacity-20 cursor-default'}`}
                style={{ borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-secondary))' }}
                disabled={!right} aria-label="Scroll right">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          {link && (
            <Link to={link} className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: 'rgb(var(--color-primary-600))' }}>
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
      <div ref={ref} className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {children}
      </div>
    </section>
  );
}

// ─── ProductGrid ───
function ProductGrid({ products, viewMode, title, link }: {
  products: any[]; viewMode: ViewMode; title?: string; link?: string;
}) {
  if (!products.length) return null;
  const cols = viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' :
    viewMode === 'compact' ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8' : 'grid-cols-1 sm:grid-cols-2';
  const limit = 8;
  return (
    <section>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text))' }}>{title}</h2>
          {link && <Link to={link} className="text-sm font-medium flex items-center gap-1 hover:underline" style={{ color: 'rgb(var(--color-primary-600))' }}>View all <ArrowRight className="w-3.5 h-3.5" /></Link>}
        </div>
      )}
      <div className={`grid ${cols} gap-3`}>
        {products.slice(0, limit).map((p: any) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.3 }}>
            <AnimatedProductCard product={p} variant={viewMode === 'compact' ? 'compact' : 'default'} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── CategoryCard ───
function CategoryCard({ cat, idx }: { cat: any; idx: number }) {
  const Icon = catIcon[cat.name] || Store;
  return (
    <Link to={`/products?categoryId=${cat.id}`}
      className="shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all hover:shadow-xl hover:-translate-y-1"
      style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-sm font-semibold text-center" style={{ color: 'rgb(var(--color-text))' }}>{cat.name}</span>
    </Link>
  );
}

// ─── CountdownTimer ───
function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [t, setT] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const u = () => { const d = targetDate.getTime() - Date.now(); if (d <= 0) return; setT({ h: Math.floor(d / 3600000), m: Math.floor((d % 3600000) / 60000), s: Math.floor((d % 60000) / 1000) }); };
    u(); const i = setInterval(u, 1000); return () => clearInterval(i);
  }, [targetDate]);
  return (
    <div className="flex items-center gap-1">
      {[{ v: t.h, l: 'H' }, { v: t.m, l: 'M' }, { v: t.s, l: 'S' }].map(u => (
        <div key={u.l} className="flex items-center gap-0.5">
          <span className="bg-gray-900/80 text-white text-xs font-bold px-1.5 py-0.5 rounded min-w-[24px] text-center tabular-nums">{String(u.v).padStart(2, '0')}</span>
          <span className="text-[9px] font-medium text-white/70">{u.l}</span>
        </div>
      ))}
    </div>
  );
}

// ─── ViewModeToggle ───
function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const modes: { key: ViewMode; icon: React.ElementType; label: string }[] = [
    { key: 'grid', icon: LayoutGrid, label: 'Grid' }, { key: 'list', icon: List, label: 'List' }, { key: 'compact', icon: Grid3X3, label: 'Compact' },
  ];
  return (
    <div className="flex items-center gap-1 p-0.5 rounded-lg border" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface-muted))' }}>
      {modes.map(m => {
        const Icon = m.icon; const active = mode === m.key;
        return (
          <button key={m.key} onClick={() => onChange(m.key)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${active ? 'shadow-sm' : ''}`}
            style={{ backgroundColor: active ? 'rgb(var(--color-surface))' : 'transparent', color: active ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))' }}>
            <Icon className="w-3 h-3" />
          </button>
        );
      })}
    </div>
  );
}

// ─── HeroSlide ───
function HeroSlide({ slide, isActive, idx }: { slide: any; isActive: boolean; idx: number }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: isActive ? 1 : 0 }} transition={{ duration: 0.7 }} className="absolute inset-0 flex items-center">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-white/5 animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-white/5 animate-pulse-slow animation-delay-2000" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={isActive ? { y: 0, opacity: 1 } : {}} transition={{ delay: 0.2, duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-3 rounded-full backdrop-blur-sm"
              style={{ backgroundColor: 'rgb(var(--color-on-primary) / 0.15)', color: 'rgb(var(--color-on-primary-muted))' }}>
              <Sparkles className="h-3 w-3" /> {slide.eyebrow || 'Marketplace'}
            </div>
          </motion.div>
          <motion.h1 initial={{ y: 30, opacity: 0 }} animate={isActive ? { y: 0, opacity: 1 } : {}} transition={{ delay: 0.35, duration: 0.5 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-3 tracking-tight" style={{ color: 'rgb(var(--color-on-primary))' }}>
            {slide.title}
          </motion.h1>
          <motion.p initial={{ y: 20, opacity: 0 }} animate={isActive ? { y: 0, opacity: 1 } : {}} transition={{ delay: 0.5, duration: 0.5 }}
            className="mb-6 text-sm md:text-base max-w-lg mx-auto" style={{ color: 'rgb(var(--color-on-primary-muted) / 0.9)' }}>
            {slide.subtitle}
          </motion.p>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={isActive ? { y: 0, opacity: 1 } : {}} transition={{ delay: 0.65, duration: 0.5 }}
            className="flex items-center justify-center gap-3 flex-wrap">
            <Link to={slide.link} className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all hover:shadow-xl hover:scale-105 inline-flex items-center gap-2"
              style={{ backgroundColor: 'rgb(var(--color-on-primary))', color: 'rgb(var(--color-primary-700))' }}>
              {slide.cta} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
          {idx === 0 && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={isActive ? { y: 0, opacity: 1 } : {}} transition={{ delay: 0.8, duration: 0.5 }} className="w-full max-w-xl mx-auto mt-6">
              <div className="relative flex items-center rounded-full backdrop-blur-sm" style={{ backgroundColor: 'rgb(var(--color-on-primary) / 0.12)', border: '1px solid', borderColor: 'rgb(var(--color-on-primary) / 0.24)' }}>
                <Search className="absolute left-4 h-4 w-4" style={{ color: 'rgb(var(--color-on-primary))' }} />
                <input name="search" className="w-full bg-transparent pl-12 pr-20 py-2.5 text-sm focus:outline-none placeholder:text-white/60"
                  placeholder="Search products..." aria-label="Search" style={{ color: 'rgb(var(--color-on-primary))' }} />
                <button type="submit" className="absolute right-1.5 px-4 py-1 text-sm font-semibold rounded-full"
                  style={{ backgroundColor: 'rgb(var(--color-on-primary))', color: 'rgb(var(--color-primary-900))' }}>Search</button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── DealOfTheDay ───
function DealOfTheDay({ product }: { product: any }) {
  const { format: fc } = useCurrency();
  const disc = product.discountPrice && product.basePrice ? Math.round((1 - product.discountPrice / product.basePrice) * 100) : 0;
  const end = useMemo(() => new Date(Date.now() + 8 * 3600000 + 30 * 60000), []);
  return (
    <section className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81, #3730a3)' }}>
      <div className="relative z-10 px-8 py-8">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="w-48 h-48 lg:w-56 lg:h-56 rounded-2xl overflow-hidden shadow-2xl shrink-0 ring-2 ring-white/10">
            {product?.images?.[0]?.url ? <img src={assetUrl(product.images[0].url)} alt="" className="w-full h-full object-cover" /> : (
              <div className="w-full h-full flex items-center justify-center bg-indigo-800/50"><Zap className="w-12 h-12 text-indigo-300" /></div>
            )}
          </div>
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold uppercase tracking-wider mb-3">
              <Flame className="w-3 h-3" /> Deal of the Day
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">{product?.title || 'Amazing Deal'}</h3>
            <p className="text-sm text-indigo-200/80 mb-4">{product?.description?.slice(0, 120) || ''}</p>
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
              {product?.discountPrice && <span className="text-3xl font-bold text-white">{fc(product.discountPrice)}</span>}
              {product?.basePrice && <span className="text-lg text-indigo-300/60 line-through">{fc(product.basePrice)}</span>}
              {disc > 0 && <span className="px-2 py-1 rounded-lg bg-rose-500 text-white text-xs font-bold">-{disc}%</span>}
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
              <span className="text-xs text-indigo-200/70">Ends in:</span>
              <CountdownTimer targetDate={end} />
            </div>
            <Link to={`/products/${product?.slug || '#'}`} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all hover:shadow-xl hover:scale-105 bg-white text-indigo-900">
              Grab Deal <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main legacy homepage ───
function LegacyHomePage() {
  const navigate = useNavigate();
  const { data: featuredData, isLoading: featuredLoading } = useFeaturedProducts();
  const { data: newestData } = useProducts({ page: 1, limit: 8, sortBy: 'createdAt', sortOrder: 'desc' });
  const { data: bestSellersData } = useProducts({ page: 1, limit: 8, sortBy: 'totalSales', sortOrder: 'desc' });
  const { data: discountedData } = useProducts({ page: 1, limit: 8, sortBy: 'discountPrice', sortOrder: 'desc' });
  const { data: catData } = useCategoryTree();
  const { data: publicConfig } = usePublicConfig();

  const fp = featuredData?.data || [];
  const np = newestData?.data || [];
  const bs = bestSellersData?.data || [];
  const dp = discountedData?.data || [];
  const cats = catData?.data || [];

  const home = publicConfig?.data?.['homepage.content'] || {};
  const navConfig = publicConfig?.data?.['marketplace.navigation'] || {};
  const catalog = publicConfig?.data?.['marketplace.catalog'] || {};
  const trustBadges = Array.isArray(navConfig.trustBadges) ? navConfig.trustBadges : [];
  const promoBanners: { title: string; text: string; href: string }[] = Array.isArray(home.promoBanners) ? home.promoBanners : [];

  const sectionsEnabled = {
    hero: home.heroEnabled !== false,
    trust: home.trustCardsEnabled !== false && trustBadges.length > 0,
    categoryRail: home.categoryRailEnabled !== false && cats.length > 0,
    promo: home.promoBannersEnabled !== false,
    dealRail: home.dealRailEnabled !== false && dp.length > 0,
    featured: home.featuredProductsEnabled !== false,
    bestSellers: catalog.bestSellersEnabled !== false && bs.length > 0,
    newArrivals: catalog.newArrivalsEnabled !== false && np.length > 0,
  };

  const [slide, setSlide] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const heroText = {
    title: home.heroTitle || 'Source Smarter Sell Faster',
    subtitle: home.heroSubtitle || 'Discover products and manage your store from one platform.',
    cta: 'Explore',
    link: '/products',
    eyebrow: home.heroEyebrow || 'Marketplace AI-Powered',
  };

  const heroSlides = [
    { ...heroText, secondaryCta: 'AI Chat', secondaryLink: '/ai-chat' },
    { title: 'Become a Seller Today', subtitle: 'Zero setup fees, AI-powered tools, global reach.', cta: 'Start Selling', link: '/become-seller', eyebrow: 'Seller Program' },
    { title: 'AI-Powered Shopping Assistant', subtitle: 'Find products, compare prices, and make smarter purchases.', cta: 'Try AI Chat', link: '/ai-chat', eyebrow: 'Smart Shopping' },
  ];

  useEffect(() => { if (!sectionsEnabled.hero) return; const t = setInterval(() => setSlide(s => (s + 1) % heroSlides.length), 7000); return () => clearInterval(t); }, [sectionsEnabled.hero]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('search') as string;
    if (q?.trim()) navigate(`/products?search=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: 'rgb(var(--color-gray-50))' }}>

      {/* ─── HERO ─── */}
      {sectionsEnabled.hero && (
        <section className="relative overflow-hidden min-h-[520px] lg:min-h-[580px] flex items-center"
          style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-900)), rgb(var(--color-primary-700)))' }}>
          <div className="absolute inset-0 opacity-[0.03]">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <pattern id="hg" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" /></pattern>
              <rect width="100%" height="100%" fill="url(#hg)" />
            </svg>
          </div>
          {heroSlides.map((s, i) => (
            <form key={i} onSubmit={handleSearch} className="w-full"><HeroSlide slide={s} isActive={slide === i} idx={i} /></form>
          ))}
          <div className="absolute bottom-6 inset-x-0 flex justify-center gap-2 z-20">
            {heroSlides.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)} className={`h-2 rounded-full transition-all duration-500 ${i === slide ? 'w-10 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'}`} aria-label={`Slide ${i + 1}`} />
            ))}
          </div>
          <button onClick={() => setSlide(s => (s - 1 + heroSlides.length) % heroSlides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all hidden md:flex">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setSlide(s => (s + 1) % heroSlides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all hidden md:flex">
            <ChevronRight className="w-5 h-5" />
          </button>
        </section>
      )}

      {/* ─── TRUST BADGES ─── */}
      {sectionsEnabled.trust && (
        <div className="border-b" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <HorizontalScroll title="Trust & Safety" icon={Shield}>
              {trustBadges.map((b: any, i: number) => (
                <div key={i} className="shrink-0 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-primary-600) / 0.1)' }}>
                    {i === 0 ? <BadgeCheck className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} /> :
                     i === 1 ? <Truck className="w-4 h-4" style={{ color: 'rgb(var(--color-accent-600))' }} /> :
                     <Shield className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />}
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>{typeof b === 'string' ? b : b.label || b}</span>
                </div>
              ))}
            </HorizontalScroll>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-8">

        {/* ─── PROMO BANNERS ─── */}
        {sectionsEnabled.promo && promoBanners.length > 0 && (
          <HorizontalScroll title="Promotions" icon={Percent}>
            {promoBanners.map((b: any, i: number) => (
              <Link key={i} to={b.href || '/products'}
                className="shrink-0 rounded-xl p-4 text-white w-[180px] transition-all hover:scale-[1.03] hover:shadow-xl"
                style={{ background: `linear-gradient(135deg, ${['#dc2626','#2563eb','#059669','#7c3aed','#db2777','#ea580c'][i % 6]}, ${['#b91c1c','#1d4ed8','#047857','#6d28d9','#be185d','#c2410c'][i % 6]})` }}>
                <p className="text-sm font-bold truncate">{b.title || `Deal ${i+1}`}</p>
                <p className="text-xs opacity-80 line-clamp-2 mt-1">{b.text || ''}</p>
              </Link>
            ))}
          </HorizontalScroll>
        )}

        {/* ─── RECENTLY VIEWED ─── */}
        <RecentlyViewed />

        {/* ─── VIEW MODE ─── */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text))' }}>Browse Products</h2>
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
        </div>

        {/* ─── CATEGORIES ─── */}
        {sectionsEnabled.categoryRail && (
          <HorizontalScroll title="Shop by Category" icon={LayoutGrid} link="/products">
            {cats.slice(0, 24).map((c: any, i: number) => <CategoryCard key={c.id} cat={c} idx={i} />)}
          </HorizontalScroll>
        )}

        {/* ─── FLASH DEALS ─── */}
        {sectionsEnabled.dealRail && (
          <HorizontalScroll title="Flash Deals" link="/products?sortBy=discountPrice&sortOrder=desc" icon={Zap}>
            <div className="flex items-center gap-2 shrink-0 mr-2">
              <div className="px-2 py-0.5 rounded text-white text-xs font-bold uppercase tracking-wider animate-pulse" style={{ backgroundColor: 'rgb(var(--color-danger))' }}>LIVE</div>
              <CountdownTimer targetDate={new Date(Date.now() + 12 * 3600000)} />
            </div>
            {dp.slice(0, 8).map((p: any) => (
              <div key={p.id} className="shrink-0 w-[200px]"><AnimatedProductCard product={p} variant="compact" /></div>
            ))}
          </HorizontalScroll>
        )}

        {/* ─── DEAL OF THE DAY ─── */}
        {dp[0] && <DealOfTheDay product={dp[0]} />}

        {/* ─── FEATURED ─── */}
        {sectionsEnabled.featured && (
          featuredLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {[...Array(8)].map((_, i) => <div key={i} className="rounded-xl animate-pulse h-40" style={{ backgroundColor: 'rgb(var(--color-surface-active))' }} />)}
            </div>
          ) : fp.length > 0 ? (
            <ProductGrid products={fp.slice(0, 8)} viewMode={viewMode} title="Featured Products" link="/products?sortBy=isFeatured&sortOrder=desc" />
          ) : null
        )}

        {/* ─── BEST SELLERS ─── */}
        {sectionsEnabled.bestSellers && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
                <h2 className="text-base font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text))' }}>Best Sellers</h2>
              </div>
              <Link to="/products?sortBy=totalSales&sortOrder=desc" className="text-sm font-medium flex items-center gap-1 hover:underline" style={{ color: 'rgb(var(--color-primary-600))' }}>View all <ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {bs.slice(0, 8).map((p: any, i: number) => (
                <motion.div key={p.id} className="relative" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <span className="absolute -top-1 -left-1 z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
                    style={{ backgroundColor: i < 3 ? 'rgb(var(--color-danger))' : 'rgb(var(--color-text-muted))' }}>{i + 1}</span>
                  <AnimatedProductCard product={p} variant={viewMode === 'compact' ? 'compact' : 'default'} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ─── NEW ARRIVALS ─── */}
        {sectionsEnabled.newArrivals && (
          <HorizontalScroll title="New Arrivals" icon={Sparkles} link="/products?sortBy=createdAt&sortOrder=desc">
            {np.slice(0, 8).map((p: any) => (
              <div key={p.id} className="shrink-0 w-[200px]"><AnimatedProductCard product={p} variant="compact" /></div>
            ))}
          </HorizontalScroll>
        )}

        {/* ─── SELLER CTA ─── */}
        <section className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-600)), rgb(var(--color-primary-800)))' }}>
          <div className="relative z-10 px-8 py-8">
            <div className="text-center sm:text-left sm:flex items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Start selling today</h3>
                <p className="text-sm" style={{ color: 'rgb(var(--color-primary-50) / 0.8)' }}>Zero setup fees. AI-powered tools. Global reach.</p>
              </div>
              <Link to="/become-seller"
                className="inline-flex items-center gap-2 mt-4 sm:mt-0 shrink-0 bg-white px-6 py-2.5 rounded-full font-semibold text-sm transition-all hover:shadow-xl hover:scale-105"
                style={{ color: 'rgb(var(--color-primary-700))' }}>Open your store <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </section>

        {/* ─── STATS ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: '10K+', label: 'Products', icon: Package, c: 'rgb(var(--color-primary-600))' },
            { value: '1K+', label: 'Sellers', icon: Store, c: 'rgb(var(--color-accent-600))' },
            { value: '50K+', label: 'Customers', icon: ThumbsUp, c: 'rgb(var(--color-warning))' },
            { value: '24/7', label: 'AI Support', icon: Headphones, c: 'rgb(var(--color-danger))' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                className="text-center p-4 rounded-xl border" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
                <Icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: s.c }} />
                <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>{s.value}</p>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{s.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}

// ─── Main HomePage ───
export default function HomePage() {
  const { data: pb, isLoading } = usePublishedLayoutTree('home');
  if (isLoading) return <SkeletonPage cards={4} columns={2} className="min-h-screen px-4 py-6" />;
  if (pb?.data?.tree?.length) return <DynamicPageJsonRenderer slug="home" fallback={null} />;
  return <LegacyHomePage />;
}
