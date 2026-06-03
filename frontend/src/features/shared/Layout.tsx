import React, { useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { usePublicConfig } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';
import { resolveTheme } from '../../lib/theme';
import Navbar from './Navbar';
import Footer from './Footer';
import AccessibilityDock from './AccessibilityDock';
import ChatBubble from './ChatBubble';
import FloatingActions from '../../components/FloatingActions';
import { useAuthStore } from '../../lib/auth-store';
import { usePreferenceStore } from '../../lib/preference-store';
import BackToTop from './BackToTop';
import LiveSupport from './LiveSupport';

export default function Layout() {
  const { data: publicConfig } = usePublicConfig();
  const location = useLocation();
  const platformAssets = publicConfig?.data?.['platform.assets'] || {};
  const siteIdentity = publicConfig?.data?.['site.identity'] || {};
  const identity = {
    ...siteIdentity,
    logoUrl: siteIdentity.logoUrl || platformAssets.logoUrl,
    faviconUrl: siteIdentity.faviconUrl || platformAssets.faviconUrl,
  };
  const themeConfig = publicConfig?.data?.['site.theme'];
  const baseTheme = useMemo(() => resolveTheme(themeConfig, 'light'), [themeConfig]);
  const globalColorMode = baseTheme.colorMode as 'light' | 'dark' | 'system' | 'user' | undefined;
  const { isAuthenticated } = useAuthStore();
  const { theme: themeMode, accessibility, highContrast } = usePreferenceStore();

  // Detect if current path is an admin/panel route - hide footer for stacked panel pages
  const isPanelRoute = location.pathname.startsWith('/admin') || 
    location.pathname.startsWith('/seller') || 
    location.pathname.startsWith('/delivery') ||
    location.pathname.startsWith('/account');

  // Single source of truth for theme application
  useEffect(() => {
    const root = document.documentElement;
    const systemPrefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolvedThemeMode =
      globalColorMode === 'light' || globalColorMode === 'dark'
        ? globalColorMode
        : globalColorMode === 'system'
          ? (systemPrefersDark ? 'dark' : 'light')
          : themeMode;

    const resolvedTheme = resolveTheme(themeConfig, resolvedThemeMode);

    // Apply mode-aware theme variables globally.
    root.dataset.theme = resolvedTheme.id;
    root.dataset.colorMode = resolvedThemeMode;
    Object.entries(resolvedTheme.variables || {}).forEach(([key, value]) => {
      root.style.setProperty(key, String(value));
    });
    if (resolvedTheme.fontFamily) {
      root.style.setProperty('--font-family', resolvedTheme.fontFamily);
      root.style.fontFamily = resolvedTheme.fontFamily;
    }

    // Apply SEO meta tags
    if (identity.seoTitle || identity.name) document.title = identity.seoTitle || identity.name;
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    metaDesc.setAttribute('content', identity.seoDescription || identity.description || '');
    document.head.appendChild(metaDesc);
    if (identity.faviconUrl) {
      let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!icon) {
        icon = document.createElement('link');
        icon.rel = 'icon';
        document.head.appendChild(icon);
      }
      icon.href = assetUrl(identity.faviconUrl);
    }

    // Sync dark mode, accessibility, high contrast
    root.classList.add('theme-transitioning');
    root.classList.toggle('dark', resolvedThemeMode === 'dark');
    root.classList.toggle('accessibility-on', accessibility);
    root.classList.toggle('high-contrast', highContrast);
    const timeout = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeConfig, themeMode, accessibility, highContrast, globalColorMode, identity.seoTitle, identity.name, identity.seoDescription, identity.description, identity.faviconUrl]);

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundColor: 'rgb(var(--color-gray-50))',
        color: 'rgb(var(--color-gray-900))',
        fontFamily: 'var(--font-family, \'Inter\', system-ui, -apple-system, sans-serif)',
      }}
      aria-label="Site layout"
    >
      {/* Skip-to-content link for keyboard users */}
      <a href="#main-content" className="skip-to-content" id="skip-link">
        Skip to main content
      </a>
      {!isPanelRoute && <Navbar />}
      <main
        id="main-content"
        className="flex-1"
        role="main"
        aria-label="Main content"
      >
        <Outlet />
      </main>
      {!isPanelRoute && (
        <>
          <Footer />
          <AccessibilityDock hideTrigger />
          <ChatBubble hideTrigger />
          <BackToTop hideTrigger />
          <LiveSupport hideTrigger />
          <FloatingActions />
        </>
      )}
    </div>
  );
}
