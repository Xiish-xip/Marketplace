import { prisma } from '../../common/prisma';
import { NotFoundError, AppError } from '../../common/errors';

export class PageBuilderService {
  // ── Component Definitions ──
  async getComponentTypes() {
    let defs = await prisma.componentDefinition.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });

    // Auto-seed if no components exist
    if (defs.length === 0) {
      await this.seedDefaultComponents();
      defs = await prisma.componentDefinition.findMany({
        where: { isActive: true },
        orderBy: { category: 'asc' },
      });
    }

    return defs.map(d => ({
      ...d,
      defaultProps: d.defaultProps ? JSON.parse(d.defaultProps) : {},
    }));
  }

  async getComponentType(type: string) {
    const def = await prisma.componentDefinition.findUnique({ where: { type } });
    if (!def) throw new NotFoundError(`Component type '${type}'`);
    return {
      ...def,
      defaultProps: def.defaultProps ? JSON.parse(def.defaultProps) : {},
    };
  }

  async seedDefaultComponents() {
    const components = [
      // Content components
      { type: 'hero', label: 'Hero Banner', category: 'content', icon: 'Image', defaultProps: { title: 'Welcome', subtitle: 'Shop the best deals', imageUrl: '', eyebrow: '', searchPlaceholder: '', alignment: 'center', overlayOpacity: 0.3, height: 'large' } },
      { type: 'text_block', label: 'Text Block', category: 'content', icon: 'FileText', defaultProps: { content: '<p>Your content here</p>', alignment: 'left' } },
      { type: 'image_block', label: 'Image', category: 'content', icon: 'Image', defaultProps: { src: '', alt: '', caption: '', link: '', borderRadius: 'rounded-lg' } },
      { type: 'video_block', label: 'Video', category: 'content', icon: 'Video', defaultProps: { url: '', autoplay: false, controls: true, loop: false } },
      { type: 'custom_html', label: 'Custom HTML', category: 'content', icon: 'Code', defaultProps: { html: '<div>Custom content</div>' } },
      { type: 'divider', label: 'Divider', category: 'content', icon: 'Minus', defaultProps: { height: '1px', color: 'var(--color-border)', marginY: '2rem' } },
      { type: 'spacer', label: 'Spacer', category: 'content', icon: 'Maximize', defaultProps: { height: '2rem' } },
      { type: 'newsletter', label: 'Newsletter Signup', category: 'content', icon: 'Mail', defaultProps: { title: 'Stay Updated', subtitle: 'Get the latest deals', buttonText: 'Subscribe', placeholder: 'Your email', backgroundColor: 'var(--color-surface-muted)' } },

      // Product components
      { type: 'product_grid', label: 'Product Grid', category: 'products', icon: 'Grid', defaultProps: { title: 'Featured Products', columns: 4, rows: 1, source: 'featured', categoryId: '', showPagination: false, showViewAll: true, showQuickActions: true, imageAnimation: 'slide' } },
      { type: 'product_carousel', label: 'Product Carousel', category: 'products', icon: 'ChevronsLeftRight', defaultProps: { title: 'Best Sellers', source: 'best_sellers', categoryId: '', limit: 10, autoplay: false } },
      { type: 'featured_products', label: 'Featured Products Rail', category: 'products', icon: 'Star', defaultProps: { title: 'Featured', limit: 8 } },
      { type: 'deal_rail', label: 'Deal Rail', category: 'products', icon: 'Percent', defaultProps: { title: 'Hot Deals', limit: 10, minDiscount: 20 } },
      { type: 'category_rail', label: 'Category Rail', category: 'products', icon: 'FolderTree', defaultProps: { title: 'Shop by Category', limit: 8, showImages: true } },
      { type: 'category_scroller', label: 'Category Scroller', category: 'products', icon: 'List', defaultProps: { title: 'Categories', limit: 12, layout: 'horizontal' } },
      { type: 'tabbed_showcase', label: 'Tabbed Showcase', category: 'products', icon: 'Layers', defaultProps: { title: 'Discover', tabs: [{ label: 'Featured', source: 'featured' }, { label: 'Best Sellers', source: 'best_sellers' }] } },

      // Marketing components
      { type: 'banner', label: 'Promo Banner', category: 'marketing', icon: 'Megaphone', defaultProps: { title: 'Special Offer', text: 'Limited time deal', href: '/products', imageUrl: '', buttonText: 'Shop Now', layout: 'side_by_side' } },
      { type: 'promo_banners', label: 'Promo Banner Row', category: 'marketing', icon: 'Columns', defaultProps: { banners: [{ title: 'Electronics', text: 'Great deals' }, { title: 'Fashion', text: 'New arrivals' }] } },
      { type: 'trust_cards', label: 'Trust Badges', category: 'marketing', icon: 'Shield', defaultProps: { cards: [{ icon: 'Truck', title: 'Fast Shipping', text: 'Delivery in 3-5 days' }, { icon: 'Shield', title: 'Secure Payments', text: 'Protected transactions' }, { icon: 'Clock', title: '24/7 Support', text: 'Always here to help' }] } },
      { type: 'cta_cards', label: 'CTA Cards', category: 'marketing', icon: 'Pointer', defaultProps: { cards: [{ title: 'Start Selling', text: 'Become a seller today', buttonText: 'Get Started' }, { title: 'View Catalog', text: 'Browse our products', buttonText: 'Explore' }] } },
      { type: 'seller_strip', label: 'Seller Strip', category: 'marketing', icon: 'Store', defaultProps: { title: 'Trusted Sellers', limit: 8 } },

      // Layout components
      { type: 'columns', label: 'Columns', category: 'layout', icon: 'Columns', defaultProps: { columnCount: 2, desktopColumns: 2, tabletColumns: 2, mobileColumns: 1, gap: '1.5rem', verticalAlign: 'stretch', minHeight: '120px', padding: '0', backgroundColor: '', columns: [{ width: '1fr' }, { width: '1fr' }] } },
      { type: 'container', label: 'Container', category: 'layout', icon: 'Square', defaultProps: { maxWidth: '1280px', paddingX: '1rem', paddingY: '0' } },
      { type: 'image_gallery', label: 'Image Gallery', category: 'content', icon: 'Grid', defaultProps: { title: 'Gallery', images: [], columns: 3 } },
      { type: 'video_player', label: 'Video Player', category: 'content', icon: 'Video', defaultProps: { videoUrl: '', poster: '', controls: true, autoplay: false, loop: false } },
      { type: 'logo_cloud', label: 'Logo Cloud', category: 'marketing', icon: 'Store', defaultProps: { title: 'Trusted By', logos: [], columns: 4 } },
      { type: 'icon_grid', label: 'Icon Grid', category: 'content', icon: 'Grid', defaultProps: { title: 'Features', icons: [], columns: 4 } },
      { type: 'parallax_banner', label: 'Parallax Banner', category: 'marketing', icon: 'Image', defaultProps: { title: 'Explore More', backgroundImage: '', height: '400px' } },
      { type: 'masonry_gallery', label: 'Masonry Gallery', category: 'content', icon: 'Columns', defaultProps: { title: 'Gallery', images: [], columns: 3 } },
      { type: 'before_after', label: 'Before/After', category: 'content', icon: 'Columns3', defaultProps: { beforeImage: '', afterImage: '', beforeLabel: 'Before', afterLabel: 'After' } },
      { type: 'lottie_animation', label: 'Lottie Animation', category: 'content', icon: 'Play', defaultProps: { animationUrl: '', loop: true, autoplay: true } },
      { type: 'social_feed', label: 'Social Feed', category: 'marketing', icon: 'Layout', defaultProps: { platform: 'tiktok', username: '', limit: 8 } },
      { type: 'audio_player', label: 'Audio Player', category: 'content', icon: 'Music', defaultProps: { audioUrl: '', title: '', cover: '', autoplay: false } },
      { type: 'slideshow', label: 'Slideshow', category: 'content', icon: 'Layout', defaultProps: { slides: [], autoplay: true, interval: 5000 } },
      { type: 'product_comparison', label: 'Product Comparison', category: 'products', icon: 'Columns3', defaultProps: { title: 'Compare Products', products: [], columns: 3 } },
      { type: 'recently_viewed', label: 'Recently Viewed', category: 'products', icon: 'Clock', defaultProps: { title: 'Recently Viewed', limit: 8 } },
      { type: 'related_products', label: 'Related Products', category: 'products', icon: 'ChevronsLeftRight', defaultProps: { title: 'You May Also Like', limit: 8 } },
      { type: 'faq_accordion', label: 'FAQ Accordion', category: 'content', icon: 'List', defaultProps: { title: 'FAQs', items: [{ question: 'Question', answer: 'Answer' }], allowMultiple: true } },
      { type: 'pricing_table', label: 'Pricing Table', category: 'content', icon: 'DollarSign', defaultProps: { title: 'Pricing', plans: [{ name: 'Plan', price: '$0', features: [], cta: 'Choose' }] } },
      { type: 'timeline', label: 'Timeline', category: 'content', icon: 'ArrowUpDown', defaultProps: { title: 'Timeline', items: [{ date: '', title: 'Milestone', description: '' }], orientation: 'vertical' } },
      { type: 'stats_counter', label: 'Stats Counter', category: 'content', icon: 'Check', defaultProps: { stats: [{ value: 100, label: 'Happy customers' }], animation: true } },
      { type: 'testimonial_slider', label: 'Testimonial Slider', category: 'content', icon: 'Star', defaultProps: { title: 'What customers say', testimonials: [{ name: '', role: '', text: '', avatar: '' }] } },
      { type: 'team_members', label: 'Team Members', category: 'content', icon: 'Users', defaultProps: { title: 'Team', members: [{ name: '', role: '', image: '', bio: '' }], columns: 3 } },
      { type: 'contact_form', label: 'Contact Form', category: 'content', icon: 'Mail', defaultProps: { title: 'Contact Us', fields: ['name', 'email', 'message'], submitText: 'Send' } },
      { type: 'map_block', label: 'Map', category: 'content', icon: 'MapPin', defaultProps: { address: '', lat: 0, lng: 0, zoom: 14 } },
      { type: 'code_block', label: 'Code Block', category: 'content', icon: 'Code', defaultProps: { code: '', language: 'javascript', showLineNumbers: true } },
      { type: 'table_block', label: 'Table', category: 'content', icon: 'Table', defaultProps: { headers: ['Header'], rows: [['Cell']] } },
      { type: 'accordion', label: 'Accordion', category: 'content', icon: 'ChevronDown', defaultProps: { items: [{ title: 'Item', content: '' }] } },
      { type: 'tabs', label: 'Tabs', category: 'content', icon: 'Layers', defaultProps: { tabs: [{ label: 'Tab', content: '' }], orientation: 'horizontal' } },
      { type: 'breadcrumbs', label: 'Breadcrumbs', category: 'content', icon: 'ChevronsLeftRight', defaultProps: { items: [{ label: 'Home', href: '/' }, { label: 'Current', href: '' }] } },
      { type: 'progress_bar', label: 'Progress Bar', category: 'content', icon: 'Gauge', defaultProps: { value: 75, max: 100, label: '', showLabel: true } },
      { type: 'flip_card', label: 'Flip Card', category: 'content', icon: 'Copy', defaultProps: { front: { title: '', content: '', image: '' }, back: { title: '', content: '' } } },
      { type: 'countdown_timer', label: 'Countdown Timer', category: 'marketing', icon: 'Clock', defaultProps: { targetDate: '', title: 'Sale Ends In' } },
      { type: 'popup_modal', label: 'Popup Modal', category: 'marketing', icon: 'Maximize2', defaultProps: { title: '', content: '', image: '', trigger: 'onLoad', delay: 3000 } },
      { type: 'announcement_bar', label: 'Announcement Bar', category: 'marketing', icon: 'Megaphone', defaultProps: { text: '', link: '', dismissible: true, backgroundColor: '#000000', textColor: '#ffffff' } },
      { type: 'referral_banner', label: 'Referral Banner', category: 'marketing', icon: 'Share2', defaultProps: { title: 'Refer & Earn', description: '', code: '', reward: '' } },
      { type: 'grid', label: 'Grid', category: 'layout', icon: 'Grid', defaultProps: { columns: 3, gap: '1rem' } },
      { type: 'flex_row', label: 'Flex Row', category: 'layout', icon: 'Columns', defaultProps: { justify: 'start', align: 'center', gap: '1rem', wrap: true } },
      { type: 'sticky_sidebar', label: 'Sticky Sidebar', category: 'layout', icon: 'PanelRight', defaultProps: { width: '300px', position: 'right', offset: 20 } },
      { type: 'mega_menu', label: 'Mega Menu', category: 'layout', icon: 'Menu', defaultProps: { columns: 4, items: [] } },
      { type: 'tabs_container', label: 'Tabs Container', category: 'layout', icon: 'FolderTree', defaultProps: { tabs: [], orientation: 'horizontal' } },
      { type: 'accordion_container', label: 'Accordion Container', category: 'layout', icon: 'List', defaultProps: { items: [] } },
      { type: 'section', label: 'Section', category: 'layout', icon: 'Square', defaultProps: { width: 'full', padding: 'py-8', backgroundColor: '' } },
    ];

    for (const comp of components) {
      await prisma.componentDefinition.upsert({
        where: { type: comp.type },
        update: {
          label: comp.label,
          category: comp.category,
          icon: comp.icon,
          defaultProps: JSON.stringify(comp.defaultProps),
          isSystem: true,
          isActive: true,
        },
        create: {
          ...comp,
          defaultProps: JSON.stringify(comp.defaultProps),
          isSystem: true,
        },
      });
    }

    return { message: `Seeded ${components.length} component types` };
  }

  // ── Page Layouts ──
  async createLayout(data: {
    slug: string;
    title: string;
    description?: string;
    path?: string;
    pageType?: string;
    isSystem?: boolean;
    metadata?: any;
    themeOverrides?: any;
  }) {
    const existing = await prisma.pageLayout.findUnique({ where: { slug: data.slug } });
    if (existing) throw new AppError(409, `Layout with slug '${data.slug}' already exists`);

    return prisma.pageLayout.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        path: data.path,
        pageType: data.pageType || 'custom',
        isSystem: data.isSystem || false,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        themeOverrides: data.themeOverrides ? JSON.stringify(data.themeOverrides) : null,
      },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async getAllLayouts(query: any = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.pageType) where.pageType = query.pageType;
    if (query.isPublished !== undefined) where.isPublished = query.isPublished === 'true';

    const [layouts, total] = await Promise.all([
      prisma.pageLayout.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { sections: true } } },
      }),
      prisma.pageLayout.count({ where }),
    ]);

    return {
      data: layouts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getLayoutBySlug(slug: string) {
    const layout = await prisma.pageLayout.findUnique({
      where: { slug },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!layout) throw new NotFoundError('Layout not found');
    return layout;
  }

  async getLayoutById(id: string) {
    const layout = await prisma.pageLayout.findUnique({
      where: { id },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!layout) throw new NotFoundError('Layout not found');
    return layout;
  }

  async updateLayout(id: string, data: any) {
    const layout = await prisma.pageLayout.findUnique({ where: { id } });
    if (!layout) throw new NotFoundError('Layout not found');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.path !== undefined) updateData.path = data.path;
    if (data.pageType !== undefined) updateData.pageType = data.pageType;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);
    if (data.themeOverrides !== undefined) updateData.themeOverrides = JSON.stringify(data.themeOverrides);

    return prisma.pageLayout.update({
      where: { id },
      data: updateData,
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async deleteLayout(id: string) {
    const layout = await prisma.pageLayout.findUnique({ where: { id } });
    if (!layout) throw new NotFoundError('Layout not found');
    await prisma.pageLayout.delete({ where: { id } });
    return { message: 'Layout deleted' };
  }

  async duplicateLayout(id: string) {
    const layout = await prisma.pageLayout.findUnique({
      where: { id },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!layout) throw new NotFoundError('Layout not found');

    const newSlug = `${layout.slug}-copy-${Date.now()}`;
    const newLayout = await prisma.pageLayout.create({
      data: {
        slug: newSlug,
        title: `${layout.title} (Copy)`,
        description: layout.description,
        path: layout.path,
        pageType: layout.pageType,
        isSystem: false,
        isPublished: false,
        metadata: layout.metadata,
        themeOverrides: layout.themeOverrides,
      },
    });

    // Copy sections
    for (const section of layout.sections) {
      await prisma.pageSection.create({
        data: {
          layoutId: newLayout.id,
          componentType: section.componentType,
          title: section.title,
          sortOrder: section.sortOrder,
          isVisible: section.isVisible,
          props: section.props,
          style: section.style,
          cssClass: section.cssClass,
          containerWidth: section.containerWidth,
          backgroundColor: section.backgroundColor,
          paddingTop: section.paddingTop,
          paddingBottom: section.paddingBottom,
          marginTop: section.marginTop,
          marginBottom: section.marginBottom,
          hideOnMobile: section.hideOnMobile,
          hideOnTablet: section.hideOnTablet,
          hideOnDesktop: section.hideOnDesktop,
          animation: section.animation,
        },
      });
    }

    return this.getLayoutById(newLayout.id);
  }

  // ── Page Sections ──
  async addSection(layoutId: string, data: {
    componentType: string;
    title?: string;
    props?: any;
    style?: any;
    containerWidth?: string;
    backgroundColor?: string;
    sortOrder?: number;
  }) {
    const layout = await prisma.pageLayout.findUnique({ where: { id: layoutId } });
    if (!layout) throw new NotFoundError('Layout not found');

    // Auto-assign sort order
    const maxOrder = await prisma.pageSection.findFirst({
      where: { layoutId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return prisma.pageSection.create({
      data: {
        layoutId,
        componentType: data.componentType,
        title: data.title || data.componentType,
        props: data.props ? JSON.stringify(data.props) : '{}',
        style: data.style ? JSON.stringify(data.style) : null,
        containerWidth: data.containerWidth || 'full',
        backgroundColor: data.backgroundColor || null,
        sortOrder: data.sortOrder ?? (maxOrder ? maxOrder.sortOrder + 1 : 0),
      },
    });
  }

  async updateSection(sectionId: string, data: any) {
    const section = await prisma.pageSection.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundError('Section not found');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.componentType !== undefined) updateData.componentType = data.componentType;
    if (data.props !== undefined) updateData.props = JSON.stringify(data.props);
    if (data.style !== undefined) updateData.style = JSON.stringify(data.style);
    if (data.cssClass !== undefined) updateData.cssClass = data.cssClass;
    if (data.containerWidth !== undefined) updateData.containerWidth = data.containerWidth;
    if (data.backgroundColor !== undefined) updateData.backgroundColor = data.backgroundColor;
    if (data.paddingTop !== undefined) updateData.paddingTop = data.paddingTop;
    if (data.paddingBottom !== undefined) updateData.paddingBottom = data.paddingBottom;
    if (data.marginTop !== undefined) updateData.marginTop = data.marginTop;
    if (data.marginBottom !== undefined) updateData.marginBottom = data.marginBottom;
    if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;
    if (data.hideOnMobile !== undefined) updateData.hideOnMobile = data.hideOnMobile;
    if (data.hideOnTablet !== undefined) updateData.hideOnTablet = data.hideOnTablet;
    if (data.hideOnDesktop !== undefined) updateData.hideOnDesktop = data.hideOnDesktop;
    if (data.animation !== undefined) updateData.animation = data.animation;
    if (data.visibilityRules !== undefined) updateData.visibilityRules = JSON.stringify(data.visibilityRules);
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    return prisma.pageSection.update({
      where: { id: sectionId },
      data: updateData,
    });
  }

  async reorderSections(layoutId: string, sectionIds: string[]) {
    const layout = await prisma.pageLayout.findUnique({ where: { id: layoutId } });
    if (!layout) throw new NotFoundError('Layout not found');

    await Promise.all(
      sectionIds.map((id, index) =>
        prisma.pageSection.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    return this.getLayoutById(layoutId);
  }

  async deleteSection(sectionId: string) {
    const section = await prisma.pageSection.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundError('Section not found');
    await prisma.pageSection.delete({ where: { id: sectionId } });
    return { message: 'Section deleted' };
  }

  // ── JSON Tree API ──
  async getLayoutTree(id: string) {
    const layout = await prisma.pageLayout.findUnique({
      where: { id },
    });
    if (!layout) throw new NotFoundError('Layout not found');

    return this.parseTreeLayout(layout);
  }

  async saveLayoutTree(id: string, tree: any[]) {
    const layout = await prisma.pageLayout.findUnique({ where: { id } });
    if (!layout) throw new NotFoundError('Layout not found');

    // Parse existing metadata safely
    let existingMeta: Record<string, any> = {};
    try {
      existingMeta = layout.metadata ? JSON.parse(layout.metadata) : {};
    } catch {
      existingMeta = {};
    }

    // Remove old tree key and preserve clean metadata
    const { _layoutTree, ...cleanMeta } = existingMeta;

    const updated = await prisma.pageLayout.update({
      where: { id },
      data: {
        metadata: JSON.stringify({
          ...cleanMeta,
          _layoutTree: tree,
        }),
        updatedAt: new Date(),
      },
    });

    return this.parseTreeLayout(updated);
  }

  async getPublishedLayoutTree(slug: string) {
    const layout = await prisma.pageLayout.findFirst({
      where: { slug, isPublished: true, isActive: true },
    });
    if (!layout) return null;

    return this.parseTreeLayout(layout);
  }

  private parseTreeLayout(layout: any) {
    let tree: any[] = [];
    let metadata: any = null;

    if (layout.metadata) {
      try {
        const parsed = JSON.parse(layout.metadata);
        tree = parsed._layoutTree || [];
        // Return clean metadata without the internal tree key
        const { _layoutTree, ...cleanMeta } = parsed;
        metadata = Object.keys(cleanMeta).length > 0 ? cleanMeta : null;
      } catch {
        tree = [];
        metadata = null;
      }
    }

    return {
      id: layout.id,
      slug: layout.slug,
      title: layout.title,
      description: layout.description,
      path: layout.path,
      pageType: layout.pageType,
      isSystem: layout.isSystem,
      isPublished: layout.isPublished,
      isActive: layout.isActive,
      tree,
      metadata,
      themeOverrides: layout.themeOverrides ? JSON.parse(layout.themeOverrides) : null,
      createdAt: layout.createdAt,
      updatedAt: layout.updatedAt,
    };
  }

  // ── Public Render ──
  async getPublishedLayout(slug: string) {
    const layout = await prisma.pageLayout.findFirst({
      where: { slug, isPublished: true },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!layout) return null;
    return {
      ...layout,
      metadata: layout.metadata ? JSON.parse(layout.metadata) : null,
      themeOverrides: layout.themeOverrides ? JSON.parse(layout.themeOverrides) : null,
      sections: layout.sections.map((s) => ({
        ...s,
        props: JSON.parse(s.props),
        style: s.style ? JSON.parse(s.style) : null,
        visibilityRules: s.visibilityRules ? JSON.parse(s.visibilityRules) : null,
      })),
    };
  }

  // ── Template (Header/Footer) Management ──
  async getAllTemplates(query: any = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;
    const where: any = { pageType: 'template' };
    if (query.templateType === 'header' || query.templateType === 'footer') {
      where.metadata = { contains: `"templateType":"${query.templateType}"` };
    }
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';

    const [templates, total] = await Promise.all([
      prisma.pageLayout.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pageLayout.count({ where }),
    ]);

    // Parse trees for each template
    const parsed = templates.map(t => this.parseTreeLayout(t));

    return {
      data: parsed,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createTemplate(data: {
    slug: string;
    title: string;
    templateType: 'header' | 'footer';
    description?: string;
    tree?: any[];
    metadata?: any;
  }) {
    const slug = data.templateType === 'header'
      ? `header-${data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      : `footer-${data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    const existing = await prisma.pageLayout.findUnique({ where: { slug } });
    if (existing) throw new AppError(409, `Template with slug '${slug}' already exists`);

    const metadata: any = {
      templateType: data.templateType,
      ...((data.tree && data.tree.length > 0) ? { _layoutTree: data.tree } : {}),
      ...(data.metadata || {}),
    };

    return prisma.pageLayout.create({
      data: {
        slug,
        title: data.title,
        description: data.description,
        pageType: 'template',
        isSystem: false,
        isPublished: false,
        isActive: false,
        metadata: JSON.stringify(metadata),
      },
    });
  }

  async updateTemplate(id: string, data: any) {
    const template = await prisma.pageLayout.findUnique({ where: { id } });
    if (!template) throw new NotFoundError('Template not found');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.tree) {
      const existingMeta = template.metadata ? JSON.parse(template.metadata) : {};
      updateData.metadata = JSON.stringify({
        ...existingMeta,
        _layoutTree: data.tree,
      });
    }

    if (data.templateType) {
      const existingMeta = updateData.metadata ? JSON.parse(updateData.metadata) : (template.metadata ? JSON.parse(template.metadata) : {});
      existingMeta.templateType = data.templateType;
      updateData.metadata = JSON.stringify(existingMeta);
    }

    const existingMeta = template.metadata ? JSON.parse(template.metadata) : {};

    const updated = data.isActive === true && existingMeta.templateType
      ? await prisma.$transaction(async (tx) => {
          await tx.pageLayout.updateMany({
            where: {
              pageType: 'template',
              id: { not: id },
              metadata: { contains: `"templateType":"${existingMeta.templateType}"` },
            },
            data: { isActive: false },
          });
          return tx.pageLayout.update({ where: { id }, data: updateData });
        })
      : await prisma.pageLayout.update({
          where: { id },
          data: updateData,
        });

    return this.parseTreeLayout(updated);
  }

  async deleteTemplate(id: string) {
    const template = await prisma.pageLayout.findUnique({ where: { id } });
    if (!template) throw new NotFoundError('Template not found');
    await prisma.pageLayout.delete({ where: { id } });
    return { message: 'Template deleted' };
  }

  // ── Active Header/Footer (for public rendering) ──
  async getActiveHeaderTree() {
    try {
      const header = await prisma.pageLayout.findFirst({
        where: { pageType: 'template', isActive: true, metadata: { contains: '"templateType":"header"' } },
      });
      return header ? this.parseTreeLayout(header) : null;
    } catch {
      return null;
    }
  }

  async getActiveFooterTree() {
    try {
      const footer = await prisma.pageLayout.findFirst({
        where: { pageType: 'template', isActive: true, metadata: { contains: '"templateType":"footer"' } },
      });
      return footer ? this.parseTreeLayout(footer) : null;
    } catch {
      return null;
    }
  }

  // ── Site-wide Settings ──
  async getSiteSettings() {
    const defaultSettings = {
      activeHeaderTemplateId: null as string | null,
      activeFooterTemplateId: null as string | null,
      globalFontFamily: 'Inter, system-ui, sans-serif',
      globalColors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      siteName: 'MarketPlace',
      logo: '',
      favicon: '',
    };

    try {
      const activeHeader = await prisma.pageLayout.findFirst({
        where: { pageType: 'template', isActive: true, metadata: { contains: '"templateType":"header"' } },
      });
      const activeFooter = await prisma.pageLayout.findFirst({
        where: { pageType: 'template', isActive: true, metadata: { contains: '"templateType":"footer"' } },
      });
      return {
        ...defaultSettings,
        activeHeaderTemplateId: activeHeader?.id || null,
        activeFooterTemplateId: activeFooter?.id || null,
      };
    } catch {
      return defaultSettings;
    }
  }

  async updateSiteSettings(data: any) {
    return { message: 'Site settings updated', data };
  }
}
