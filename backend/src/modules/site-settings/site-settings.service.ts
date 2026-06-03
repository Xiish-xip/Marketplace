import { prisma } from '../../common/prisma';

export class SiteSettingsService {
  async get() {
    const config = await prisma.featureFlag.findUnique({ where: { key: 'site_settings' } });
    if (!config) return this.getDefaults();
    return typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
  }

  async update(data: any) {
    await prisma.featureFlag.upsert({
      where: { key: 'site_settings' },
      update: { value: JSON.stringify(data), isActive: true, type: 'json' },
      create: { key: 'site_settings', value: JSON.stringify(data), type: 'json', isActive: true, description: 'Site-wide layout, navbar, hero, footer, and style settings' },
    });
    return data;
  }

  private getDefaults() {
    return {
      navbar: {
        logo: '',
        siteName: 'MarketPlace',
        menuItems: [
          { label: 'Home', path: '/' },
          { label: 'Products', path: '/products' },
          { label: 'Become Seller', path: '/become-seller' },
        ],
        showCart: true,
        showSearch: true,
        showAuth: true,
        sticky: true,
        style: 'default',
      },
      hero: {
        enabled: true,
        title: 'Welcome to MarketPlace',
        subtitle: 'Discover amazing products from trusted sellers',
        backgroundImage: '',
        backgroundColor: '#f97316',
        textColor: '#ffffff',
        buttonText: 'Shop Now',
        buttonLink: '/products',
        buttonColor: '#ffffff',
        buttonTextColor: '#f97316',
        height: 'large',
        overlay: true,
      },
      sections: [
        { id: 'featured-products', type: 'featured-products', title: 'Featured Products', enabled: true, layout: 'grid', limit: 8 },
        { id: 'categories', type: 'categories', title: 'Shop by Category', enabled: true, layout: 'grid' },
      ],
      footer: {
        logo: '',
        siteName: 'MarketPlace',
        description: 'Your trusted marketplace for quality products.',
        columns: [
          {
            title: 'Quick Links',
            links: [
              { label: 'About Us', path: '/about' },
              { label: 'Contact', path: '/contact' },
              { label: 'Terms of Service', path: '/terms' },
              { label: 'Privacy Policy', path: '/privacy' },
            ],
          },
          {
            title: 'Customer Service',
            links: [
              { label: 'Help Center', path: '/help' },
              { label: 'Returns', path: '/returns' },
              { label: 'Shipping Info', path: '/shipping' },
            ],
          },
        ],
        socialLinks: { facebook: '', twitter: '', instagram: '', youtube: '' },
        copyright: `© ${new Date().getFullYear()} MarketPlace. All rights reserved.`,
        backgroundColor: '#111827',
        textColor: '#f9fafb',
      },
      styles: {
        primaryColor: '#f97316',
        secondaryColor: '#ea580c',
        fontFamily: 'Inter, system-ui, sans-serif',
        borderRadius: '0.5rem',
        containerWidth: '1280px',
        darkMode: true,
      },
    };
  }
}

export const siteSettingsService = new SiteSettingsService();