import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import ProtectedLayout from '../shared/ProtectedLayout';
import ErrorBoundary from '../../components/ErrorBoundary';
import {
  LayoutDashboard, LayoutTemplate, Image, Users, Shield, Layers, ClipboardList,
  BookOpen, Bell, Gift, Ticket, Key, Puzzle, Bot, MessageSquare, Workflow, Cpu,
  FileEdit, Mic, Activity, DollarSign, Search, Database, Truck, CreditCard, Star,
  Briefcase, BarChart3, RefreshCw, Link, ShoppingCart, Package, Store, RotateCcw,
  Percent, Heart, PenTool, Upload, Globe, Settings, ShieldAlert, Terminal, Headphones,
  Smile, Speaker, Zap, BarChart, Megaphone, Tag, MapPin, Award, FileText,
  ShoppingBag, Sliders, Palette, Mail, ListOrdered, Code, TrendingUp,
  Network, ClipboardCheck, Radio, GitBranch, Layers3, ReplaceAll,
  Blocks, Workflow as WorkflowIcon, BadgeCheck, Handshake
} from 'lucide-react';
import type { NavGroup } from '../shared/ProtectedLayout';

const navGroups: NavGroup[] = [
  {
    group: '📊 Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 className="w-5 h-5" /> },
      { label: 'Audit Intelligence', href: '/admin/audit-logs', icon: <Activity className="w-5 h-5" /> },
    ],
  },
  {
    group: '🛒 Commerce',
    items: [
      {
        label: 'Catalog',
        href: '/admin/products',
        icon: <Package className="w-5 h-5" />,
        children: [
          { label: 'Products', href: '/admin/products', icon: <ShoppingBag className="w-4 h-4" /> },
          { label: 'Categories', href: '/admin/categories', icon: <Layers className="w-4 h-4" /> },
          { label: 'Brands', href: '/admin/brands', icon: <Tag className="w-4 h-4" /> },
          { label: 'Reviews', href: '/admin/reviews', icon: <Star className="w-4 h-4" /> },
        ],
      },
      {
        label: 'Orders & Fulfillment',
        href: '/admin/orders',
        icon: <ShoppingCart className="w-5 h-5" />,
        children: [
          { label: 'Orders', href: '/admin/orders', icon: <ListOrdered className="w-4 h-4" /> },
          { label: 'Returns', href: '/admin/returns', icon: <RotateCcw className="w-4 h-4" /> },
          { label: 'Shipping', href: '/admin/shipping', icon: <MapPin className="w-4 h-4" /> },
          { label: 'Deliveries', href: '/admin/deliveries', icon: <Truck className="w-4 h-4" /> },
        ],
      },
      {
        label: 'Marketing',
        href: '/admin/promotions',
        icon: <Percent className="w-5 h-5" />,
        children: [
          { label: 'Promotions', href: '/admin/promotions', icon: <Percent className="w-4 h-4" /> },
          { label: 'Campaigns', href: '/admin/campaigns', icon: <Megaphone className="w-4 h-4" /> },
          { label: 'Badges', href: '/admin/badges', icon: <Award className="w-4 h-4" /> },
        ],
      },
    ],
  },
  {
    group: '👥 Users & Access',
    items: [
      { label: 'Users', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
      { label: 'Roles & Permissions', href: '/admin/roles', icon: <Shield className="w-5 h-5" /> },
      {
        label: 'Seller Management',
        href: '/admin/sellers',
        icon: <Store className="w-5 h-5" />,
        children: [
          { label: 'Sellers', href: '/admin/sellers', icon: <Store className="w-4 h-4" /> },
            { label: 'Dropshipping', href: '/admin/dropshipping', icon: <Truck className="w-4 h-4" /> },
            { label: 'CJ Dropshipping', href: '/admin/cj-dropshipping', icon: <Truck className="w-4 h-4" /> },
        ],
      },
    ],
  },
  {
    group: '💰 Financial',
    items: [
      { label: 'Payments', href: '/admin/payments', icon: <DollarSign className="w-5 h-5" /> },
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: <CreditCard className="w-5 h-5" /> },
      { label: 'Loyalty Program', href: '/admin/loyalty', icon: <Star className="w-5 h-5" /> },
      { label: 'Gift Cards', href: '/admin/giftcards', icon: <Gift className="w-5 h-5" /> },
      { label: 'B2B Enterprise', href: '/admin/b2b', icon: <Briefcase className="w-5 h-5" /> },
    ],
  },
  {
    group: '🎨 Content & Design',
    items: [
      {
        label: 'Page Builder',
        href: '/admin/page-builder',
        icon: <LayoutTemplate className="w-5 h-5" />,
        children: [
          { label: 'Layouts', href: '/admin/page-builder', icon: <LayoutTemplate className="w-4 h-4" /> },
          { label: 'Template Manager', href: '/admin/page-builder/templates', icon: <Blocks className="w-4 h-4" /> },
        ],
      },
      {
        label: 'Content',
        href: '/admin/pages',
        icon: <FileText className="w-5 h-5" />,
        children: [
          { label: 'Pages', href: '/admin/pages', icon: <FileText className="w-4 h-4" /> },
          { label: 'Blog', href: '/admin/blog', icon: <BookOpen className="w-4 h-4" /> },
          { label: 'Announcements', href: '/admin/announcements', icon: <Megaphone className="w-4 h-4" /> },
        ],
      },
      {
        label: 'Media',
        href: '/admin/assets',
        icon: <Image className="w-5 h-5" />,
        children: [
          { label: 'Assets', href: '/admin/assets', icon: <Image className="w-4 h-4" /> },
          { label: 'Asset Groups', href: '/admin/asset-groups', icon: <Layers className="w-4 h-4" /> },
        ],
      },
    ],
  },
  {
    group: '🤖 AI & Automation',
    items: [
      {
        label: 'AI Configuration',
        href: '/admin/ai-providers',
        icon: <Bot className="w-5 h-5" />,
        children: [
          { label: 'AI Providers', href: '/admin/ai-providers', icon: <Bot className="w-4 h-4" /> },
          { label: 'AI Config', href: '/admin/ai-config', icon: <Cpu className="w-4 h-4" /> },
          { label: 'AI Tool Registry', href: '/admin/ai-tools', icon: <Terminal className="w-4 h-4" /> },
          { label: 'AI Content Editor', href: '/admin/ai-content-editor', icon: <FileEdit className="w-4 h-4" /> },
        ],
      },
      { label: 'Chatbot', href: '/admin/chatbot', icon: <MessageSquare className="w-5 h-5" /> },
      { label: 'Workflows', href: '/admin/workflows', icon: <Workflow className="w-5 h-5" /> },
      { label: 'Voice Config', href: '/admin/voice', icon: <Mic className="w-5 h-5" /> },
    ],
  },
  {
    group: '⚙️ Platform Configuration',
    items: [
      {
        label: 'Settings',
        href: '/admin/config',
        icon: <Settings className="w-5 h-5" />,
        children: [
          { label: 'General Config', href: '/admin/config', icon: <Settings className="w-4 h-4" /> },
          { label: 'Site Settings', href: '/admin/site-settings', icon: <Palette className="w-4 h-4" /> },
          { label: 'Settings Control Center', href: '/admin/generic-settings', icon: <Sliders className="w-4 h-4" /> },
        ],
      },
      {
        label: 'Localization',
        href: '/admin/currencies',
        icon: <Globe className="w-5 h-5" />,
        children: [
          { label: 'Currencies', href: '/admin/currencies', icon: <DollarSign className="w-4 h-4" /> },
          { label: 'Currency Settings', href: '/admin/currency-settings', icon: <Settings className="w-4 h-4" /> },
          { label: 'Translations', href: '/admin/translations', icon: <Globe className="w-4 h-4" /> },
        ],
      },
      {
        label: 'System',
        href: '/admin/cache',
        icon: <Database className="w-5 h-5" />,
        children: [
          { label: 'Search Config', href: '/admin/search', icon: <Search className="w-4 h-4" /> },
          { label: 'Cache & Queues', href: '/admin/cache', icon: <Database className="w-4 h-4" /> },
          { label: 'Sync Jobs', href: '/admin/sync-jobs', icon: <RefreshCw className="w-4 h-4" /> },
        ],
      },
    ],
  },
  {
    group: '🔗 Integrations & Channel',
    items: [
      { label: 'Integrations', href: '/admin/integrations', icon: <Link className="w-5 h-5" /> },
      { label: 'API Keys', href: '/admin/api-keys', icon: <Key className="w-5 h-5" /> },
      { label: 'Plugins', href: '/admin/plugins', icon: <Puzzle className="w-5 h-5" /> },
      { label: 'Webhooks', href: '/admin/webhooks', icon: <Zap className="w-5 h-5" /> },
    ],
  },
  {
    group: '🎧 Customer Support',
    items: [
      { label: 'Tickets', href: '/admin/tickets', icon: <Headphones className="w-5 h-5" /> },
    ],
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const sequenceRef = useRef('');

  useEffect(() => {
    const routes: Record<string, string> = {
      gd: '/admin',
      gp: '/admin/products',
      gu: '/admin/users',
      go: '/admin/orders',
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '') || target?.isContentEditable;
      if (isTyping) return;
      if (event.key === '?') {
        event.preventDefault();
        setShowShortcuts((value) => !value);
        return;
      }
      if (event.key.length !== 1) return;
      sequenceRef.current = `${sequenceRef.current}${event.key.toLowerCase()}`.slice(-2);
      const nextRoute = routes[sequenceRef.current];
      if (nextRoute) {
        event.preventDefault();
        navigate(nextRoute);
        sequenceRef.current = '';
      }
      window.setTimeout(() => {
        sequenceRef.current = '';
      }, 900);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  return (
    <ProtectedLayout items={navGroups} title="Admin Panel" subtitle="Platform administration" grouped allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowShortcuts(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Keyboard shortcuts</h2>
              <button onClick={() => setShowShortcuts(false)} className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">Close</button>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p><kbd className="rounded bg-gray-100 px-1.5 py-0.5">g</kbd> <kbd className="rounded bg-gray-100 px-1.5 py-0.5">d</kbd> Dashboard</p>
              <p><kbd className="rounded bg-gray-100 px-1.5 py-0.5">g</kbd> <kbd className="rounded bg-gray-100 px-1.5 py-0.5">p</kbd> Products</p>
              <p><kbd className="rounded bg-gray-100 px-1.5 py-0.5">g</kbd> <kbd className="rounded bg-gray-100 px-1.5 py-0.5">u</kbd> Users</p>
              <p><kbd className="rounded bg-gray-100 px-1.5 py-0.5">g</kbd> <kbd className="rounded bg-gray-100 px-1.5 py-0.5">o</kbd> Orders</p>
              <p><kbd className="rounded bg-gray-100 px-1.5 py-0.5">?</kbd> Toggle this panel</p>
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}
