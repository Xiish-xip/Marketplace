import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { get, post, put, del } from '../../lib/api-enhanced';
import {
  Package, ShoppingCart, Settings, RefreshCw, Upload, Search, Truck,
  Globe, Loader2, CheckCircle2, XCircle, AlertTriangle, Plus,
  ChevronDown, ChevronRight, BarChart3, Layers, Shield, Zap,
  Factory, ExternalLink, Clock, Star, BadgeCheck, FileText,
  Send, Eye, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { useAuthStore } from '../../lib/auth-store';
import { StatusBadge } from '../admin/AdminResourcePage';
import DropshipOperationsWorkspace from '../dropship/DropshipOperationsWorkspace';

type Tab = 'overview' | 'operations' | 'apply' | 'connections' | 'products' | 'orders';

const PROVIDER_META: Record<string, { name: string; color: string; icon: string }> = {
  cjdropshipping: { name: 'CJ Dropshipping', color: 'orange', icon: '🇨🇳' },
  aliexpress: { name: 'AliExpress', color: 'red', icon: '🇨🇳' },
  amazon: { name: 'Amazon', color: 'yellow', icon: '🇺🇸' },
  alibaba: { name: 'Alibaba', color: 'blue', icon: '🇨🇳' },
  custom: { name: 'Custom Provider', color: 'gray', icon: '🔗' },
};

export default function SellerDropshipping() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Check if seller has dropship access
  const accessQuery = useQuery({
    queryKey: ['seller-dropship-access'],
    queryFn: () => get<any>('/dropship/access'),
  });

  const hasAccess = accessQuery.data?.data?.hasAccess;
  const sellerType = accessQuery.data?.data?.sellerType;
  const application = accessQuery.data?.data?.application;

  const tabs: { key: Tab; label: string; icon: React.ReactNode; requiresAccess?: boolean }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'operations', label: 'Operations', icon: <Truck className="w-4 h-4" />, requiresAccess: true },
    { key: 'apply', label: 'Apply / Status', icon: <FileText className="w-4 h-4" /> },
    { key: 'connections', label: 'Connections', icon: <Globe className="w-4 h-4" />, requiresAccess: true },
    { key: 'products', label: 'Search & Import', icon: <Search className="w-4 h-4" />, requiresAccess: true },
    { key: 'orders', label: 'Dropship Orders', icon: <ShoppingCart className="w-4 h-4" />, requiresAccess: true },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dropshipping Hub</h1>
            <p className="mt-1 text-teal-200">
              {hasAccess
                ? `You have dropshipping access — connect to suppliers and start selling`
                : `Apply for dropshipping to import products from global suppliers`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasAccess ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm">
                <BadgeCheck className="w-4 h-4 text-green-300" />
                <span>Dropship Verified</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm">
                <Shield className="w-4 h-4 text-yellow-300" />
                <span>Apply Required</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            disabled={tab.requiresAccess && !hasAccess}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-teal-500 text-teal-600 bg-teal-50'
                : tab.requiresAccess && !hasAccess
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <SellerOverviewTab hasAccess={!!hasAccess} application={application} />}
      {activeTab === 'operations' && <DropshipOperationsWorkspace tone="seller" scope="seller" />}
      {activeTab === 'apply' && <ApplyForAccessTab currentStatus={application?.status} />}
      {activeTab === 'connections' && <SellerConnectionsTab />}
      {activeTab === 'products' && <SellerSearchImportTab />}
      {activeTab === 'orders' && <SellerOrdersTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SELLER OVERVIEW
// ═══════════════════════════════════════════════

function SellerOverviewTab({ hasAccess, application }: { hasAccess: boolean; application?: any }) {
  const dashboardQuery = useQuery({
    queryKey: ['seller-dropship-dashboard'],
    queryFn: () => get<any>('/dropship/seller-dashboard'),
    enabled: hasAccess,
  });

  const stats = dashboardQuery.data?.data;

  if (!hasAccess) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800">Dropshipping Access Required</h3>
              <p className="mt-1 text-sm text-yellow-700">
                You need to apply and get approved before you can use dropshipping features.
                Go to the <strong>Apply / Status</strong> tab to submit your application.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-gray-900">Benefits of Dropshipping</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-teal-500" />
                <h4 className="font-medium text-gray-900">Global Suppliers</h4>
              </div>
              <p className="mt-1 text-sm text-gray-500">Import products from CJ, AliExpress, Amazon, Alibaba and more</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-teal-500" />
                <h4 className="font-medium text-gray-900">Auto Sync</h4>
              </div>
              <p className="mt-1 text-sm text-gray-500">Inventory and pricing sync automatically from suppliers</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-teal-500" />
                <h4 className="font-medium text-gray-900">Verified Badge</h4>
              </div>
              <p className="mt-1 text-sm text-gray-500">Get a verified dropshipper badge on your store profile</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Connected Providers</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{stats?.connections || 0}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Imported Products</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{stats?.mappings || 0}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Dropship Orders</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{stats?.orders || 0}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-gray-900">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <a
            href="/seller/dropshipping?tab=connections"
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={(e) => {
              e.preventDefault();
              // Navigate to connections tab via parent state
              const event = new CustomEvent('navigate-dropship-tab', { detail: 'connections' });
              window.dispatchEvent(event);
            }}
          >
            <Globe className="w-4 h-4" /> Manage Connections
          </a>
          <a
            href="/seller/dropshipping?tab=products"
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('navigate-dropship-tab', { detail: 'products' }));
            }}
          >
            <Search className="w-4 h-4" /> Browse & Import
          </a>
          <a
            href="/seller/dropshipping?tab=orders"
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('navigate-dropship-tab', { detail: 'orders' }));
            }}
          >
            <ShoppingCart className="w-4 h-4" /> View Orders
          </a>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  APPLY FOR ACCESS
// ═══════════════════════════════════════════════

function ApplyForAccessTab({ currentStatus }: { currentStatus?: string }) {
  const qc = useQueryClient();
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('individual');
  const [experience, setExperience] = useState('');
  const [targetMarkets, setTargetMarkets] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch existing application
  const applicationQuery = useQuery({
    queryKey: ['seller-dropship-application'],
    queryFn: () => get<any>('/dropship/application'),
  });

  const app = applicationQuery.data?.data;

  const submitMutation = useMutation({
    mutationFn: (data: any) => post('/dropship/apply', data),
    onSuccess: (data) => {
      toast.success('Application submitted! Pending admin review.');
      applicationQuery.refetch();
      qc.invalidateQueries({ queryKey: ['seller-dropship-access'] });
    },
    onError: (err: any) => toast.error(err.message || 'Submission failed'),
  });

  if (app?.status === 'APPROVED') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <BadgeCheck className="mx-auto mb-3 h-12 w-12 text-green-500" />
        <h3 className="text-lg font-semibold text-green-800">Application Approved!</h3>
        <p className="mt-1 text-sm text-green-600">
          You have full access to all dropshipping features. Start connecting to suppliers!
        </p>
      </div>
    );
  }

  if (app?.status === 'PENDING') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-5">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800">Application Under Review</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Your application is being reviewed by the admin team. You'll be notified once approved.
              </p>
            </div>
          </div>
        </div>

        {app?.metadata && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h4 className="font-medium text-gray-900 mb-2">Your Application Details</h4>
            <pre className="text-sm text-gray-600 whitespace-pre-wrap">
              {JSON.stringify(JSON.parse(app.metadata), null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (app?.status === 'REJECTED') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <XCircle className="w-6 h-6 text-red-500 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Application Rejected</h3>
            <p className="mt-1 text-sm text-red-700">
              {app?.adminNotes || 'Your application was not approved. You may re-apply with more details.'}
            </p>
            <button
              onClick={() => {
                // Reset form and re-submit logic
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              <RefreshCw className="w-4 h-4" /> Re-Apply
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show application form
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-4 font-semibold text-gray-900">Apply for Dropshipping Access</h3>
        <p className="mb-4 text-sm text-gray-500">
          Complete this application to get access to our multi-provider dropshipping system.
          Approved sellers receive a verified dropshipper badge on their store.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitMutation.mutate({
              businessName,
              businessType,
              experience,
              targetMarkets,
              notes,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              placeholder="Your store or business name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Business Type</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="individual">Individual / Sole Proprietor</option>
              <option value="company">Registered Company</option>
              <option value="partnership">Partnership</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Dropshipping Experience
            </label>
            <textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              placeholder="Describe your experience with dropshipping or e-commerce..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Target Markets / Countries
            </label>
            <input
              type="text"
              value={targetMarkets}
              onChange={(e) => setTargetMarkets(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              placeholder="e.g., US, EU, Africa, Asia"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              placeholder="Any additional information..."
            />
          </div>

          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit Application
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-teal-50 p-5">
        <h3 className="mb-3 font-semibold text-teal-800">What You Get</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-teal-800">Multi-Provider Access</p>
              <p className="text-xs text-teal-600">Import from CJ Dropshipping, AliExpress, Amazon, Alibaba</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-teal-800">Verified Dropshipper Badge</p>
              <p className="text-xs text-teal-600">Get a verified badge on your store profile</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-teal-800">Auto Sync</p>
              <p className="text-xs text-teal-600">Prices and inventory sync automatically</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-teal-800">Order Automation</p>
              <p className="text-xs text-teal-600">Orders route directly to suppliers</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-teal-800">Global Product Catalog</p>
              <p className="text-xs text-teal-600">Access millions of products to sell</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SELLER CONNECTIONS
// ═══════════════════════════════════════════════

function SellerConnectionsTab() {
  const qc = useQueryClient();

  const connectionsQuery = useQuery({
    queryKey: ['seller-provider-connections'],
    queryFn: () => get<any[]>('/dropship/my-connections'),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => post(`/dropship/connections/${id}/test`, {}),
    onSuccess: (data) => {
      if (data.data?.status === 'CONNECTED') toast.success('Connection verified!');
      else toast.error(data.data?.message || 'Test failed');
      connectionsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Test failed'),
  });

  const connections = connectionsQuery.data?.data || [];

  return (
    <div className="space-y-4">
      {connections.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Globe className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <h3 className="font-semibold text-gray-900">No Connections Yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Your admin will configure provider connections for your dropshipping store.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {connections.map((conn: any) => {
          const meta = PROVIDER_META[conn.adapter?.provider] || {
            name: conn.adapter?.name || 'Unknown',
            color: 'gray',
            icon: '🔗',
          };
          return (
            <div key={conn.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-lg">
                    {meta.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{meta.name}</h3>
                    <p className="text-xs text-gray-500">
                      {conn.isVerified ? (
                        <span className="text-green-600">Connected & Verified</span>
                      ) : (
                        <span className="text-yellow-600">Pending Verification</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => testMutation.mutate(conn.id)}
                  disabled={testMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Shield className="w-3 h-3" />
                  )}
                  Test
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SELLER SEARCH & IMPORT
// ═══════════════════════════════════════════════

function SellerSearchImportTab() {
  const connectionsQuery = useQuery({
    queryKey: ['seller-provider-connections'],
    queryFn: () => get<any[]>('/dropship/my-connections'),
  });

  const [selectedConnection, setSelectedConnection] = useState('');
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const connections = connectionsQuery.data?.data || [];

  const searchMutation = useMutation({
    mutationFn: (params: { connectionId: string; keyword: string }) =>
      post(`/dropship/connections/${params.connectionId}/search`, { keyword: params.keyword }),
    onSuccess: (data) => {
      setResults(data.data?.products || []);
      if (!data.data?.products?.length) toast('No products found');
    },
    onError: (err: any) => toast.error(err.message || 'Search failed'),
  });

  const importMutation = useMutation({
    mutationFn: (params: { connectionId: string; keyword: string }) =>
      post(`/dropship/connections/${params.connectionId}/import-products`, {
        keyword: params.keyword || undefined,
        maxProducts: 20,
      }),
    onSuccess: (data) => {
      toast.success(`Imported ${data.data?.imported} products`);
      setResults([]);
    },
    onError: (err: any) => toast.error(err.message || 'Import failed'),
  });

  const handleSearch = () => {
    if (!selectedConnection) { toast.error('Select a connection'); return; }
    searchMutation.mutate({ connectionId: selectedConnection, keyword });
  };

  if (connections.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <Search className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <h3 className="font-semibold text-gray-900">No Connections Active</h3>
        <p className="mt-1 text-sm text-gray-500">
          Ask your admin to enable provider connections for your dropshipping store.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Provider</label>
            <select
              value={selectedConnection}
              onChange={(e) => setSelectedConnection(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="">Select...</option>
              {connections.map((conn: any) => {
                const meta = PROVIDER_META[conn.adapter?.provider] || { name: conn.adapter?.name };
                return (
                  <option key={conn.id} value={conn.id}>
                    {meta.name} {conn.isVerified ? '✓' : ''}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search Products</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              placeholder="Search supplier catalog..."
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searchMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
          >
            {searchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Browse
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{results.length} products</p>
            <button
              onClick={() => importMutation.mutate({ connectionId: selectedConnection, keyword })}
              disabled={importMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-teal-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
            >
              {importMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              Import All
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((product: any, idx: number) => (
              <div key={product.sku || idx} className="rounded-lg border border-gray-200 bg-white p-3">
                {product.images?.[0] && (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="mb-2 h-36 w-full rounded-lg object-cover bg-gray-100"
                    onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                  />
                )}
                <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{product.title}</h4>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-lg font-bold text-teal-600">
                    {product.currency} {product.price?.toFixed(2)}
                  </p>
                  {product.url && (
                    <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-teal-600">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {product.category && (
                  <span className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                    {product.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SELLER ORDERS
// ═══════════════════════════════════════════════

function SellerOrdersTab() {
  const ordersQuery = useQuery({
    queryKey: ['seller-dropship-orders'],
    queryFn: () => get<any>('/dropship/my-orders'),
  });

  const orders = ordersQuery.data?.data?.orders || [];

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left font-medium text-gray-500">Supplier Order</th>
            <th className="px-3 py-3 text-left font-medium text-gray-500">Provider</th>
            <th className="px-3 py-3 text-left font-medium text-gray-500">Total</th>
            <th className="px-3 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-3 py-3 text-left font-medium text-gray-500">Tracking</th>
            <th className="px-3 py-3 text-left font-medium text-gray-500">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {orders.map((order: any) => (
            <tr key={order.id} className="hover:bg-gray-50">
              <td className="px-3 py-3 font-mono text-xs text-gray-900">{order.supplierOrderId?.slice(0, 20)}</td>
              <td className="px-3 py-3 text-xs text-gray-500">{order.supplier?.provider || '-'}</td>
              <td className="px-3 py-3 font-mono text-xs text-gray-900">
                {order.currency} {order.totalCost?.toFixed(2)}
              </td>
              <td className="px-3 py-3">
                <StatusBadge value={order.status} />
              </td>
              <td className="px-3 py-3">
                {order.trackingUrl ? (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-teal-600 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Track
                  </a>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-3 py-3 text-xs text-gray-500">
                {new Date(order.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-12 text-center text-sm text-gray-500">
                <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                No dropship orders yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
