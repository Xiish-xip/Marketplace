import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { get, post } from '../../lib/api-enhanced';
import { StatusBadge } from './AdminResourcePage';
import { Search, Package, Truck, Settings, RefreshCw, Upload, ShoppingCart, MapPin, Globe, DollarSign, Warehouse, ExternalLink, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

// ─── Types ───
interface CJConfig {
  id: string;
  name: string;
  apiKey: string | null;
  storeUrl: string | null;
  currency: string;
  isVerified: boolean;
  isActive: boolean;
  profitMargin: number;
}

interface CJDashboard {
  totalMappings: number;
  recentOrders: any[];
  recentImports: any[];
}

type Tab = 'dashboard' | 'configure' | 'search' | 'mappings' | 'orders' | 'warehouses';

export default function AdminCJDropshipping() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [supplierId, setSupplierId] = useState<string | null>(null);

  // Fetch config to get supplier ID
  const configQuery = useQuery({
    queryKey: ['cj-config'],
    queryFn: () => get<CJConfig>('/cj-dropshipping/config'),
  });

  const cjConfig = configQuery.data?.data;

  useEffect(() => {
    if (cjConfig?.id) {
      setSupplierId(cjConfig.id);
    }
  }, [cjConfig]);

  // Dashboard data
  const dashboardQuery = useQuery({
    queryKey: ['cj-dashboard', supplierId],
    queryFn: () => get<CJDashboard>(`/cj-dropshipping/suppliers/${supplierId}/dashboard`),
    enabled: !!supplierId,
  });

  const isConfigured = !!cjConfig?.isVerified;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <Package className="w-4 h-4" /> },
    { key: 'configure', label: 'Configure', icon: <Settings className="w-4 h-4" /> },
    { key: 'search', label: 'Search Products', icon: <Search className="w-4 h-4" /> },
    { key: 'mappings', label: 'Mappings', icon: <Package className="w-4 h-4" /> },
    { key: 'orders', label: 'Orders', icon: <ShoppingCart className="w-4 h-4" /> },
    { key: 'warehouses', label: 'Warehouses', icon: <Warehouse className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-orange-500 to-red-500 p-5 text-white">
        <div>
          <h1 className="text-2xl font-bold">CJ Dropshipping</h1>
          <p className="mt-1 text-orange-100">
            {isConfigured
              ? `Connected as ${cjConfig?.name || 'CJ Supplier'}`
              : 'Connect your CJ Dropshipping API to start sourcing products'}
          </p>
        </div>
        {isConfigured && (
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-300" />
            <span>API Connected</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <DashboardTab supplierId={supplierId} isConfigured={isConfigured} />
      )}
      {activeTab === 'configure' && (
        <ConfigureTab onConfigured={() => { configQuery.refetch(); qc.invalidateQueries({ queryKey: ['cj-config'] }); setActiveTab('dashboard'); }} />
      )}
      {activeTab === 'search' && <SearchTab supplierId={supplierId} isConfigured={isConfigured} />}
      {activeTab === 'mappings' && <MappingsTab supplierId={supplierId} isConfigured={isConfigured} />}
      {activeTab === 'orders' && <OrdersTab supplierId={supplierId} isConfigured={isConfigured} />}
      {activeTab === 'warehouses' && <WarehousesTab supplierId={supplierId} isConfigured={isConfigured} />}
    </div>
  );
}

// ─── Dashboard Tab ───
function DashboardTab({ supplierId, isConfigured }: { supplierId: string | null; isConfigured: boolean }) {
  const dashboardQuery = useQuery({
    queryKey: ['cj-dashboard', supplierId],
    queryFn: () => get<any>(`/cj-dropshipping/suppliers/${supplierId}/dashboard`),
    enabled: !!supplierId && isConfigured,
  });

  const stats = dashboardQuery.data?.data;
  if (!isConfigured) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <Settings className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-900">Not Configured</h3>
        <p className="mt-1 text-sm text-gray-500">Configure your CJ Dropshipping API key to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Total Mappings</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{stats?.totalMappings || 0}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Recent Orders</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{stats?.recentOrders?.length || 0}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Import Jobs</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{stats?.recentImports?.length || 0}</p>
        </div>
      </div>

      {stats?.recentOrders?.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-gray-900">Recent Dropship Orders</h3>
          <div className="space-y-2">
            {stats.recentOrders.map((order: any) => (
              <div key={order.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{order.supplierOrderId}</p>
                  <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <StatusBadge value={order.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {stats?.recentImports?.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-gray-900">Recent Imports</h3>
          <div className="space-y-2">
            {stats.recentImports.map((job: any) => (
              <div key={job.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {job.totalItems} products ({job.imported} imported)
                  </p>
                  <p className="text-xs text-gray-500">{new Date(job.createdAt).toLocaleDateString()}</p>
                </div>
                <StatusBadge value={job.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Configure Tab ───
function ConfigureTab({ onConfigured }: { onConfigured: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [validatedKey, setValidatedKey] = useState('');
  const [name, setName] = useState('CJ Dropshipping');
  const [storeUrl, setStoreUrl] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [profitMargin, setProfitMargin] = useState(30);

  const testMutation = useMutation({
    mutationFn: (key: string) => post('/cj-dropshipping/test-connection', { apiKey: key }),
    onSuccess: (data) => {
      if (data.data?.success) {
        setValidatedKey(apiKey);
        toast.success('Connection successful!');
      } else {
        setValidatedKey('');
        toast.error(data.data?.message || 'Connection failed');
      }
    },
    onError: (err: any) => {
      setValidatedKey('');
      toast.error(err.message || 'Connection failed');
    },
  });

  const configureMutation = useMutation({
    mutationFn: () =>
      post('/cj-dropshipping/configure', {
        apiKey,
        name,
        storeUrl: storeUrl || undefined,
        currency,
        profitMargin: profitMargin / 100,
      }),
    onSuccess: () => {
      toast.success('CJ Dropshipping configured successfully!');
      onConfigured();
    },
    onError: (err: any) => toast.error(err.message || 'Configuration failed'),
  });

  const existingConfig = useQuery({
    queryKey: ['cj-config'],
    queryFn: () => get<any>('/cj-dropshipping/config'),
  });

  const config = existingConfig.data?.data;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-4 font-semibold text-gray-900">API Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Supplier Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              placeholder="My CJ Store"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CJ Dropshipping API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setValidatedKey('');
              }}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              placeholder={config?.apiKey ? '••••••••' + config.apiKey.slice(-4) : 'Enter your CJ API key'}
            />
            <p className="mt-1 text-xs text-gray-500">
              Get your API key from{' '}
              <a href="https://developers.cjdropshipping.com" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                CJ Developer Center
              </a>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Store URL (optional)</label>
            <input
              type="url"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CNY">CNY</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Profit Margin (%)</label>
              <input
                type="number"
                value={profitMargin}
                onChange={(e) => setProfitMargin(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                min={0}
                max={500}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => testMutation.mutate(apiKey)}
              disabled={!apiKey || testMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Test Connection
            </button>
            <button
              onClick={() => configureMutation.mutate()}
              disabled={!apiKey || validatedKey !== apiKey || configureMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {configureMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save & Activate
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-4 font-semibold text-gray-900">Current Configuration</h3>
        {config ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-sm text-gray-600">Status</span>
              <StatusBadge value={config.isVerified ? 'CONNECTED' : 'INACTIVE'} />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-sm text-gray-600">Supplier Name</span>
              <span className="text-sm font-medium text-gray-900">{config.name}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-sm text-gray-600">API Key</span>
              <span className="text-sm font-medium text-gray-900">{config.apiKey || 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-sm text-gray-600">Profit Margin</span>
              <span className="text-sm font-medium text-gray-900">{Math.round(config.profitMargin * 100)}%</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-sm text-gray-600">Currency</span>
              <span className="text-sm font-medium text-gray-900">{config.currency}</span>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-500">
            <Settings className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p>Not configured yet. Enter your API key to connect.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Search Tab ───
function SearchTab({ supplierId, isConfigured }: { supplierId: string | null; isConfigured: boolean }) {
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const categoriesQuery = useQuery({
    queryKey: ['cj-categories', supplierId],
    queryFn: () => get<any[]>(`/cj-dropshipping/suppliers/${supplierId}/categories`),
    enabled: !!supplierId && isConfigured,
  });

  const importMutation = useMutation({
    mutationFn: () =>
      post(`/cj-dropshipping/suppliers/${supplierId}/import`, {
        keyword: keyword || undefined,
        categoryId: categoryId || undefined,
        maxProducts: 8,
      }),
    onSuccess: (data) => {
      toast.success(`Import completed: ${data.data?.imported} products imported`);
      setResults([]);
    },
    onError: (err: any) => toast.error(err.message || 'Import failed'),
  });

  const pushMutation = useMutation({
    mutationFn: (mappingIds: string[]) =>
      post(`/cj-dropshipping/suppliers/${supplierId}/push-to-store`, { mappingIds }),
    onSuccess: (data) => {
      const pushed = data.data?.pushed ?? data.data?.created ?? 0;
      const created = data.data?.created ?? 0;
      const updated = data.data?.updated ?? 0;
      const errors = data.data?.errors || [];
      if (pushed > 0) toast.success(`Pushed ${pushed} products to store (${created} new, ${updated} updated)`);
      else toast.error(errors[0] || 'No products were pushed to store');
      if (errors.length) toast.error(`${errors.length} products failed. First error: ${errors[0]}`);
      setSelectedIds([]);
    },
    onError: (err: any) => toast.error(err.message || 'Push failed'),
  });

  const handleSearch = async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (categoryId) params.set('categoryId', categoryId);
      params.set('pageSize', '20');
      const res = await get<any>(`/cj-dropshipping/suppliers/${supplierId}/products/search?${params.toString()}`);
      setResults(res.data?.products || []);
      if (!res.data?.products?.length) toast('No products found');
    } catch (err: any) {
      toast.error(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured) {
    return <NotConfiguredMessage />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search Products</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              placeholder="Search CJ catalog..."
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {(categoriesQuery.data?.data || []).map((cat: any) => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{results.length} products found</p>
            <div className="flex gap-2">
              <button
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
                className="flex items-center gap-2 rounded-lg border border-orange-300 px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
              >
                {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import Up to 8 Mappings
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((product: any) => (
              <div key={product.pid} className="rounded-lg border border-gray-200 bg-white p-3">
                {product.productImage && (
                  <img
                    src={product.productImage}
                    alt={product.productName}
                    className="mb-2 h-40 w-full rounded-lg object-cover"
                  />
                )}
                <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{product.productName}</h4>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-orange-600">${product.sellPrice || product.originalPrice || 0}</p>
                    <p className="text-xs text-gray-500">SKU: {product.pid?.slice(0, 12)}...</p>
                  </div>
                  {product.productUrl && (
                    <a href={product.productUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-orange-600">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {product.shipping?.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">Shipping from {product.shipping[0]?.estimatedDays}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Mappings Tab ───
function MappingsTab({ supplierId, isConfigured }: { supplierId: string | null; isConfigured: boolean }) {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const mappingsQuery = useQuery({
    queryKey: ['cj-mappings', supplierId],
    queryFn: () => get<any[]>(`/cj-dropshipping/suppliers/${supplierId}/mappings`),
    enabled: !!supplierId && isConfigured,
  });

  const pushMutation = useMutation({
    mutationFn: (mappingIds: string[]) =>
      post(`/cj-dropshipping/suppliers/${supplierId}/push-to-store`, { mappingIds }),
    onSuccess: (data) => {
      const pushed = data.data?.pushed ?? data.data?.created ?? 0;
      const created = data.data?.created ?? 0;
      const updated = data.data?.updated ?? 0;
      const errors = data.data?.errors || [];
      if (pushed > 0) toast.success(`Pushed ${pushed} products to store (${created} new, ${updated} updated)`);
      else toast.error(errors[0] || 'No products were pushed to store');
      if (errors.length) toast.error(`${errors.length} products failed. First error: ${errors[0]}`);
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ['cj-mappings'] });
    },
    onError: (err: any) => toast.error(err.message || 'Push failed'),
  });

  const syncMutation = useMutation({
    mutationFn: () => post(`/cj-dropshipping/suppliers/${supplierId}/sync-pricing`),
    onSuccess: (data) => {
      toast.success(`Synced ${data.data?.updated} products`);
      qc.invalidateQueries({ queryKey: ['cj-mappings'] });
    },
    onError: (err: any) => toast.error(err.message || 'Sync failed'),
  });

  const mappings = mappingsQuery.data?.data || [];

  if (!isConfigured) return <NotConfiguredMessage />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{mappings.length} product mappings</p>
        <div className="flex gap-2">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Pricing
          </button>
          <button
            onClick={() => pushMutation.mutate(selectedIds)}
            disabled={!selectedIds.length || pushMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {pushMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Push to Store ({selectedIds.length})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(mappings.map((m: any) => m.id));
                    else setSelectedIds([]);
                  }}
                  checked={selectedIds.length === mappings.length && mappings.length > 0}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Product</th>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Cost</th>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Selling Price</th>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Stock</th>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Linked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mappings.map((mapping: any) => (
              <tr key={mapping.id} className="hover:bg-gray-50">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(mapping.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds([...selectedIds, mapping.id]);
                      else setSelectedIds(selectedIds.filter((id) => id !== mapping.id));
                    }}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    {mapping.imageUrl && (
                      <img src={mapping.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                    )}
                    <span className="font-medium text-gray-900 line-clamp-1">{mapping.supplierTitle}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-gray-700">${mapping.costPrice?.toFixed(2)}</td>
                <td className="px-3 py-3 text-gray-900 font-medium">${mapping.sellingPrice?.toFixed(2)}</td>
                <td className="px-3 py-3 text-gray-700">{mapping.quantity}</td>
                <td className="px-3 py-3">
                  <StatusBadge value={mapping.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </td>
                <td className="px-3 py-3">
                  {mapping.localProductId ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      <CheckCircle2 className="w-3 h-3" /> Linked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                      <XCircle className="w-3 h-3" /> Not Linked
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {mappings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                  No product mappings yet. Search and import products from CJ first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Orders Tab ───
function OrdersTab({ supplierId, isConfigured }: { supplierId: string | null; isConfigured: boolean }) {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const ordersQuery = useQuery({
    queryKey: ['cj-orders', supplierId],
    queryFn: () => get<any>(`/cj-dropshipping/suppliers/${supplierId}/dropship-orders`),
    enabled: !!supplierId && isConfigured,
  });

  const trackingQuery = useQuery({
    queryKey: ['cj-tracking', selectedOrder],
    queryFn: () => get<any>(`/cj-dropshipping/suppliers/${supplierId}/orders/${selectedOrder}/tracking`),
    enabled: !!selectedOrder && !!supplierId && isConfigured,
  });

  const orders = ordersQuery.data?.data || [];

  if (!isConfigured) return <NotConfiguredMessage />;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left font-medium text-gray-500">Order #</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">Local Order</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">Total</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">Tracking</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 font-medium text-gray-900">{order.supplierOrderId?.slice(0, 16)}...</td>
                  <td className="px-3 py-3 text-gray-700">{order.localOrderId?.slice(0, 8)}...</td>
                  <td className="px-3 py-3 text-gray-900">
                    ${order.totalCost?.toFixed(2)} {order.currency}
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
                        className="inline-flex items-center gap-1 text-orange-600 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> Track
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                    No dropship orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Warehouses Tab ───
function WarehousesTab({ supplierId, isConfigured }: { supplierId: string | null; isConfigured: boolean }) {
  const warehousesQuery = useQuery({
    queryKey: ['cj-warehouses', supplierId],
    queryFn: () => get<any[]>(`/cj-dropshipping/suppliers/${supplierId}/warehouses`),
    enabled: !!supplierId && isConfigured,
  });

  if (!isConfigured) return <NotConfiguredMessage />;

  const warehouses = warehousesQuery.data?.data || [];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 font-semibold text-gray-900">CJ Warehouses</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {warehouses.map((wh: any) => (
          <div key={wh.warehouseId} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-orange-500" />
              <h4 className="font-medium text-gray-900">{wh.warehouseName}</h4>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
              <Globe className="h-3.5 w-3.5" />
              {wh.country}
            </div>
          </div>
        ))}
        {warehouses.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-gray-500">No warehouses found.</p>
        )}
      </div>
    </div>
  );
}

function NotConfiguredMessage() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
      <Settings className="mx-auto mb-3 h-12 w-12 text-gray-300" />
      <h3 className="text-lg font-semibold text-gray-900">Not Configured</h3>
      <p className="mt-1 text-sm text-gray-500">
        Please configure your CJ Dropshipping API key in the Configure tab first.
      </p>
    </div>
  );
}
