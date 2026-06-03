import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { usePublicConfig } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';

const footerGroups = [
  {
    title: 'Shop',
    links: [
      { label: 'All Products', href: '/products' },
      { label: 'Featured', href: '/products?isFeatured=true' },
      { label: 'Best Sellers', href: '/products?sortBy=totalSales&sortOrder=desc' },
      { label: 'New Arrivals', href: '/products?sortBy=createdAt&sortOrder=desc' },
    ],
  },
  {
    title: 'Sell',
    links: [
      { label: 'Start Selling', href: '/become-seller' },
      { label: 'Seller Center', href: '/seller' },
      { label: 'Seller Products', href: '/seller/products' },
      { label: 'Payouts', href: '/seller/payouts' },
    ],
  },
  {
    title: 'Customer',
    links: [
      { label: 'Customer Center', href: '/account' },
      { label: 'Orders', href: '/account/orders' },
      { label: 'Wishlist', href: '/wishlist' },
      { label: 'Payment Settings', href: '/account/payments' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'Account Settings', href: '/account/settings' },
      { label: 'Notifications', href: '/account/notifications' },
      { label: 'Admin Panel', href: '/admin' },
      { label: 'Contact Support', href: '/ai-chat' },
    ],
  },
];

function FooterGroup({ group, open, onToggle }: { group: typeof footerGroups[number]; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b py-2 sm:border-0 sm:py-0" style={{ borderColor: 'rgb(var(--color-divider))' }}>
      <button onClick={onToggle} className="flex w-full items-center justify-between py-3 text-left sm:pointer-events-none sm:py-0">
        <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{group.title}</h4>
        <ChevronDown className={`h-4 w-4 transition-transform sm:hidden ${open ? 'rotate-180' : ''}`} style={{ color: 'rgb(var(--color-text-muted))' }} />
      </button>
      <ul className={`${open ? 'block' : 'hidden'} space-y-2.5 pb-4 text-sm sm:block sm:pb-0`}>
        {group.links.map((link) => (
          <li key={`${group.title}-${link.href}-${link.label}`}>
            <Link to={link.href} className="transition hover:underline" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Shop: true });
  const { data: publicConfig } = usePublicConfig();
  const platformAssets = publicConfig?.data?.['platform.assets'] || {};
  const siteIdentity = publicConfig?.data?.['site.identity'] || {};
  const footer = publicConfig?.data?.['footer.content'] || {};

  const identity = {
    ...siteIdentity,
    logoUrl: siteIdentity.logoUrl || platformAssets.logoUrl,
    faviconUrl: siteIdentity.faviconUrl || platformAssets.faviconUrl,
  };

  const groups = Array.isArray(footer.groups) && footer.groups.length ? footer.groups : footerGroups;
  const socialLinks = Array.isArray(footer.socialLinks)
    ? footer.socialLinks.map((link: any) => ({
        label: link.label || 'Social',
        href: link.href || '#',
        icon: link.icon || null,
      }))
    : [];

  const toggleGroup = (title: string) => {
    setOpenGroups((current) => ({ ...current, [title]: !current[title] }));
  };

  return (
    <footer
      className="border-t mt-auto"
      style={{
        backgroundColor: 'rgb(var(--color-gray-900))',
        color: 'rgb(var(--color-gray-100))',
        borderColor: 'rgb(var(--color-gray-800))',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 lg:grid-cols-4">
          {(groups as any[]).map((group: any, index: number) => (
            <div key={group.title || index}>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgb(var(--color-primary-400))' }}>
                {group.title}
              </h3>
              <ul className="space-y-2.5">
                {group.links?.map((link: any, li: number) => (
                  <li key={`${group.title}-${link.href || li}-${link.label}`}>
                    <Link
                      to={link.href || '#'}
                      className="text-sm transition-colors"
                      style={{ color: 'rgb(var(--color-gray-400))' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgb(var(--color-primary-400))' }}>
              Stay Connected
            </h3>
            <p className="text-sm" style={{ color: 'rgb(var(--color-gray-400))' }}>
              Follow us on social media for updates.
            </p>
            <div className="mt-4 flex gap-3">
              {(socialLinks as any[]).map((link: any) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full transition-colors"
                  style={{ color: 'rgb(var(--color-gray-400))' }}
                  aria-label={link.label}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t" style={{ borderColor: 'rgb(var(--color-gray-800))' }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs" style={{ color: 'rgb(var(--color-gray-500))' }}>
              &copy; {new Date().getFullYear()} {identity.name || 'MarketPlace'}. All rights reserved.
            </p>
            <div className="flex gap-4 text-xs" style={{ color: 'rgb(var(--color-gray-500))' }}>
              <Link to="/page/privacy" className="hover:text-primary-300 transition-colors">Privacy</Link>
              <Link to="/page/terms" className="hover:text-primary-300 transition-colors">Terms</Link>
              <Link to="/page/shipping" className="hover:text-primary-300 transition-colors">Shipping</Link>
              <Link to="/page/returns" className="hover:text-primary-300 transition-colors">Returns</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
