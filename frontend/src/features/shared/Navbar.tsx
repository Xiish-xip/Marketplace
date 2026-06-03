import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth-store';
import { useCart, useCategoryTree, usePublicConfig, useWishlist } from '../../lib/query-hooks';
import { useCurrency } from '../../lib/currency-context';
import { assetUrl } from '../../lib/assets';
import { 
  Search, ShoppingCart, Menu, X, ChevronDown, User, Package, 
  LogOut, Store, Settings, Heart, ShieldCheck, Sparkles, 
  ChevronRight, Zap, TrendingUp, Sun, Moon, LayoutGrid, Tag, Percent, Truck, Headphones, Trash2,
  Home, ChevronLeft
} from 'lucide-react';
import { usePreferenceStore } from '../../lib/preference-store';
import AISearchBar from './AISearchBar';
import VerifiedBadge from '../../components/VerifiedBadge';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  imageUrl?: string;
  children?: Category[];
}

interface PromoBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  bgColor?: string;
  textColor?: string;
  link?: string;
}

interface QuickLink {
  label: string;
  href: string;
  icon?: React.ElementType;
}

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { data: cartData, isLoading: cartLoading } = useCart();
  const { data: catData } = useCategoryTree();
  const { data: publicConfig } = usePublicConfig();
  const { data: wishlistData } = useWishlist();
  const { theme: prefTheme, toggleTheme: togglePrefTheme } = usePreferenceStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false);
  const [wishlistDropdownOpen, setWishlistDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);
  const [activeNavLink, setActiveNavLink] = useState('/');
  const [expandedMobileCats, setExpandedMobileCats] = useState<Set<string>>(new Set());
  const [mobileCatStack, setMobileCatStack] = useState<{ cat: Category; level: number }[]>([]);
  const [mobileView, setMobileView] = useState<'main' | 'categories'>('main');
  const userMenuRef = useRef<HTMLDivElement>(null);
  const cartDropdownRef = useRef<HTMLDivElement>(null);
  const wishlistDropdownRef = useRef<HTMLDivElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopCatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [desktopSubmenuOpen, setDesktopSubmenuOpen] = useState<string | null>(null);

  const { format: formatCurrency, activeCurrency, currencies, setActiveCurrency, baseCurrency } = useCurrency();
  const cartCount = cartData?.data?.itemCount || 0;
  const cartItems = cartData?.data?.items || [];
  const wishlistItems = wishlistData?.data || [];
  const wishlistCount = wishlistItems.length;
  const categories: Category[] = catData?.data || [];
  const navConfig = publicConfig?.data?.['marketplace.navigation'] || {};
  const platformAssets = publicConfig?.data?.['platform.assets'] || {};
  const siteIdentity = publicConfig?.data?.['site.identity'] || {};
  const identity = {
    ...siteIdentity,
    logoUrl: siteIdentity.logoUrl || platformAssets.logoUrl,
    faviconUrl: siteIdentity.faviconUrl || platformAssets.faviconUrl,
  };

  const trustBadges = Array.isArray(navConfig.trustBadges) && navConfig.trustBadges.length
    ? navConfig.trustBadges
    : ['Verified suppliers', 'Ready to ship', 'Trade assurance'];
  const topLinks = Array.isArray(navConfig.topLinks) && navConfig.topLinks.length
    ? navConfig.topLinks
    : [{ label: 'Become a Seller', href: '/seller' }, { label: 'Track Order', href: '/account/orders' }, { label: 'Help Center', href: '/account/notifications' }];

  const defaultPromoBanners: PromoBanner[] = [
    {
      id: '1',
      title: 'Summer Sale',
      subtitle: 'Up to 50% off',
      bgColor: 'rgb(var(--color-primary-600))',
      textColor: '#ffffff',
      link: '/products?sortBy=discountPrice&sortOrder=desc',
    },
    {
      id: '2',
      title: 'New Arrivals',
      subtitle: 'Check them out',
      bgColor: 'rgb(var(--color-accent-500))',
      textColor: '#ffffff',
      link: '/products?sortBy=createdAt&sortOrder=desc',
    },
  ];

  const promoBanners: PromoBanner[] = Array.isArray(navConfig.promoBanners) && navConfig.promoBanners.length
    ? navConfig.promoBanners
    : defaultPromoBanners;

  const defaultQuickLinks: QuickLink[] = [
    { label: 'Deals', href: '/products?sortBy=discountPrice&sortOrder=desc', icon: Percent },
    { label: 'New', href: '/products?sortBy=createdAt&sortOrder=desc', icon: Sparkles },
    { label: 'Best Sellers', href: '/products?sortBy=soldCount&sortOrder=desc', icon: TrendingUp },
    { label: 'Free Shipping', href: '/products?shipping=free', icon: Truck },
  ];

  const quickLinks: QuickLink[] = Array.isArray(navConfig.quickLinks) && navConfig.quickLinks.length
    ? navConfig.quickLinks.map((link: any) => ({
        label: link.label || 'Quick link',
        href: link.href || '/',
        icon: link.icon || Tag,
      }))
    : defaultQuickLinks;

  useEffect(() => {
    setActiveNavLink(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (cartDropdownRef.current && !cartDropdownRef.current.contains(e.target as Node) && 
          !(e.target as HTMLElement).closest('[data-cart-trigger]')) {
        setCartDropdownOpen(false);
      }
      if (wishlistDropdownRef.current && !wishlistDropdownRef.current.contains(e.target as Node) &&
          !(e.target as HTMLElement).closest('[data-wishlist-trigger]')) {
        setWishlistDropdownOpen(false);
      }
      if (
        menuDropdownRef.current && 
        !menuDropdownRef.current.contains(e.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(e.target as Node)
      ) {
        setMenuDropdownOpen(false);
        setDesktopSubmenuOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setUserMenuOpen(false);
        setCartDropdownOpen(false);
        setWishlistDropdownOpen(false);
        setMenuDropdownOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  const showMenuDropdown = () => {
    if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
    setMenuDropdownOpen(true);
  };

  const hideMenuDropdown = () => {
    menuTimeoutRef.current = setTimeout(() => {
      setMenuDropdownOpen(false);
      setDesktopSubmenuOpen(null);
    }, 150);
  };

  const toggleMobileCat = (catId: string) => {
    setExpandedMobileCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  // Push a category onto the mobile stack for drill-down navigation
  const pushMobileCatStack = (cat: Category) => {
    setMobileCatStack(prev => [...prev, { cat, level: prev.length }]);
  };

  const popMobileCatStack = () => {
    setMobileCatStack(prev => {
      const next = [...prev];
      next.pop();
      return next;
    });
  };

  const currentStackCat = mobileCatStack.length > 0 
    ? mobileCatStack[mobileCatStack.length - 1].cat 
    : null;

  const isActive = (href: string) => {
    if (href === '/') return activeNavLink === '/';
    if (href === '/seller') return activeNavLink.startsWith('/seller');
    return activeNavLink.startsWith(href.split('?')[0]);
  };

  const cartSubtotal = cartItems.reduce((sum: number, item: any) => sum + (item.unitPrice || 0) * item.quantity, 0);
  const primaryCenter = user?.role === 'DELIVERY'
    ? { href: '/delivery', label: 'Delivery Center', icon: Truck }
    : user?.role === 'SELLER'
      ? { href: '/seller', label: 'Seller Center', icon: Store }
      : user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
        ? { href: '/admin', label: 'Admin Panel', icon: Settings }
        : { href: '/account', label: 'Customer Center', icon: User };
  const PrimaryCenterIcon = primaryCenter.icon;

  // Recursive function to render category tree with subcategories in desktop dropdown
  const renderDesktopCategory = (cat: Category, depth: number = 0) => {
    const hasChildren = cat.children && cat.children.length > 0;
    const isHovered = desktopSubmenuOpen === cat.id;
    
    return (
      <div
        key={cat.id}
        className="relative group"
        onMouseEnter={() => {
          if (hasChildren) {
            if (desktopCatTimeoutRef.current) clearTimeout(desktopCatTimeoutRef.current);
            setDesktopSubmenuOpen(cat.id);
          }
        }}
        onMouseLeave={() => {
          if (hasChildren) {
            desktopCatTimeoutRef.current = setTimeout(() => {
              setDesktopSubmenuOpen(null);
            }, 200);
          }
        }}
      >
        <Link
          to={`/products?categoryId=${cat.id}`}
          onClick={() => { setMenuDropdownOpen(false); setDesktopSubmenuOpen(null); }}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
            depth === 0 
              ? 'hover:bg-white dark:hover:bg-gray-800' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
          style={{ 
            color: 'rgb(var(--color-text-secondary))',
            paddingLeft: depth > 0 ? `${12 + depth * 12}px` : '12px'
          }}
          role="menuitem"
        >
          {depth === 0 && <Tag className="w-3 h-3 shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />}
          <span className="truncate">{cat.name}</span>
          {hasChildren && (
            <ChevronRight className="w-3 h-3 ml-auto shrink-0" style={{ color: 'rgb(var(--color-text-disabled))' }} />
          )}
        </Link>

        {/* Nested submenu */}
        {hasChildren && isHovered && (
          <div
            className="absolute left-full top-0 min-w-[200px] py-2 rounded-lg shadow-xl border z-50"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
            }}
            onMouseEnter={() => {
              if (desktopCatTimeoutRef.current) clearTimeout(desktopCatTimeoutRef.current);
              setDesktopSubmenuOpen(cat.id);
            }}
            onMouseLeave={() => {
              desktopCatTimeoutRef.current = setTimeout(() => {
                setDesktopSubmenuOpen(null);
              }, 200);
            }}
          >
            {cat.children!.map((sub: Category) => renderDesktopCategory(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Recursive render for mobile categories with drill-down navigation
  const renderMobileCategoryTree = (cats: Category[], depth: number = 0) => {
    return cats.map((cat: Category) => {
      const hasChildren = cat.children && cat.children.length > 0;
      return (
        <div key={cat.id}>
          <button
            onClick={() => {
              if (!hasChildren) {
                navigate(`/products?categoryId=${cat.id}`);
                setMobileMenuOpen(false);
                setMobileCatStack([]);
              } else {
                pushMobileCatStack(cat);
              }
            }}
            className="flex items-center justify-between w-full px-3 py-2.5 text-sm transition-colors"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            <span className="flex items-center gap-2">
              {depth === 0 && <Tag className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />}
              {cat.name}
            </span>
            {hasChildren && (
              <ChevronRight className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-disabled))' }} />
            )}
          </button>
        </div>
      );
    });
  };

  // Render the current level of mobile drill-down
  const renderMobileCategoryLevel = () => {
    const currentLevel = currentStackCat ? (currentStackCat.children || []) : categories;
    return (
      <div className="animate-fade-in">
        <div className="space-y-0.5">
          {renderMobileCategoryTree(currentLevel)}
        </div>
      </div>
    );
  };

  return (
    <nav
      className="glass-nav sticky top-0 z-50"
      aria-label="Main navigation"
    >
      {/* Top Bar - hidden on small screens */}
      <div
        className="hidden md:block"
        style={{
          backgroundColor: 'rgb(var(--color-gray-900))',
          color: 'rgb(var(--color-gray-100))',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between text-xs">
          <div className="flex items-center gap-5 overflow-hidden">
            {trustBadges.map((badge: string, index: number) => (
              <span key={badge} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                {index === 0 && <ShieldCheck className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-400))' }} aria-hidden="true" />}
                {badge}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-5 shrink-0">
              {/* Currency Switcher */}
              {currencies.length > 0 && (
                <select
                  value={activeCurrency}
                  onChange={(e) => setActiveCurrency(e.target.value)}
                  className="bg-transparent text-xs border-0 cursor-pointer outline-none transition-colors"
                  style={{ color: 'rgb(var(--color-gray-100))' }}
                  aria-label="Select currency"
                >
                  {currencies
                    .filter((c) => c.code !== baseCurrency || activeCurrency === baseCurrency)
                    .map((c) => (
                      <option key={c.code} value={c.code} className="text-gray-900">
                        {c.symbol} {c.code}
                      </option>
                    ))}
                </select>
              )}
              <span style={{ color: 'rgb(var(--color-gray-600))' }} aria-hidden="true">|</span>
              <button 
              onClick={togglePrefTheme}
              className="flex items-center gap-1.5 transition-colors whitespace-nowrap"
              style={{ color: 'rgb(var(--color-gray-100))' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--color-primary-300))'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--color-gray-100))'; }}
              aria-label={prefTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {prefTheme === 'dark' ? <Sun className="w-3 h-3" aria-hidden="true" /> : <Moon className="w-3 h-3" aria-hidden="true" />}
              <span>{prefTheme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <span style={{ color: 'rgb(var(--color-gray-600))' }} aria-hidden="true">|</span>
            {topLinks.map((link: any, idx: number) => (
              <React.Fragment key={`${link.href}-${link.label}`}>
                <Link
                  to={link.href}
                  className="transition-colors whitespace-nowrap"
                  style={{ color: 'rgb(var(--color-gray-100))' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--color-primary-300))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--color-gray-100))'; }}
                >
                  {link.label}
                </Link>
                {idx < topLinks.length - 1 && (
                  <span style={{ color: 'rgb(var(--color-gray-600))' }} aria-hidden="true">·</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-2 lg:gap-3">

          {/* LEFT: Menu Button + Logo */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile Menu Button (Hamburger) - visible on mobile only */}
            <button
              onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setMobileCatStack([]); setMobileView('main'); }}
              className="lg:hidden flex items-center gap-1.5 px-2 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: mobileMenuOpen ? 'rgb(var(--color-primary-50))' : 'transparent',
                color: mobileMenuOpen ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text-secondary))',
              }}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>

            {/* Desktop Menu Button (Hamburger) - hidden on mobile */}
            <div className="relative hidden lg:block">
              <button
                ref={menuButtonRef}
                onClick={() => setMenuDropdownOpen(!menuDropdownOpen)}
                onMouseEnter={showMenuDropdown}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: menuDropdownOpen ? 'rgb(var(--color-primary-50))' : 'transparent',
                  color: menuDropdownOpen ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text-secondary))',
                }}
                aria-expanded={menuDropdownOpen}
                aria-haspopup="true"
                aria-label="Browse categories"
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
                <span className="hidden xl:inline">Menu</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${menuDropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>

              {/* Desktop Mega Dropdown with nested subcategories */}
              {menuDropdownOpen && (
                <div
                  ref={menuDropdownRef}
                  onMouseEnter={showMenuDropdown}
                  onMouseLeave={hideMenuDropdown}
                  className="absolute left-0 top-full mt-1 w-[600px] max-w-[calc(100vw-2rem)] rounded-xl shadow-2xl border overflow-hidden animate-fade-in"
                  style={{
                    backgroundColor: 'rgb(var(--color-surface))',
                    borderColor: 'rgb(var(--color-border))',
                  }}
                  role="menu"
                  aria-label="Categories menu"
                >
                  <div className="flex max-h-[70vh]">
                    {/* Categories Column with Nested Submenus */}
                    <div className="w-[220px] shrink-0 py-2 overflow-y-auto" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
                      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-disabled))' }}>
                        Categories
                      </p>
                      {categories.slice(0, 10).map((cat: Category) => renderDesktopCategory(cat))}
                      <Link
                        to="/products"
                        onClick={() => setMenuDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 mt-1 text-xs font-medium transition-colors"
                        style={{ color: 'rgb(var(--color-primary-600))' }}
                      >
                        View All Categories
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Right Content */}
                    <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto">
                      {/* Quick Links */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgb(var(--color-text-disabled))' }}>
                          Quick Links
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {quickLinks.map((link) => {
                            const Icon = link.icon || Tag;
                            return (
                              <Link
                                key={link.label}
                                to={link.href}
                                onClick={() => setMenuDropdownOpen(false)}
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                                style={{ color: 'rgb(var(--color-text-secondary))' }}
                              >
                                <Icon className="w-3 h-3 shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
                                {link.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>

                      {/* Promo Banners */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgb(var(--color-text-disabled))' }}>
                          Promotions
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {promoBanners.map((banner) => (
                            <Link
                              key={banner.id}
                              to={banner.link || '/products'}
                              onClick={() => setMenuDropdownOpen(false)}
                              className="relative rounded-lg overflow-hidden p-2.5 transition-transform hover:scale-[1.02]"
                              style={{
                                backgroundColor: banner.bgColor,
                                color: banner.textColor,
                              }}
                            >
                              <p className="text-xs font-bold leading-tight">{banner.title}</p>
                              <p className="text-[10px] opacity-90 mt-0.5">{banner.subtitle}</p>
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Support */}
                      <div className="mt-auto pt-2" style={{ borderTop: '1px solid', borderColor: 'rgb(var(--color-divider))' }}>
                        <Link
                          to="/account/notifications"
                          onClick={() => setMenuDropdownOpen(false)}
                          className="flex items-center gap-2 text-[10px] transition-colors"
                          style={{ color: 'rgb(var(--color-text-muted))' }}
                        >
                          <Headphones className="w-3 h-3" />
                          Need help? Contact support
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0 group" aria-label={`Go to homepage - ${identity.name || 'MarketPlace'}`}>
              {identity.logoUrl ? (
                <img
                  src={assetUrl(identity.logoUrl)}
                  alt={`${identity.name || 'Marketplace'} logo`}
                  className="h-8 w-8 rounded-lg object-cover ring-2 ring-[rgb(var(--color-primary-100))] transition-all"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, rgb(var(--color-primary-500)), rgb(var(--color-primary-700)))',
                  }}
                  aria-hidden="true"
                >
                  <span className="text-white font-bold text-sm">{(identity.name || 'MarketPlace')[0]}</span>
                </div>
              )}
              <span
                className="text-lg font-bold hidden sm:block tracking-tight"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {identity.name || 'MarketPlace'}
              </span>
            </Link>
          </div>

          {/* CENTER: AI Search Bar - hidden on mobile */}
          <div className="flex-1 max-w-lg hidden md:flex items-center">
            <AISearchBar />
          </div>

          {/* RIGHT: Wishlist + Cart + User */}
          <div className="flex items-center gap-0 sm:gap-1">
            {/* Wishlist with Dropdown */}
            <div className="relative">
              <button
                data-wishlist-trigger
                onClick={() => {
                  setWishlistDropdownOpen(!wishlistDropdownOpen);
                  setCartDropdownOpen(false);
                }}
                className="relative p-2 rounded-lg transition-colors"
                style={{ color: 'rgb(var(--color-text-muted))' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                title="Wishlist"
                aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} items` : ''}`}
              >
                <Heart className="w-5 h-5" aria-hidden="true" />
                {wishlistCount > 0 && (
                  <span 
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm"
                    style={{ backgroundColor: 'rgb(var(--color-danger))' }}
                  >
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </button>

              {wishlistDropdownOpen && (
                <div
                  ref={wishlistDropdownRef}
                  className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-xl shadow-xl border py-2 z-50 overflow-hidden"
                  style={{
                    backgroundColor: 'rgb(var(--color-surface))',
                    borderColor: 'rgb(var(--color-border))',
                  }}
                >
                  <div className="px-3 py-1.5 border-b flex items-center justify-between" style={{ borderColor: 'rgb(var(--color-divider))' }}>
                    <h4 className="text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Wishlist</h4>
                    {wishlistCount > 0 && (
                      <Link to="/wishlist" onClick={() => setWishlistDropdownOpen(false)} className="text-[10px] font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>
                        View all
                      </Link>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {wishlistItems.length === 0 ? (
                      <div className="px-3 py-4 text-center">
                        <Heart className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgb(var(--color-text-disabled))' }} />
                        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Your wishlist is empty</p>
                        <Link to="/products" onClick={() => setWishlistDropdownOpen(false)} className="text-xs font-medium mt-2 inline-block" style={{ color: 'rgb(var(--color-primary-600))' }}>
                          Browse products
                        </Link>
                      </div>
                    ) : (
                      wishlistItems.slice(0, 5).map((item: any) => (
                        <Link
                          key={item.id}
                          to={`/products/${item.product?.slug || item.productId}`}
                          onClick={() => setWishlistDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
                            {item.product?.images?.[0]?.url ? (
                              <img src={assetUrl(item.product.images[0].url)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingCart className="w-4 h-4" style={{ color: 'rgb(var(--color-text-disabled))' }} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                              {item.product?.title || 'Product'}
                            </p>
                            {item.product?.discountPrice && (
                              <p className="text-xs font-semibold mt-0.5" style={{ color: 'rgb(var(--color-primary-600))' }}>
                                {formatCurrency(item.product.discountPrice)}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                  {wishlistItems.length > 0 && (
                    <div className="px-3 pt-2 border-t" style={{ borderColor: 'rgb(var(--color-divider))' }}>
                      <Link
                        to="/wishlist"
                        onClick={() => setWishlistDropdownOpen(false)}
                        className="block w-full text-center py-1.5 text-xs font-medium rounded-lg transition-colors"
                        style={{
                          backgroundColor: 'rgb(var(--color-primary-600))',
                          color: 'white',
                        }}
                      >
                        View Full Wishlist ({wishlistCount})
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart with Dropdown */}
            <div className="relative">
              <button
                data-cart-trigger
                onClick={() => {
                  setCartDropdownOpen(!cartDropdownOpen);
                  setWishlistDropdownOpen(false);
                }}
                className="relative p-2 rounded-lg transition-colors"
                style={{ color: 'rgb(var(--color-text-muted))' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
              >
                <ShoppingCart className="w-5 h-5" aria-hidden="true" />
                {cartCount > 0 && (
                  <span 
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm"
                    style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
                    aria-live="polite"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>

              {cartDropdownOpen && (
                <div
                  ref={cartDropdownRef}
                  className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1rem)] rounded-xl shadow-xl border py-2 z-50 overflow-hidden"
                  style={{
                    backgroundColor: 'rgb(var(--color-surface))',
                    borderColor: 'rgb(var(--color-border))',
                  }}
                >
                  <div className="px-3 py-1.5 border-b flex items-center justify-between" style={{ borderColor: 'rgb(var(--color-divider))' }}>
                    <h4 className="text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                      Cart ({cartCount} {cartCount === 1 ? 'item' : 'items'})
                    </h4>
                    <Link to="/cart" onClick={() => setCartDropdownOpen(false)} className="text-[10px] font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>
                      Edit cart
                    </Link>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {cartItems.length === 0 ? (
                      <div className="px-3 py-4 text-center">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgb(var(--color-text-disabled))' }} />
                        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Your cart is empty</p>
                        <Link to="/products" onClick={() => setCartDropdownOpen(false)} className="text-xs font-medium mt-2 inline-block" style={{ color: 'rgb(var(--color-primary-600))' }}>
                          Start shopping
                        </Link>
                      </div>
                    ) : (
                      cartItems.slice(0, 5).map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
                            {item.product?.images?.[0]?.url ? (
                              <img src={assetUrl(item.product.images[0].url)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingCart className="w-4 h-4" style={{ color: 'rgb(var(--color-text-disabled))' }} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                              {item.product?.title || 'Product'}
                            </p>
                            <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>Qty: {item.quantity}</p>
                          </div>
                          <p className="text-xs font-semibold shrink-0" style={{ color: 'rgb(var(--color-primary-600))' }}>
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  {cartItems.length > 0 && (
                    <div className="px-3 pt-2 border-t space-y-2" style={{ borderColor: 'rgb(var(--color-divider))' }}>
                      <div className="flex justify-between text-xs px-1">
                        <span style={{ color: 'rgb(var(--color-text-muted))' }}>Subtotal</span>
                        <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(cartSubtotal)}</span>
                      </div>
                      <Link
                        to="/cart"
                        onClick={() => setCartDropdownOpen(false)}
                        className="block w-full text-center py-1.5 text-xs font-medium rounded-lg transition-colors"
                        style={{
                          backgroundColor: 'rgb(var(--color-primary-600))',
                          color: 'white',
                        }}
                      >
                        View Cart & Checkout
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Auth / User */}
            {isAuthenticated ? (
              <div className="relative ml-1" ref={userMenuRef}>
                {/* Clickable user avatar button that links to user profile */}
                {user && (
                  <Link
                    to={`/user/${user.id}`}
                    className="relative"
                  >
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        setUserMenuOpen(!userMenuOpen);
                        setCartDropdownOpen(false);
                        setWishlistDropdownOpen(false);
                      }} 
                      className="flex items-center gap-1.5 p-1 pl-1.5 rounded-lg transition-colors"
                      style={{
                        backgroundColor: userMenuOpen ? 'rgb(var(--color-primary-50))' : 'transparent',
                        color: userMenuOpen ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text-secondary))',
                      }}
                      onMouseEnter={(e) => { if (!userMenuOpen) e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
                      onMouseLeave={(e) => { if (!userMenuOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      aria-expanded={userMenuOpen}
                      aria-haspopup="true"
                      aria-label={`User menu for ${user?.firstName || 'user'}`}
                    >
                      <span className="relative inline-block">
                        {user?.avatar ? (
                          <img
                            src={assetUrl(user.avatar)}
                            alt={user.firstName || 'User'}
                            className="w-7 h-7 rounded-full object-cover shadow-sm"
                          />
                        ) : (
                          <div 
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm"
                            style={{
                              background: 'linear-gradient(135deg, rgb(var(--color-primary-100)), rgb(var(--color-primary-200)))',
                              color: 'rgb(var(--color-primary-700))',
                            }}
                          >
                            {user?.firstName?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        {/* Show verified badge for seller/admin/delivery users */}
                        {(user?.role === 'SELLER' || user?.role === 'DELIVERY' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                          <span className="absolute -bottom-0.5 -right-0.5">
                            <VerifiedBadge size={12} />
                          </span>
                        )}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 hidden sm:block transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  </Link>
                )}

                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1rem)] rounded-xl shadow-xl border py-2 z-50 overflow-hidden"
                    style={{
                      backgroundColor: 'rgb(var(--color-surface))',
                      borderColor: 'rgb(var(--color-border))',
                    }}
                    role="menu"
                    aria-label="User menu"
                  >
                    {/* User header */}
                    <div
                      className="px-3 py-2.5 border-b"
                      style={{
                        borderColor: 'rgb(var(--color-divider))',
                        background: 'linear-gradient(135deg, rgb(var(--color-primary-50)), transparent)',
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        {user?.avatar ? (
                          <img
                            src={assetUrl(user.avatar)}
                            alt={user.firstName || 'User'}
                            className="w-9 h-9 rounded-full object-cover shadow-sm"
                          />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm"
                            style={{
                              background: 'linear-gradient(135deg, rgb(var(--color-primary-500)), rgb(var(--color-primary-700)))',
                            }}
                            aria-hidden="true"
                          >
                            {user?.firstName?.[0]?.toUpperCase() || 'U'}{user?.lastName?.[0]?.toUpperCase() || ''}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: 'rgb(var(--color-text))' }}>{user?.firstName} {user?.lastName}</p>
                          <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{user?.email || user?.phone}</p>
                        </div>
                      </div>
                    </div>

                    <div className="py-1">
                      {primaryCenter.href !== '/account' && (
                        <Link
                          to="/account"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                          style={{ color: 'rgb(var(--color-text-secondary))' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          role="menuitem"
                        >
                          <User className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgb(var(--color-primary-600))' }} />
                          Customer Center
                        </Link>
                      )}
                      <Link
                        to={primaryCenter.href}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                        style={{ color: 'rgb(var(--color-text-secondary))' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        role="menuitem"
                      >
                        <PrimaryCenterIcon className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgb(var(--color-primary-600))' }} />
                        {primaryCenter.label}
                      </Link>
                      <Link
                        to="/account/orders"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                        style={{ color: 'rgb(var(--color-text-secondary))' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        role="menuitem"
                      >
                        <Package className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgb(var(--color-warning))' }} />
                        My Orders
                      </Link>
                      <Link
                        to="/wishlist"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                        style={{ color: 'rgb(var(--color-text-secondary))' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        role="menuitem"
                      >
                        <Heart className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgb(var(--color-danger))' }} />
                        Wishlist
                      </Link>
                    </div>

                    {(user?.role === 'SELLER' || user?.role === 'DELIVERY' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                      <>
                        <div className="border-t mx-2" style={{ borderColor: 'rgb(var(--color-divider))' }} />
                        <div className="py-1">
                          {user?.role === 'DELIVERY' && (
                            <Link
                              to="/delivery"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                              style={{ color: 'rgb(var(--color-text-secondary))' }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              role="menuitem"
                            >
                              <Truck className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgb(var(--color-accent-600))' }} />
                              Delivery Center
                              <span
                                className="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                                style={{ color: 'rgb(var(--color-accent-600))', backgroundColor: 'rgb(var(--color-accent-600) / 0.15)' }}
                              >
                                DRIVER
                              </span>
                            </Link>
                          )}
                          {user?.role === 'SELLER' && (
                            <Link
                              to="/seller"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                              style={{ color: 'rgb(var(--color-text-secondary))' }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              role="menuitem"
                            >
                              <Store className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgb(var(--color-accent-600))' }} />
                              Seller Center
                              <span 
                                className="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                                style={{ color: 'rgb(var(--color-accent-600))', backgroundColor: 'rgb(var(--color-accent-600) / 0.15)' }}
                              >
                                SELLER
                              </span>
                            </Link>
                          )}
                          {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                            <Link
                              to="/admin"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                              style={{ color: 'rgb(var(--color-text-secondary))' }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              role="menuitem"
                            >
                              <Settings className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgb(var(--color-primary-600))' }} />
                              Admin Panel
                              <span 
                                className="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                                style={{ color: 'rgb(var(--color-primary-600))', backgroundColor: 'rgb(var(--color-primary-600) / 0.15)' }}
                              >
                                {user.role}
                              </span>
                            </Link>
                          )}
                        </div>
                      </>
                    )}

                    <div className="border-t mx-2" style={{ borderColor: 'rgb(var(--color-divider))' }} />
                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors w-full"
                        style={{ color: 'rgb(var(--color-danger))' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-danger) / 0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        role="menuitem"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 ml-1">
                <Link 
                  to="/login" 
                  className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
                  style={{ 
                    borderColor: 'rgb(var(--color-border-strong))',
                    color: 'rgb(var(--color-text-secondary))',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  Sign In
                </Link>
                <Link 
                  to="/register" 
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-white transition-colors"
                  style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-700))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600))'; }}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== MOBILE MENU - Off-canvas Drawer ===== */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setMobileMenuOpen(false); setMobileCatStack([]); }}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div
            ref={mobileMenuRef}
            className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-sm shadow-2xl overflow-hidden flex flex-col animate-slide-in"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              borderRight: '1px solid',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-3 border-b shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
              {mobileCatStack.length > 0 ? (
                <button
                  onClick={popMobileCatStack}
                  className="flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                  aria-label="Go back"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  {identity.logoUrl ? (
                    <img src={assetUrl(identity.logoUrl)} alt="" className="w-7 h-7 rounded-lg object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-500)), rgb(var(--color-primary-700)))' }}>
                      <span className="text-white font-bold text-xs">M</span>
                    </div>
                  )}
                  <span className="font-bold text-sm" style={{ color: 'rgb(var(--color-text))' }}>{identity.name || 'MarketPlace'}</span>
                </div>
              )}
              <button
                onClick={() => { setMobileMenuOpen(false); setMobileCatStack([]); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
              </button>
            </div>

            {/* Mobile Search */}
            {mobileCatStack.length === 0 && (
              <div className="px-3 py-2.5 shrink-0">
                <form onSubmit={handleSearch} role="search" aria-label="Search products">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--color-text-disabled))' }} aria-hidden="true" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search products..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm focus:outline-none focus:ring-2"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-surface-muted))', 
                        color: 'rgb(var(--color-text))',
                        '--tw-ring-color': 'rgb(var(--color-primary-500))',
                      } as React.CSSProperties}
                      aria-label="Search products"
                    />
                  </div>
                </form>
              </div>
            )}

            {/* Breadcrumb for category drill-down */}
            {mobileCatStack.length > 0 && (
              <div className="px-3 py-1.5 border-b shrink-0" style={{ borderColor: 'rgb(var(--color-divider))' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-disabled))' }}>
                  {mobileCatStack.map((s, i) => s.cat.name).join(' / ')}
                </p>
              </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {mobileCatStack.length === 0 ? (
                <>
                  {/* Promo Banners */}
                  <div className="px-3 py-2">
                    <div className="grid grid-cols-2 gap-2">
                      {promoBanners.map((banner) => (
                        <Link
                          key={banner.id}
                          to={banner.link || '/products'}
                          onClick={() => { setMobileMenuOpen(false); setMobileCatStack([]); }}
                          className="relative rounded-lg overflow-hidden p-2.5"
                          style={{
                            backgroundColor: banner.bgColor,
                            color: banner.textColor,
                          }}
                        >
                          <p className="text-xs font-bold">{banner.title}</p>
                          <p className="text-[10px] opacity-90">{banner.subtitle}</p>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="px-3 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
                    {quickLinks.map((link) => {
                      const Icon = link.icon || Tag;
                      return (
                        <Link
                          key={link.label}
                          to={link.href}
                          onClick={() => { setMobileMenuOpen(false); setMobileCatStack([]); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border shrink-0"
                          style={{
                            borderColor: 'rgb(var(--color-border))',
                            color: 'rgb(var(--color-text-secondary))',
                          }}
                        >
                          <Icon className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-500))' }} />
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>

                  {/* Categories */}
                  <div className="border-t" style={{ borderColor: 'rgb(var(--color-divider))' }}>
                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between" style={{ color: 'rgb(var(--color-text-disabled))' }}>
                      Browse Categories
                      <span className="text-[9px] font-normal">Tap to explore</span>
                    </p>
                    {categories.slice(0, 15).map((cat: Category) => {
                      const hasChildren = cat.children && cat.children.length > 0;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            if (!hasChildren) {
                              navigate(`/products?categoryId=${cat.id}`);
                              setMobileMenuOpen(false);
                            } else {
                              pushMobileCatStack(cat);
                            }
                          }}
                          className="flex items-center justify-between w-full px-3 py-2.5 text-sm transition-colors"
                          style={{ color: 'rgb(var(--color-text-secondary))' }}
                        >
                          <span className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                            {cat.name}
                          </span>
                          {hasChildren && (
                            <ChevronRight className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-disabled))' }} />
                          )}
                        </button>
                      );
                    })}
                    <Link
                      to="/products"
                      onClick={() => { setMobileMenuOpen(false); setMobileCatStack([]); }}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium ml-6"
                      style={{ color: 'rgb(var(--color-primary-600))' }}
                    >
                      View All Categories
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Main Links */}
                  <div className="border-t" style={{ borderColor: 'rgb(var(--color-divider))' }}>
                    <Link
                      to="/"
                      onClick={() => { setMobileMenuOpen(false); setMobileCatStack([]); }}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
                      style={{ color: 'rgb(var(--color-text-secondary))' }}
                    >
                      <Home className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      Home
                    </Link>
                    <Link
                      to={primaryCenter.href}
                      onClick={() => { setMobileMenuOpen(false); setMobileCatStack([]); }}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
                      style={{ color: 'rgb(var(--color-text-secondary))' }}
                    >
                      <PrimaryCenterIcon className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      {primaryCenter.label}
                    </Link>
                    <Link
                      to="/wishlist"
                      onClick={() => { setMobileMenuOpen(false); setMobileCatStack([]); }}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
                      style={{ color: 'rgb(var(--color-text-secondary))' }}
                    >
                      <Heart className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      Wishlist
                      {wishlistCount > 0 && (
                        <span
                          className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: 'rgb(var(--color-danger))' }}
                        >
                          {wishlistCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/cart"
                      onClick={() => { setMobileMenuOpen(false); setMobileCatStack([]); }}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
                      style={{ color: 'rgb(var(--color-text-secondary))' }}
                    >
                      <ShoppingCart className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      Cart
                      {cartCount > 0 && (
                        <span
                          className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
                        >
                          {cartCount}
                        </span>
                      )}
                    </Link>
                  </div>
                </>
              ) : (
                /* Category drill-down level */
                <div className="py-2">
                  <div className="space-y-0.5">
                    {renderMobileCategoryTree(currentStackCat ? currentStackCat.children || [] : categories)}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t px-3 py-3" style={{ borderColor: 'rgb(var(--color-divider))' }}>
              <button
                onClick={togglePrefTheme}
                className="flex items-center justify-between w-full py-2 px-1 rounded-lg text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                <span className="flex items-center gap-2">
                  {prefTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  Theme
                </span>
                <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {prefTheme === 'dark' ? 'Light mode' : 'Dark mode'}
                </span>
              </button>
              {!isAuthenticated && (
                <div className="flex gap-2 mt-2">
                  <Link
                    to="/login"
                    onClick={() => { setMobileMenuOpen(false); setMobileCatStack([]); }}
                    className="flex-1 text-center py-2 rounded-lg text-sm font-medium border transition-colors"
                    style={{ borderColor: 'rgb(var(--color-border-strong))', color: 'rgb(var(--color-text-secondary))' }}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => { setMobileMenuOpen(false); setMobileCatStack([]); }}
                    className="flex-1 text-center py-2 rounded-lg text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}