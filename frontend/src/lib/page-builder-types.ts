// ── Layout JSON Tree Schema ──
// Every node in the layout tree
export interface LayoutBlock {
  id: string;
  type: string;                // "section", "column", "hero", "product_grid", "container", etc.
  settings: Record<string, any>; // visual modifiers + data-query modifiers
  children: LayoutBlock[];      // nested children (for layout containers like columns)
}

// A full page layout stored as a JSON tree
export interface PageLayoutJson {
  id: string;                  // maps to the DB PageLayout.id
  slug: string;
  title: string;
  description: string | null;
  path: string | null;
  pageType: string;
  isSystem: boolean;
  isPublished: boolean;
  isActive: boolean;
  tree: LayoutBlock[];         // the root-level tree (array of top-level blocks)
  metadata: Record<string, any> | null;
  themeOverrides: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

// ── Component Type Registry (kept for backward compat) ──
export interface ComponentDefinition {
  id: string;
  type: string;
  label: string;
  description: string | null;
  category: string;
  icon: string | null;
  defaultProps: Record<string, any>;
  schema: Record<string, any> | null;
  isSystem: boolean;
}

// ── Page Section (kept for backward compat with DB) ──
export interface PageSection {
  id: string;
  layoutId: string;
  componentType: string;
  title: string | null;
  sortOrder: number;
  isVisible: boolean;
  visibilityRules: any | null;
  props: Record<string, any>;
  style: Record<string, any> | null;
  cssClass: string | null;
  containerWidth: string;
  backgroundColor: string | null;
  paddingTop: string | null;
  paddingBottom: string | null;
  marginTop: string | null;
  marginBottom: string | null;
  hideOnMobile: boolean;
  hideOnTablet: boolean;
  hideOnDesktop: boolean;
  animation: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Page Layout (DB model, kept for backward compat) ──
export interface PageLayout {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  path: string | null;
  pageType: string;
  isSystem: boolean;
  isPublished: boolean;
  isActive: boolean;
  metadata: Record<string, any> | null;
  themeOverrides: Record<string, any> | null;
  sections: PageSection[];
  _count?: { sections: number };
  createdAt: string;
  updatedAt: string;
}

// ── Builder State ──
export type BuilderMode = 'edit' | 'preview' | 'published';

export interface BuilderState {
  layout: PageLayoutJson | null;
  selectedBlockId: string | null;
  mode: BuilderMode;
  isDirty: boolean;
  componentTypes: ComponentDefinition[];
}

// ── Component Renderer Props ──
export interface BlockRendererProps {
  block: LayoutBlock;
  componentDef?: ComponentDefinition;
  layout: PageLayoutJson;
  onChange?: (blockId: string, settings: Record<string, any>) => void;
  isEditing?: boolean;
  isSelected?: boolean;
  onSelect?: (blockId: string) => void;
  onDelete?: (blockId: string) => void;
  onDuplicate?: (blockId: string) => void;
  depth?: number;
}

// ── Expanded Field Schema types for zero-code visual controls ──
export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'textarea'
  | 'image'
  | 'video'
  | 'icon'
  | 'richtext'
  | 'link'
  | 'repeater'
  | 'dimension'
  | 'border'
  | 'typography'
  | 'dataSource'
  | 'json'; // kept only for backward compat - should not be exposed to UI

// ── Component Field Schema (for auto-generating inspector controls) ──
export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  placeholder?: string;
  description?: string;
  group?: string; // for grouping fields in tabs
  // Repeater-specific: template for items
  itemFields?: FieldSchema[];
  // Data source specific
  dataSourceType?: 'products' | 'categories' | 'blogs' | 'sellers' | 'collections';
}

// Component schema helpers for the inspector panel
export const COMPONENT_FIELD_SCHEMAS: Record<string, FieldSchema[]> = {
  hero: [
    { key: 'title', label: 'Title', type: 'richtext', defaultValue: 'Welcome', group: 'Content' },
    { key: 'subtitle', label: 'Subtitle', type: 'richtext', defaultValue: 'Shop the best deals', group: 'Content' },
    { key: 'eyebrow', label: 'Eyebrow Text', type: 'text', defaultValue: '', group: 'Content' },
    { key: 'searchPlaceholder', label: 'Search Placeholder', type: 'text', defaultValue: '', group: 'Content' },
    { key: 'imageUrl', label: 'Background Image', type: 'image', defaultValue: '', group: 'Media' },
    { key: 'overlayOpacity', label: 'Overlay Opacity', type: 'number', defaultValue: 0.3, group: 'Style' },
    { key: 'alignment', label: 'Alignment', type: 'select', defaultValue: 'center', options: [{ label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' }], group: 'Style' },
    { key: 'height', label: 'Height', type: 'select', defaultValue: 'large', options: [{ label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' }], group: 'Style' },
  ],
  product_grid: [
    { key: 'title', label: 'Title', type: 'richtext', defaultValue: 'Featured Products', group: 'Content' },
    { key: 'columns', label: 'Columns', type: 'number', defaultValue: 4, group: 'Layout' },
    { key: 'rows', label: 'Rows', type: 'number', defaultValue: 1, group: 'Layout' },
    { key: 'source', label: 'Product Source', type: 'dataSource', defaultValue: 'featured', dataSourceType: 'products', group: 'Data' },
    { key: 'showPagination', label: 'Show Pagination', type: 'boolean', defaultValue: false, group: 'Layout' },
    { key: 'showViewAll', label: 'Show View All Link', type: 'boolean', defaultValue: true, group: 'Layout' },
    { key: 'showQuickActions', label: 'Show Quick Actions', type: 'boolean', defaultValue: true, group: 'Behavior' },
    { key: 'imageAnimation', label: 'Image Animation', type: 'select', defaultValue: 'slide', options: [{ label: 'Slide on hover', value: 'slide' }, { label: 'Zoom only', value: 'zoom' }, { label: 'None', value: 'none' }], group: 'Behavior' },
  ],
  text_block: [
    { key: 'content', label: 'Content', type: 'richtext', defaultValue: '<p>Your content here</p>', group: 'Content' },
    { key: 'alignment', label: 'Alignment', type: 'select', defaultValue: 'left', options: [{ label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' }], group: 'Style' },
  ],
  image_block: [
    { key: 'src', label: 'Image', type: 'image', defaultValue: '', group: 'Content', description: 'Upload or select an image' },
    { key: 'alt', label: 'Alt Text', type: 'text', defaultValue: 'Image description', group: 'Content' },
    { key: 'caption', label: 'Caption', type: 'richtext', defaultValue: '', group: 'Content' },
    { key: 'link', label: 'Link URL', type: 'link', defaultValue: '', group: 'Content' },
    { key: 'borderRadius', label: 'Border Radius', type: 'select', defaultValue: 'rounded-lg', options: [{ label: 'None', value: 'rounded-none' }, { label: 'Small', value: 'rounded' }, { label: 'Medium', value: 'rounded-lg' }, { label: 'Full', value: 'rounded-full' }], group: 'Style' },
  ],
  category_rail: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Shop by Category', group: 'Content' },
    { key: 'limit', label: 'Max Categories', type: 'number', defaultValue: 8, group: 'Data' },
    { key: 'showImages', label: 'Show Images', type: 'boolean', defaultValue: true, group: 'Layout' },
  ],
  newsletter: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Stay Updated', group: 'Content' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'Get the latest deals', group: 'Content' },
    { key: 'buttonText', label: 'Button Text', type: 'text', defaultValue: 'Subscribe', group: 'Content' },
    { key: 'placeholder', label: 'Input Placeholder', type: 'text', defaultValue: 'Your email', group: 'Content' },
    { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: 'var(--color-surface-muted)', group: 'Style' },
  ],
  divider: [
    { key: 'height', label: 'Height', type: 'dimension', defaultValue: '1px', group: 'Style' },
    { key: 'color', label: 'Color', type: 'color', defaultValue: 'var(--color-border)', group: 'Style' },
    { key: 'marginY', label: 'Margin Y', type: 'dimension', defaultValue: '2rem', group: 'Spacing' },
  ],
  spacer: [
    { key: 'height', label: 'Height', type: 'dimension', defaultValue: '2rem', group: 'Spacing' },
  ],
  banner: [
    { key: 'title', label: 'Title', type: 'richtext', defaultValue: 'Special Offer', group: 'Content' },
    { key: 'text', label: 'Text', type: 'richtext', defaultValue: 'Limited time deal', group: 'Content' },
    { key: 'link', label: 'Link URL', type: 'link', defaultValue: '/products', group: 'Content' },
    { key: 'imageUrl', label: 'Image', type: 'image', defaultValue: '', group: 'Media' },
    { key: 'buttonText', label: 'Button Text', type: 'text', defaultValue: 'Shop Now', group: 'Content' },
    { key: 'layout', label: 'Layout Style', type: 'select', defaultValue: 'side_by_side', options: [{ label: 'Side by Side', value: 'side_by_side' }, { label: 'Image Background', value: 'image_background' }], group: 'Layout' },
  ],
  trust_cards: [
    { key: 'cards', label: 'Trust Badges', type: 'repeater', defaultValue: [
      { icon: 'Truck', title: 'Fast Shipping', text: 'Delivery in 3-5 days' },
      { icon: 'Shield', title: 'Secure Payments', text: 'Protected transactions' },
      { icon: 'Clock', title: '24/7 Support', text: 'Always here to help' },
    ], group: 'Content', itemFields: [
      { key: 'icon', label: 'Icon', type: 'icon', defaultValue: 'Shield', group: 'Content' },
      { key: 'title', label: 'Title', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'text', label: 'Description', type: 'text', defaultValue: '', group: 'Content' },
    ]},
  ],
  cta_cards: [
    { key: 'cards', label: 'CTA Cards', type: 'repeater', defaultValue: [
      { title: 'Start Selling', text: 'Become a seller today', buttonText: 'Get Started', link: '/seller/register' },
      { title: 'View Catalog', text: 'Browse our products', buttonText: 'Explore', link: '/products' },
    ], group: 'Content', itemFields: [
      { key: 'title', label: 'Title', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'text', label: 'Description', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'buttonText', label: 'Button Text', type: 'text', defaultValue: 'Learn More', group: 'Content' },
      { key: 'link', label: 'Link', type: 'link', defaultValue: '', group: 'Content' },
      { key: 'imageUrl', label: 'Image', type: 'image', defaultValue: '', group: 'Media' },
    ]},
  ],
  columns: [
    { key: 'columnCount', label: 'Column Slots', type: 'number', defaultValue: 2, group: 'Layout' },
    { key: 'desktopColumns', label: 'Desktop Columns', type: 'number', defaultValue: 2, group: 'Layout' },
    { key: 'tabletColumns', label: 'Tablet Columns', type: 'number', defaultValue: 2, group: 'Layout' },
    { key: 'mobileColumns', label: 'Mobile Columns', type: 'number', defaultValue: 1, group: 'Layout' },
    { key: 'gap', label: 'Gap', type: 'dimension', defaultValue: '1.5rem', group: 'Layout' },
    { key: 'verticalAlign', label: 'Vertical Align', type: 'select', defaultValue: 'stretch', options: [{ label: 'Top', value: 'start' }, { label: 'Center', value: 'center' }, { label: 'Bottom', value: 'end' }, { label: 'Stretch', value: 'stretch' }], group: 'Layout' },
    { key: 'minHeight', label: 'Min Height', type: 'dimension', defaultValue: '120px', group: 'Style' },
    { key: 'padding', label: 'Padding', type: 'dimension', defaultValue: '0', group: 'Spacing' },
    { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: '', group: 'Style' },
  ],
  container: [
    { key: 'maxWidth', label: 'Max Width', type: 'dimension', defaultValue: '1280px', group: 'Layout' },
    { key: 'paddingX', label: 'Padding X', type: 'dimension', defaultValue: '1rem', group: 'Spacing' },
    { key: 'paddingY', label: 'Padding Y', type: 'dimension', defaultValue: '0', group: 'Spacing' },
  ],
  featured_products: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Featured', group: 'Content' },
    { key: 'limit', label: 'Number of Products', type: 'number', defaultValue: 8, group: 'Data' },
    { key: 'source', label: 'Product Source', type: 'dataSource', defaultValue: 'featured', dataSourceType: 'products', group: 'Data' },
  ],
  deal_rail: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Hot Deals', group: 'Content' },
    { key: 'limit', label: 'Limit', type: 'number', defaultValue: 10, group: 'Data' },
    { key: 'minDiscount', label: 'Min Discount %', type: 'number', defaultValue: 20, group: 'Data' },
  ],
  promo_banners: [
    { key: 'banners', label: 'Promo Banners', type: 'repeater', defaultValue: [
      { title: 'Electronics', text: 'Great deals', link: '/products?category=electronics', buttonText: 'Shop Now' },
      { title: 'Fashion', text: 'New arrivals', link: '/products?category=fashion', buttonText: 'Shop Now' },
    ], group: 'Content', itemFields: [
      { key: 'title', label: 'Title', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'text', label: 'Description', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'link', label: 'Link', type: 'link', defaultValue: '', group: 'Content' },
      { key: 'buttonText', label: 'Button Text', type: 'text', defaultValue: 'Shop Now', group: 'Content' },
      { key: 'imageUrl', label: 'Background Image', type: 'image', defaultValue: '', group: 'Media' },
      { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: '', group: 'Style' },
    ]},
  ],
  seller_strip: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Trusted Sellers', group: 'Content' },
    { key: 'limit', label: 'Number of Sellers', type: 'number', defaultValue: 8, group: 'Data' },
    { key: 'source', label: 'Source', type: 'dataSource', defaultValue: 'top_rated', dataSourceType: 'sellers', group: 'Data' },
  ],
  video_block: [
    { key: 'url', label: 'Video URL', type: 'video', defaultValue: '', group: 'Content' },
    { key: 'autoplay', label: 'Autoplay', type: 'boolean', defaultValue: false, group: 'Behavior' },
    { key: 'controls', label: 'Show Controls', type: 'boolean', defaultValue: true, group: 'Behavior' },
    { key: 'loop', label: 'Loop', type: 'boolean', defaultValue: false, group: 'Behavior' },
  ],
  custom_html: [
    { key: 'html', label: 'Custom HTML', type: 'textarea', defaultValue: '<div>Custom content</div>', group: 'Content', description: 'Advanced: HTML code' },
  ],
  tabbed_showcase: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Discover', group: 'Content' },
    { key: 'tabs', label: 'Tabs', type: 'repeater', defaultValue: [
      { label: 'Featured', source: 'featured' },
      { label: 'Best Sellers', source: 'best_sellers' },
    ], group: 'Content', itemFields: [
      { key: 'label', label: 'Tab Label', type: 'text', defaultValue: 'Tab', group: 'Content' },
      { key: 'source', label: 'Source', type: 'dataSource', defaultValue: 'featured', dataSourceType: 'products', group: 'Data' },
      { key: 'icon', label: 'Icon', type: 'icon', defaultValue: '', group: 'Content' },
    ]},
  ],
  category_scroller: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Categories', group: 'Content' },
    { key: 'limit', label: 'Number of Categories', type: 'number', defaultValue: 12, group: 'Data' },
    { key: 'layout', label: 'Layout', type: 'select', defaultValue: 'horizontal', options: [{ label: 'Horizontal', value: 'horizontal' }, { label: 'Vertical', value: 'vertical' }], group: 'Layout' },
  ],
  product_carousel: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Best Sellers', group: 'Content' },
    { key: 'source', label: 'Source', type: 'dataSource', defaultValue: 'best_sellers', dataSourceType: 'products', group: 'Data' },
    { key: 'limit', label: 'Limit', type: 'number', defaultValue: 10, group: 'Data' },
    { key: 'autoplay', label: 'Autoplay', type: 'boolean', defaultValue: false, group: 'Behavior' },
  ],
};

// Extended block schemas with visual controls
export const SIMPLE_BLOCK_SCHEMAS: Record<string, { icon: string; fields: FieldSchema[] }> = {
  image_gallery: { icon: 'Grid', fields: [
    { key: 'title', label: 'Title', type: 'text', group: 'Content' },
    { key: 'images', label: 'Images', type: 'repeater', defaultValue: [], group: 'Media', itemFields: [
      { key: 'src', label: 'Image', type: 'image', defaultValue: '', group: 'Media' },
      { key: 'alt', label: 'Alt Text', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'caption', label: 'Caption', type: 'text', defaultValue: '', group: 'Content' },
    ]},
    { key: 'columns', label: 'Columns', type: 'number', defaultValue: 3, group: 'Layout' },
  ]},
  video_player: { icon: 'Video', fields: [
    { key: 'videoUrl', label: 'Video URL', type: 'video', group: 'Media' },
    { key: 'poster', label: 'Poster Image', type: 'image', group: 'Media' },
    { key: 'controls', label: 'Show Controls', type: 'boolean', defaultValue: true, group: 'Behavior' },
    { key: 'autoplay', label: 'Autoplay', type: 'boolean', defaultValue: false, group: 'Behavior' },
  ]},
  logo_cloud: { icon: 'Store', fields: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Trusted By', group: 'Content' },
    { key: 'logos', label: 'Logos', type: 'repeater', defaultValue: [], group: 'Media', itemFields: [
      { key: 'src', label: 'Logo Image', type: 'image', defaultValue: '', group: 'Media' },
      { key: 'alt', label: 'Brand Name', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'link', label: 'Link', type: 'link', defaultValue: '', group: 'Content' },
    ]},
    { key: 'columns', label: 'Columns', type: 'number', defaultValue: 4, group: 'Layout' },
  ]},
  icon_grid: { icon: 'Grid', fields: [
    { key: 'title', label: 'Title', type: 'text', group: 'Content' },
    { key: 'icons', label: 'Feature Icons', type: 'repeater', defaultValue: [], group: 'Content', itemFields: [
      { key: 'icon', label: 'Icon', type: 'icon', defaultValue: 'Star', group: 'Content' },
      { key: 'title', label: 'Title', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'text', label: 'Description', type: 'text', defaultValue: '', group: 'Content' },
    ]},
    { key: 'columns', label: 'Columns', type: 'number', defaultValue: 4, group: 'Layout' },
  ]},
  parallax_banner: { icon: 'Image', fields: [
    { key: 'title', label: 'Title', type: 'text', group: 'Content' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', group: 'Content' },
    { key: 'backgroundImage', label: 'Background Image', type: 'image', group: 'Media' },
    { key: 'height', label: 'Height', type: 'dimension', defaultValue: '400px', group: 'Style' },
    { key: 'overlayColor', label: 'Overlay Color', type: 'color', defaultValue: 'rgba(0,0,0,0.3)', group: 'Style' },
  ]},
  masonry_gallery: { icon: 'Columns', fields: [
    { key: 'title', label: 'Title', type: 'text', group: 'Content' },
    { key: 'images', label: 'Images', type: 'repeater', defaultValue: [], group: 'Media', itemFields: [
      { key: 'src', label: 'Image', type: 'image', defaultValue: '', group: 'Media' },
      { key: 'alt', label: 'Alt Text', type: 'text', defaultValue: '', group: 'Content' },
    ]},
    { key: 'columns', label: 'Columns', type: 'number', defaultValue: 3, group: 'Layout' },
  ]},
  before_after: { icon: 'Columns3', fields: [
    { key: 'beforeImage', label: 'Before Image', type: 'image', group: 'Media' },
    { key: 'afterImage', label: 'After Image', type: 'image', group: 'Media' },
    { key: 'beforeLabel', label: 'Before Label', type: 'text', group: 'Content' },
    { key: 'afterLabel', label: 'After Label', type: 'text', group: 'Content' },
  ]},
  lottie_animation: { icon: 'Play', fields: [
    { key: 'animationUrl', label: 'Animation URL', type: 'text', group: 'Media' },
    { key: 'loop', label: 'Loop', type: 'boolean', defaultValue: true, group: 'Behavior' },
    { key: 'autoplay', label: 'Autoplay', type: 'boolean', defaultValue: true, group: 'Behavior' },
  ]},
  social_feed: { icon: 'Layout', fields: [
    { key: 'platform', label: 'Platform', type: 'select', defaultValue: 'tiktok', options: [{ label: 'TikTok', value: 'tiktok' }, { label: 'Instagram', value: 'instagram' }, { label: 'X (Twitter)', value: 'x' }], group: 'Data' },
    { key: 'username', label: 'Username', type: 'text', group: 'Data' },
    { key: 'limit', label: 'Number of Posts', type: 'number', defaultValue: 8, group: 'Data' },
  ]},
  audio_player: { icon: 'Music', fields: [
    { key: 'audioUrl', label: 'Audio URL', type: 'text', group: 'Media' },
    { key: 'title', label: 'Title', type: 'text', group: 'Content' },
    { key: 'cover', label: 'Cover Image', type: 'image', group: 'Media' },
    { key: 'autoplay', label: 'Autoplay', type: 'boolean', defaultValue: false, group: 'Behavior' },
  ]},
  slideshow: { icon: 'Layout', fields: [
    { key: 'slides', label: 'Slides', type: 'repeater', defaultValue: [], group: 'Content', itemFields: [
      { key: 'title', label: 'Title', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'text', label: 'Description', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'image', label: 'Image', type: 'image', defaultValue: '', group: 'Media' },
      { key: 'link', label: 'Link', type: 'link', defaultValue: '', group: 'Content' },
      { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: '', group: 'Style' },
    ]},
    { key: 'autoplay', label: 'Autoplay', type: 'boolean', defaultValue: true, group: 'Behavior' },
    { key: 'interval', label: 'Interval (ms)', type: 'number', defaultValue: 5000, group: 'Behavior' },
  ]},
  product_comparison: { icon: 'Columns3', fields: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Compare Products', group: 'Content' },
    { key: 'products', label: 'Products', type: 'repeater', defaultValue: [], group: 'Data', itemFields: [
      { key: 'name', label: 'Product Name', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'price', label: 'Price', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'image', label: 'Image', type: 'image', defaultValue: '', group: 'Media' },
      { key: 'features', label: 'Features', type: 'text', defaultValue: '', group: 'Content' },
    ]},
    { key: 'columns', label: 'Columns', type: 'number', defaultValue: 3, group: 'Layout' },
  ]},
  recently_viewed: { icon: 'Clock', fields: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Recently Viewed', group: 'Content' },
    { key: 'limit', label: 'Limit', type: 'number', defaultValue: 8, group: 'Data' },
  ]},
  related_products: { icon: 'ChevronsLeftRight', fields: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'You May Also Like', group: 'Content' },
    { key: 'limit', label: 'Limit', type: 'number', defaultValue: 8, group: 'Data' },
  ]},
  faq_accordion: { icon: 'List', fields: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'FAQs', group: 'Content' },
    { key: 'items', label: 'FAQ Items', type: 'repeater', defaultValue: [{ question: 'Question', answer: 'Answer' }], group: 'Content', itemFields: [
      { key: 'question', label: 'Question', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'answer', label: 'Answer', type: 'richtext', defaultValue: '', group: 'Content' },
    ]},
    { key: 'allowMultiple', label: 'Allow Multiple Open', type: 'boolean', defaultValue: true, group: 'Behavior' },
  ]},
  pricing_table: { icon: 'DollarSign', fields: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Pricing', group: 'Content' },
    { key: 'plans', label: 'Plans', type: 'repeater', defaultValue: [{ name: 'Plan', price: '$0', features: ['Feature'], cta: 'Choose' }], group: 'Content', itemFields: [
      { key: 'name', label: 'Plan Name', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'price', label: 'Price', type: 'text', defaultValue: '$0', group: 'Content' },
      { key: 'features', label: 'Features (comma-separated)', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'buttonText', label: 'CTA Text', type: 'text', defaultValue: 'Choose Plan', group: 'Content' },
      { key: 'link', label: 'CTA Link', type: 'link', defaultValue: '', group: 'Content' },
      { key: 'featured', label: 'Featured Plan', type: 'boolean', defaultValue: false, group: 'Behavior' },
    ]},
  ]},
  timeline: { icon: 'ArrowUpDown', fields: [
    { key: 'title', label: 'Title', type: 'text', group: 'Content' },
    { key: 'items', label: 'Timeline Items', type: 'repeater', defaultValue: [{ date: '', title: 'Milestone', description: '' }], group: 'Content', itemFields: [
      { key: 'date', label: 'Date', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'title', label: 'Title', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'description', label: 'Description', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'icon', label: 'Icon', type: 'icon', defaultValue: '', group: 'Content' },
    ]},
    { key: 'orientation', label: 'Orientation', type: 'select', defaultValue: 'vertical', options: [{ label: 'Vertical', value: 'vertical' }, { label: 'Horizontal', value: 'horizontal' }], group: 'Layout' },
  ]},
  stats_counter: { icon: 'Check', fields: [
    { key: 'stats', label: 'Statistics', type: 'repeater', defaultValue: [{ value: 100, label: 'Happy customers' }], group: 'Content', itemFields: [
      { key: 'value', label: 'Value', type: 'number', defaultValue: 100, group: 'Content' },
      { key: 'label', label: 'Label', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'prefix', label: 'Prefix (e.g. $)', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'suffix', label: 'Suffix (e.g. +)', type: 'text', defaultValue: '', group: 'Content' },
    ]},
    { key: 'animation', label: 'Animated Counter', type: 'boolean', defaultValue: true, group: 'Behavior' },
    { key: 'columns', label: 'Columns', type: 'number', defaultValue: 4, group: 'Layout' },
  ]},
  testimonial_slider: { icon: 'Star', fields: [
    { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'What Customers Say', group: 'Content' },
    { key: 'testimonials', label: 'Testimonials', type: 'repeater', defaultValue: [{ name: '', role: '', text: '', avatar: '' }], group: 'Content', itemFields: [
      { key: 'name', label: 'Customer Name', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'role', label: 'Role / Company', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'text', label: 'Testimonial Text', type: 'textarea', defaultValue: '', group: 'Content' },
      { key: 'avatar', label: 'Avatar Image', type: 'image', defaultValue: '', group: 'Media' },
      { key: 'rating', label: 'Rating', type: 'number', defaultValue: 5, group: 'Content' },
    ]},
    { key: 'autoplay', label: 'Autoplay', type: 'boolean', defaultValue: true, group: 'Behavior' },
    { key: 'interval', label: 'Interval (ms)', type: 'number', defaultValue: 5000, group: 'Behavior' },
  ]},
  team_members: { icon: 'Users', fields: [
    { key: 'title', label: 'Section Title', type: 'text', group: 'Content' },
    { key: 'members', label: 'Team Members', type: 'repeater', defaultValue: [{ name: '', role: '', image: '', bio: '' }], group: 'Content', itemFields: [
      { key: 'name', label: 'Name', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'role', label: 'Role', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'image', label: 'Photo', type: 'image', defaultValue: '', group: 'Media' },
      { key: 'bio', label: 'Biography', type: 'textarea', defaultValue: '', group: 'Content' },
      { key: 'socialLink', label: 'Social Link', type: 'link', defaultValue: '', group: 'Content' },
    ]},
    { key: 'columns', label: 'Columns', type: 'number', defaultValue: 3, group: 'Layout' },
  ]},
  contact_form: { icon: 'Mail', fields: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Contact Us', group: 'Content' },
    { key: 'fields', label: 'Form Fields', type: 'repeater', defaultValue: [{ type: 'text', label: 'Name', required: true }, { type: 'email', label: 'Email', required: true }, { type: 'textarea', label: 'Message', required: true }], group: 'Content', itemFields: [
      { key: 'label', label: 'Field Label', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'type', label: 'Field Type', type: 'select', defaultValue: 'text', options: [{ label: 'Text', value: 'text' }, { label: 'Email', value: 'email' }, { label: 'Textarea', value: 'textarea' }, { label: 'Phone', value: 'tel' }], group: 'Content' },
      { key: 'required', label: 'Required', type: 'boolean', defaultValue: false, group: 'Behavior' },
      { key: 'placeholder', label: 'Placeholder', type: 'text', defaultValue: '', group: 'Content' },
    ]},
    { key: 'submitText', label: 'Submit Button Text', type: 'text', defaultValue: 'Send Message', group: 'Content' },
    { key: 'successMessage', label: 'Success Message', type: 'text', defaultValue: 'Thank you for your message!', group: 'Content' },
    { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: '', group: 'Style' },
  ]},
  map_block: { icon: 'MapPin', fields: [
    { key: 'address', label: 'Address', type: 'text', group: 'Content' },
    { key: 'lat', label: 'Latitude', type: 'number', group: 'Data' },
    { key: 'lng', label: 'Longitude', type: 'number', group: 'Data' },
    { key: 'zoom', label: 'Zoom Level', type: 'number', defaultValue: 14, group: 'Data' },
    { key: 'height', label: 'Map Height', type: 'dimension', defaultValue: '400px', group: 'Style' },
  ]},
  code_block: { icon: 'Code', fields: [
    { key: 'code', label: 'Code', type: 'textarea', group: 'Content', description: 'Paste your code here' },
    { key: 'language', label: 'Language', type: 'select', defaultValue: 'javascript', options: [{ label: 'JavaScript', value: 'javascript' }, { label: 'HTML', value: 'html' }, { label: 'CSS', value: 'css' }, { label: 'Python', value: 'python' }, { label: 'JSON', value: 'json' }, { label: 'Shell', value: 'bash' }], group: 'Content' },
    { key: 'showLineNumbers', label: 'Show Line Numbers', type: 'boolean', defaultValue: true, group: 'Style' },
  ]},
  table_block: { icon: 'Table', fields: [
    { key: 'headers', label: 'Column Headers', type: 'text', defaultValue: 'Header', group: 'Content', description: 'Comma-separated headers' },
    { key: 'rows', label: 'Rows', type: 'textarea', defaultValue: 'Cell', group: 'Content', description: 'One row per line, comma-separated values' },
  ]},
  accordion: { icon: 'ChevronDown', fields: [
    { key: 'items', label: 'Accordion Items', type: 'repeater', defaultValue: [{ title: 'Item', content: '' }], group: 'Content', itemFields: [
      { key: 'title', label: 'Title', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'content', label: 'Content', type: 'richtext', defaultValue: '', group: 'Content' },
      { key: 'icon', label: 'Icon', type: 'icon', defaultValue: '', group: 'Content' },
    ]},
  ]},
  tabs: { icon: 'Layers', fields: [
    { key: 'tabs', label: 'Tabs', type: 'repeater', defaultValue: [{ label: 'Tab', content: '' }], group: 'Content', itemFields: [
      { key: 'label', label: 'Tab Label', type: 'text', defaultValue: 'Tab', group: 'Content' },
      { key: 'content', label: 'Content', type: 'richtext', defaultValue: '', group: 'Content' },
      { key: 'icon', label: 'Icon', type: 'icon', defaultValue: '', group: 'Content' },
    ]},
    { key: 'orientation', label: 'Orientation', type: 'select', defaultValue: 'horizontal', options: [{ label: 'Horizontal', value: 'horizontal' }, { label: 'Vertical', value: 'vertical' }], group: 'Layout' },
  ]},
  breadcrumbs: { icon: 'ChevronsLeftRight', fields: [
    { key: 'items', label: 'Breadcrumb Items', type: 'repeater', defaultValue: [{ label: 'Home', href: '/' }, { label: 'Current Page', href: '' }], group: 'Content', itemFields: [
      { key: 'label', label: 'Label', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'link', label: 'Link', type: 'link', defaultValue: '', group: 'Content' },
    ]},
  ]},
  progress_bar: { icon: 'Gauge', fields: [
    { key: 'value', label: 'Progress Value', type: 'number', defaultValue: 75, group: 'Data' },
    { key: 'max', label: 'Maximum Value', type: 'number', defaultValue: 100, group: 'Data' },
    { key: 'label', label: 'Label', type: 'text', defaultValue: '', group: 'Content' },
    { key: 'color', label: 'Bar Color', type: 'color', defaultValue: 'rgb(var(--color-primary-600))', group: 'Style' },
    { key: 'height', label: 'Bar Height', type: 'dimension', defaultValue: '8px', group: 'Style' },
  ]},
  flip_card: { icon: 'Copy', fields: [
    { key: 'front', label: 'Front Side', type: 'repeater', defaultValue: [{ title: '', content: '', image: '' }], group: 'Content', itemFields: [
      { key: 'title', label: 'Title', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'content', label: 'Content', type: 'richtext', defaultValue: '', group: 'Content' },
      { key: 'image', label: 'Image', type: 'image', defaultValue: '', group: 'Media' },
      { key: 'icon', label: 'Icon', type: 'icon', defaultValue: '', group: 'Content' },
    ]},
    { key: 'back', label: 'Back Side', type: 'repeater', defaultValue: [{ title: '', content: '' }], group: 'Content', itemFields: [
      { key: 'title', label: 'Title', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'content', label: 'Content', type: 'richtext', defaultValue: '', group: 'Content' },
    ]},
  ]},
  countdown_timer: { icon: 'Clock', fields: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Sale Ends In', group: 'Content' },
    { key: 'targetDate', label: 'Target Date & Time', type: 'text', group: 'Data', placeholder: '2025-12-31T23:59:59' },
    { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: '', group: 'Style' },
    { key: 'textColor', label: 'Text Color', type: 'color', defaultValue: '', group: 'Style' },
  ]},
  popup_modal: { icon: 'Maximize2', fields: [
    { key: 'title', label: 'Title', type: 'text', group: 'Content' },
    { key: 'content', label: 'Content', type: 'richtext', group: 'Content' },
    { key: 'image', label: 'Image', type: 'image', group: 'Media' },
    { key: 'trigger', label: 'Trigger', type: 'select', defaultValue: 'onLoad', options: [{ label: 'On Page Load', value: 'onLoad' }, { label: 'On Click', value: 'onClick' }, { label: 'On Exit', value: 'onExit' }, { label: 'After Delay', value: 'afterDelay' }], group: 'Behavior' },
    { key: 'delay', label: 'Delay (ms)', type: 'number', defaultValue: 3000, group: 'Behavior' },
    { key: 'showCloseButton', label: 'Show Close Button', type: 'boolean', defaultValue: true, group: 'Behavior' },
  ]},
  announcement_bar: { icon: 'Megaphone', fields: [
    { key: 'text', label: 'Announcement Text', type: 'text', group: 'Content' },
    { key: 'link', label: 'Link URL', type: 'link', group: 'Content' },
    { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: '#000000', group: 'Style' },
    { key: 'textColor', label: 'Text Color', type: 'color', defaultValue: '#ffffff', group: 'Style' },
    { key: 'dismissible', label: 'Allow Dismiss', type: 'boolean', defaultValue: true, group: 'Behavior' },
  ]},
  referral_banner: { icon: 'Share2', fields: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Refer & Earn', group: 'Content' },
    { key: 'description', label: 'Description', type: 'textarea', group: 'Content' },
    { key: 'code', label: 'Referral Code', type: 'text', group: 'Content' },
    { key: 'reward', label: 'Reward Description', type: 'text', group: 'Content' },
    { key: 'image', label: 'Banner Image', type: 'image', group: 'Media' },
    { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: '', group: 'Style' },
  ]},
  grid: { icon: 'Grid', fields: [
    { key: 'columns', label: 'Columns', type: 'number', defaultValue: 3, group: 'Layout' },
    { key: 'gap', label: 'Gap', type: 'dimension', defaultValue: '1rem', group: 'Layout' },
  ]},
  flex_row: { icon: 'Columns', fields: [
    { key: 'justify', label: 'Justify Content', type: 'select', defaultValue: 'start', options: [{ label: 'Start', value: 'start' }, { label: 'Center', value: 'center' }, { label: 'End', value: 'end' }, { label: 'Space Between', value: 'between' }, { label: 'Space Around', value: 'around' }], group: 'Layout' },
    { key: 'align', label: 'Align Items', type: 'select', defaultValue: 'center', options: [{ label: 'Start', value: 'start' }, { label: 'Center', value: 'center' }, { label: 'End', value: 'end' }, { label: 'Stretch', value: 'stretch' }], group: 'Layout' },
    { key: 'gap', label: 'Gap', type: 'dimension', defaultValue: '1rem', group: 'Layout' },
    { key: 'wrap', label: 'Wrap', type: 'boolean', defaultValue: true, group: 'Layout' },
  ]},
  sticky_sidebar: { icon: 'PanelRight', fields: [
    { key: 'width', label: 'Width', type: 'dimension', defaultValue: '300px', group: 'Layout' },
    { key: 'position', label: 'Sidebar Position', type: 'select', defaultValue: 'right', options: [{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }], group: 'Layout' },
    { key: 'offset', label: 'Offset from Top', type: 'number', defaultValue: 20, group: 'Layout' },
  ]},
  mega_menu: { icon: 'Menu', fields: [
    { key: 'items', label: 'Menu Items', type: 'repeater', defaultValue: [], group: 'Content', itemFields: [
      { key: 'label', label: 'Menu Label', type: 'text', defaultValue: '', group: 'Content' },
      { key: 'link', label: 'Link', type: 'link', defaultValue: '', group: 'Content' },
      { key: 'icon', label: 'Icon', type: 'icon', defaultValue: '', group: 'Content' },
      { key: 'description', label: 'Description', type: 'text', defaultValue: '', group: 'Content' },
    ]},
    { key: 'columns', label: 'Columns', type: 'number', defaultValue: 4, group: 'Layout' },
  ]},
  section: { icon: 'Square', fields: [
    { key: 'width', label: 'Width', type: 'select', defaultValue: 'full', options: [{ label: 'Full Width', value: 'full' }, { label: 'Contained', value: 'contained' }], group: 'Layout' },
    { key: 'padding', label: 'Padding', type: 'dimension', defaultValue: 'py-8', group: 'Spacing' },
    { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: '', group: 'Style' },
    { key: 'backgroundImage', label: 'Background Image', type: 'image', defaultValue: '', group: 'Media' },
  ]},
};

// ── Merged schemas lookup ──
export function getBlockSchemas(type: string): FieldSchema[] {
  return COMPONENT_FIELD_SCHEMAS[type] || [];
}

// ── Available Icons for the builder UI ──
export const COMPONENT_ICONS: Record<string, string> = {
  hero: 'Layout',
  product_grid: 'Grid',
  product_carousel: 'ChevronsLeftRight',
  featured_products: 'Star',
  deal_rail: 'Percent',
  category_rail: 'FolderTree',
  category_scroller: 'List',
  tabbed_showcase: 'Layers',
  banner: 'Megaphone',
  promo_banners: 'Columns',
  trust_cards: 'Shield',
  cta_cards: 'Pointer',
  seller_strip: 'Store',
  newsletter: 'Mail',
  text_block: 'FileText',
  image_block: 'Image',
  video_block: 'Video',
  custom_html: 'Code',
  spacer: 'Maximize',
  divider: 'Minus',
  columns: 'Columns',
  container: 'Square',
  'section': 'Square',
  'column': 'Columns',
};

const mediaFields: FieldSchema[] = [
  { key: 'title', label: 'Title', type: 'text', group: 'Content' },
  { key: 'images', label: 'Images', type: 'repeater', defaultValue: [], group: 'Media', itemFields: [
    { key: 'src', label: 'Image', type: 'image', defaultValue: '', group: 'Media' },
    { key: 'alt', label: 'Alt Text', type: 'text', defaultValue: '', group: 'Content' },
  ]},
  { key: 'columns', label: 'Columns', type: 'number', defaultValue: 3, group: 'Layout' },
];

// Merge simple schemas into COMPONENT_FIELD_SCHEMAS
for (const [type, config] of Object.entries(SIMPLE_BLOCK_SCHEMAS)) {
  COMPONENT_FIELD_SCHEMAS[type] = config.fields;
  COMPONENT_ICONS[type] = config.icon;
}

export const COMPONENT_CATEGORIES: Record<string, string> = {
  content: 'Content',
  products: 'Products',
  marketing: 'Marketing',
  layout: 'Layout',
};

// ── Utility Functions for JSON Tree ──
export function generateBlockId(): string {
  return `blk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function createDefaultBlock(type: string, defaultProps?: Record<string, any>): LayoutBlock {
  const block: LayoutBlock = {
    id: generateBlockId(),
    type,
    settings: { ...(defaultProps || {}) },
    children: [],
  };

  // For columns type, auto-create child column slots so users can drop blocks into them
  if (type === 'columns') {
    const count = block.settings.columnCount || 2;
    block.settings.desktopColumns = block.settings.desktopColumns || count;
    block.settings.tabletColumns = block.settings.tabletColumns || Math.min(count, 2);
    block.settings.mobileColumns = block.settings.mobileColumns || 1;
    for (let i = 0; i < count; i++) {
      block.children.push({
        id: generateBlockId(),
        type: 'column',
        settings: { label: `Column ${i + 1}`, width: '1fr' },
        children: [],
      });
    }
  }

  return block;
}

export function syncColumnSlots(block: LayoutBlock): LayoutBlock {
  if (block.type !== 'columns') return block;

  const desiredCount = Math.max(1, Math.min(8, Number(block.settings.columnCount) || block.children.length || 2));
  const nextChildren = [...block.children];

  while (nextChildren.length < desiredCount) {
    nextChildren.push({
      id: generateBlockId(),
      type: 'column',
      settings: { label: `Column ${nextChildren.length + 1}`, width: '1fr' },
      children: [],
    });
  }

  const trimmedChildren = nextChildren.slice(0, desiredCount).map((child, index) => ({
    ...child,
    type: 'column',
    settings: {
      ...child.settings,
      label: child.settings?.label || `Column ${index + 1}`,
      width: child.settings?.width || '1fr',
    },
  }));

  return {
    ...block,
    settings: {
      ...block.settings,
      columnCount: desiredCount,
      desktopColumns: Number(block.settings.desktopColumns) || desiredCount,
      tabletColumns: Number(block.settings.tabletColumns) || Math.min(desiredCount, 2),
      mobileColumns: Number(block.settings.mobileColumns) || 1,
    },
    children: trimmedChildren,
  };
}

// Deep find a block by ID in the tree
export function findBlockById(blocks: LayoutBlock[], id: string): LayoutBlock | null {
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.children.length > 0) {
      const found = findBlockById(block.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Deep find a block and its parent path
export function findBlockWithParent(
  blocks: LayoutBlock[],
  id: string,
  parent: LayoutBlock[] | null = null
): { block: LayoutBlock; parent: LayoutBlock[] | null; parentIndex: number } | null {
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].id === id) {
      return { block: blocks[i], parent, parentIndex: i };
    }
    if (blocks[i].children.length > 0) {
      const found = findBlockWithParent(blocks[i].children, id, blocks[i].children);
      if (found) return found;
    }
  }
  return null;
}

// Remove a block by ID from the tree
export function removeBlockById(blocks: LayoutBlock[], id: string): LayoutBlock[] {
  return blocks.filter(b => {
    if (b.id === id) return false;
    if (b.children.length > 0) {
      b.children = removeBlockById(b.children, id);
    }
    return true;
  });
}

// Duplicate a block by ID
export function duplicateBlockInTree(blocks: LayoutBlock[], id: string): LayoutBlock[] {
  const result: LayoutBlock[] = [];
  const cloneBlockWithNewIds = (block: LayoutBlock): LayoutBlock => ({
    ...JSON.parse(JSON.stringify(block)),
    id: generateBlockId(),
    children: block.children.map(cloneBlockWithNewIds),
  });

  for (const block of blocks) {
    const current = {
      ...block,
      children: block.children.length > 0 ? duplicateBlockInTree(block.children, id) : [],
    };
    result.push(current);
    if (block.id === id) {
      const dup = cloneBlockWithNewIds(block);
      dup.settings.title = (dup.settings.title || block.type) + ' (Copy)';
      result.push(dup);
    }
  }
  return result;
}

// Move a block within its parent list (works for both root and nested)
export function moveBlockInTree(blocks: LayoutBlock[], id: string, direction: 'up' | 'down'): LayoutBlock[] {
  const found = findBlockWithParent(blocks, id);
  if (!found) return blocks;

  const { parent, parentIndex } = found;

  const target = parent || blocks;
  const idx = parent ? parentIndex : (() => {
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].id === id) return i;
    }
    return -1;
  })();

  if (idx === -1) return blocks;

  const newIndex = direction === 'up' ? idx - 1 : idx + 1;
  if (newIndex < 0 || newIndex >= target.length) return blocks;

  [target[idx], target[newIndex]] = [target[newIndex], target[idx]];

  if (parent === null) {
    return [...blocks];
  }

  return [...blocks];
}

// Add a block to a specific parent's children
export function addBlockToParent(blocks: LayoutBlock[], parentId: string | null, newBlock: LayoutBlock): LayoutBlock[] {
  if (!parentId) {
    return [...blocks, newBlock];
  }

  return blocks.map(b => {
    if (b.id === parentId) {
      return { ...b, children: [...b.children, newBlock] };
    }
    if (b.children.length > 0) {
      return { ...b, children: addBlockToParent(b.children, parentId, newBlock) };
    }
    return b;
  });
}