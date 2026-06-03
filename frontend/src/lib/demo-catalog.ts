type DemoProductQuery = {
  page?: string | number;
  limit?: string | number;
  search?: string;
  categoryId?: string;
  sellerId?: string;
  brandId?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  minRating?: string | number;
  inStock?: string | boolean;
  sortBy?: string;
  sortOrder?: string;
  excludeId?: string;
};

const demoSellers = [
  {
    id: 'northstar-supply',
    storeName: 'Northstar Supply',
    storeSlug: 'northstar-supply',
    storeDescription: 'Verified electronics and gadget supplier.',
    storeLocation: 'Dar es Salaam',
    isVerified: true,
    _count: { products: 3 },
  },
  {
    id: 'harbor-goods',
    storeName: 'Harbor Goods',
    storeSlug: 'harbor-goods',
    storeDescription: 'Retail-ready fashion, office, and lifestyle goods.',
    storeLocation: 'Zanzibar',
    isVerified: true,
    _count: { products: 3 },
  },
  {
    id: 'atlas-home',
    storeName: 'Atlas Home',
    storeSlug: 'atlas-home',
    storeDescription: 'Home, kitchen, and beauty catalog for growing stores.',
    storeLocation: 'Arusha',
    isVerified: true,
    _count: { products: 2 },
  },
];

const demoBrands = [
  { id: 'aurora', name: 'Aurora' },
  { id: 'nimbus', name: 'Nimbus' },
  { id: 'terra', name: 'Terra' },
  { id: 'pulse', name: 'Pulse' },
];

const demoCategories = [
  {
    id: 'electronics',
    name: 'Electronics',
    description: 'Devices, audio, and smart accessories',
    _count: { products: 3 },
  },
  {
    id: 'fashion',
    name: 'Fashion',
    description: 'Footwear, apparel, and everyday essentials',
    _count: { products: 2 },
  },
  {
    id: 'home',
    name: 'Home',
    description: 'Kitchen, living, and home improvement',
    _count: { products: 2 },
  },
  {
    id: 'beauty',
    name: 'Beauty',
    description: 'Skincare and grooming sets',
    _count: { products: 1 },
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Office and supplier-ready goods',
    _count: { products: 1 },
  },
];

const demoProducts = [
  {
    id: 'demo-headphones',
    slug: 'wireless-studio-headphones',
    title: 'Wireless Studio Headphones',
    description:
      'Noise-isolating Bluetooth headphones with a soft travel case, long battery life, and retail-ready packaging.',
    basePrice: 155000,
    discountPrice: 129000,
    categoryId: 'electronics',
    brandId: 'pulse',
    rating: 4.8,
    reviewCount: 326,
    totalSales: 1380,
    createdAt: '2026-05-28T08:00:00.000Z',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    seller: demoSellers[0],
    variants: [{ id: 'demo-headphones-black', sku: 'HP-BLK', stock: 420 }],
    specifications: JSON.stringify({
      battery: '40 hours',
      packaging: 'Retail box',
      warranty: '12 months',
    }),
  },
  {
    id: 'demo-smartwatch',
    slug: 'amoled-fitness-smartwatch',
    title: 'AMOLED Fitness Smartwatch',
    description:
      'Water-resistant smartwatch with heart-rate tracking, message alerts, and interchangeable straps.',
    basePrice: 118000,
    discountPrice: 99000,
    categoryId: 'electronics',
    brandId: 'aurora',
    rating: 4.6,
    reviewCount: 184,
    totalSales: 910,
    createdAt: '2026-05-29T09:30:00.000Z',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    seller: demoSellers[0],
    variants: [{ id: 'demo-smartwatch-midnight', sku: 'SW-MID', stock: 265 }],
    specifications: JSON.stringify({
      display: 'AMOLED',
      waterproof: 'IP68',
      strap: 'Silicone',
    }),
  },
  {
    id: 'demo-sneakers',
    slug: 'lightweight-knit-sneakers',
    title: 'Lightweight Knit Sneakers',
    description:
      'Breathable everyday sneakers with cushioned soles, neutral colorways, and size runs ready for retail.',
    basePrice: 94000,
    discountPrice: 79000,
    categoryId: 'fashion',
    brandId: 'nimbus',
    rating: 4.7,
    reviewCount: 412,
    totalSales: 2040,
    createdAt: '2026-05-30T11:20:00.000Z',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    seller: demoSellers[1],
    variants: [{ id: 'demo-sneakers-42', sku: 'SN-42', stock: 610 }],
    specifications: JSON.stringify({
      material: 'Knit textile',
      sizes: '38-45',
      packaging: 'Branded box',
    }),
  },
  {
    id: 'demo-desk-kit',
    slug: 'minimal-desk-organizer-kit',
    title: 'Minimal Desk Organizer Kit',
    description:
      'Modular desktop organizer with trays for stationery, phone, notes, and compact accessories.',
    basePrice: 65000,
    discountPrice: null,
    categoryId: 'business',
    brandId: 'terra',
    rating: 4.5,
    reviewCount: 97,
    totalSales: 740,
    createdAt: '2026-05-24T10:00:00.000Z',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    seller: demoSellers[1],
    variants: [{ id: 'demo-desk-kit-oak', sku: 'DK-OAK', stock: 350 }],
    specifications: JSON.stringify({
      material: 'Bamboo composite',
      pieces: '5',
      use: 'Office desk',
    }),
  },
  {
    id: 'demo-cookware',
    slug: 'ceramic-nonstick-cookware-set',
    title: 'Ceramic Nonstick Cookware Set',
    description:
      'Retail boxed cookware set with ceramic coating, induction-ready bases, and soft-touch handles.',
    basePrice: 205000,
    discountPrice: 179000,
    categoryId: 'home',
    brandId: 'terra',
    rating: 4.9,
    reviewCount: 268,
    totalSales: 1180,
    createdAt: '2026-05-26T13:10:00.000Z',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    seller: demoSellers[2],
    variants: [{ id: 'demo-cookware-8pc', sku: 'CW-8PC', stock: 190 }],
    specifications: JSON.stringify({
      pieces: '8',
      coating: 'Ceramic',
      compatibility: 'Gas, electric, induction',
    }),
  },
  {
    id: 'demo-skincare',
    slug: 'hydrating-skincare-starter-set',
    title: 'Hydrating Skincare Starter Set',
    description:
      'Three-piece skincare kit with cleanser, serum, and moisturizer in shelf-ready packaging.',
    basePrice: 84000,
    discountPrice: 69000,
    categoryId: 'beauty',
    brandId: 'aurora',
    rating: 4.8,
    reviewCount: 355,
    totalSales: 1630,
    createdAt: '2026-05-31T15:45:00.000Z',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    seller: demoSellers[2],
    variants: [{ id: 'demo-skincare-kit', sku: 'SK-KIT', stock: 520 }],
    specifications: JSON.stringify({
      pieces: '3',
      skinType: 'All skin types',
      packaging: 'Shelf-ready carton',
    }),
  },
  {
    id: 'demo-backpack',
    slug: 'weatherproof-commuter-backpack',
    title: 'Weatherproof Commuter Backpack',
    description:
      'Structured commuter backpack with padded laptop storage, water-resistant shell, and travel straps.',
    basePrice: 122000,
    discountPrice: null,
    categoryId: 'fashion',
    brandId: 'nimbus',
    rating: 4.7,
    reviewCount: 143,
    totalSales: 860,
    createdAt: '2026-05-23T12:00:00.000Z',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    seller: demoSellers[1],
    variants: [{ id: 'demo-backpack-charcoal', sku: 'BP-CHR', stock: 280 }],
    specifications: JSON.stringify({
      laptop: 'Up to 15 inch',
      shell: 'Water-resistant',
      capacity: '24L',
    }),
  },
  {
    id: 'demo-lamp',
    slug: 'led-task-lamp-wireless-charger',
    title: 'LED Task Lamp With Wireless Charger',
    description:
      'Adjustable desk lamp with dimmable light, USB-C input, and integrated wireless charging pad.',
    basePrice: 97000,
    discountPrice: 83000,
    categoryId: 'home',
    brandId: 'pulse',
    rating: 4.6,
    reviewCount: 121,
    totalSales: 690,
    createdAt: '2026-05-27T07:25:00.000Z',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    seller: demoSellers[0],
    variants: [{ id: 'demo-lamp-white', sku: 'LP-WHT', stock: 240 }],
    specifications: JSON.stringify({
      brightness: '5 levels',
      charging: 'Qi wireless',
      input: 'USB-C',
    }),
  },
];

function numberValue(value: unknown, fallback: number) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function matchesText(product: any, text: string) {
  const q = text.trim().toLowerCase();
  if (!q) return true;
  return [
    product.title,
    product.description,
    product.seller?.storeName,
    demoBrands.find((brand) => brand.id === product.brandId)?.name,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

function sortProducts(products: any[], sortBy?: string, sortOrder?: string) {
  const direction = sortOrder === 'asc' ? 1 : -1;
  const sorted = [...products];
  sorted.sort((a, b) => {
    if (sortBy === 'basePrice') return (a.basePrice - b.basePrice) * direction;
    if (sortBy === 'rating') return ((a.rating || 0) - (b.rating || 0)) * direction;
    if (sortBy === 'totalSales' || sortBy === 'soldCount') {
      return ((a.totalSales || 0) - (b.totalSales || 0)) * direction;
    }
    if (sortBy === 'discountPrice') {
      const aDiscount = a.discountPrice ? a.basePrice - a.discountPrice : 0;
      const bDiscount = b.discountPrice ? b.basePrice - b.discountPrice : 0;
      return (aDiscount - bDiscount) * direction;
    }
    return new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime()
      ? direction
      : -direction;
  });
  return sorted;
}

export function demoProductsResponse(params: DemoProductQuery = {}) {
  const page = Math.max(1, numberValue(params.page, 1));
  const limit = Math.max(1, numberValue(params.limit, 20));
  const minPrice = params.minPrice ? numberValue(params.minPrice, 0) : 0;
  const maxPrice = params.maxPrice ? numberValue(params.maxPrice, Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
  const minRating = params.minRating ? numberValue(params.minRating, 0) : 0;

  let products = demoProducts.filter((product) => {
    const price = product.discountPrice || product.basePrice;
    const stock = (product.variants || []).reduce((sum: number, variant: any) => sum + Number(variant.stock || 0), 0);
    return (
      (!params.excludeId || product.id !== params.excludeId) &&
      (!params.search || matchesText(product, params.search)) &&
      (!params.categoryId || product.categoryId === params.categoryId) &&
      (!params.sellerId || product.seller.id === params.sellerId) &&
      (!params.brandId || product.brandId === params.brandId) &&
      price >= minPrice &&
      price <= maxPrice &&
      (product.rating || 0) >= minRating &&
      (params.inStock !== 'true' || stock > 0)
    );
  });

  products = sortProducts(products, params.sortBy, params.sortOrder);

  const total = products.length;
  const start = (page - 1) * limit;
  const paged = products.slice(start, start + limit);

  return {
    success: true,
    data: paged,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    demoMode: true,
  };
}

export function demoFeaturedProductsResponse() {
  return {
    success: true,
    data: demoProducts.filter((product) => product.rating >= 4.7).slice(0, 8),
    demoMode: true,
  };
}

export function demoProductResponse(idOrSlug: string) {
  const product = demoProducts.find((item) => item.id === idOrSlug || item.slug === idOrSlug);
  return {
    success: Boolean(product),
    data: product || null,
    demoMode: true,
  };
}

export function demoCategoriesResponse() {
  return { success: true, data: demoCategories, demoMode: true };
}

export function demoBrandsResponse() {
  return { success: true, data: demoBrands, demoMode: true };
}

export function demoSellersResponse(params: { search?: string; limit?: string | number } = {}) {
  const limit = numberValue(params.limit, demoSellers.length);
  const search = params.search?.trim().toLowerCase();
  const sellers = demoSellers
    .filter((seller) => {
      if (!search) return true;
      return [seller.storeName, seller.storeDescription, seller.storeLocation]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    })
    .slice(0, limit);
  return { success: true, data: sellers, demoMode: true };
}

export function demoSellerStoreResponse(slug: string) {
  const seller = demoSellers.find((item) => item.storeSlug === slug || item.id === slug);
  return {
    success: Boolean(seller),
    data: seller || null,
    demoMode: true,
  };
}

export function demoPublicConfigResponse() {
  return {
    success: true,
    data: {
      'homepage.content': {
        heroTitle: 'Source Smarter, Sell Faster',
        heroSubtitle: 'Browse verified products, compare suppliers, and run your marketplace across web and mobile.',
        heroEyebrow: 'MarketPlace Online',
        promoBanners: [
          { title: 'Launch Week Deals', text: 'Featured wholesale offers refreshed for online testing.', href: '/products' },
          { title: 'Verified Sellers', text: 'Browse trusted suppliers with ready-to-ship inventory.', href: '/products' },
          { title: 'Mobile Ready', text: 'Flutter builds cover Android, iOS, and macOS.', href: '/products' },
        ],
      },
      'marketplace.navigation': {
        trustBadges: ['Verified sellers', 'Secure checkout path', 'Web and mobile ready'],
      },
      'marketplace.catalog': {
        categoriesEnabled: true,
        sellersEnabled: true,
        bestSellersEnabled: true,
        newArrivalsEnabled: true,
      },
      'site.identity': {
        name: 'MarketPlace',
        tagline: 'Source smarter, sell faster',
      },
    },
    demoMode: true,
  };
}

export function demoCurrencySettingsResponse() {
  return {
    success: true,
    data: {
      baseCurrency: 'TZS',
      currencies: ['TZS', 'USD'],
      roundingDecimals: 0,
      symbolPosition: 'before',
      thousandSeparator: ',',
      decimalSeparator: '.',
      provider: 'demo',
      geoDetectionEnabled: false,
    },
    demoMode: true,
  };
}

export function demoCurrencyRatesResponse() {
  return {
    success: true,
    data: {
      base: 'TZS',
      rates: { TZS: 1, USD: 0.00039 },
      updatedAt: new Date().toISOString(),
    },
    demoMode: true,
  };
}

export function demoCurrenciesInfoResponse() {
  return {
    success: true,
    data: [
      { code: 'TZS', symbol: 'TZS', name: 'Tanzanian Shilling' },
      { code: 'USD', symbol: '$', name: 'US Dollar' },
    ],
    demoMode: true,
  };
}

export function demoDetectedCurrencyResponse() {
  return {
    success: true,
    data: { currency: 'TZS', country: 'TZ' },
    demoMode: true,
  };
}
