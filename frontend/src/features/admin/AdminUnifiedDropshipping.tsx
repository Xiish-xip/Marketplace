import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { get, post, put, del } from '../../lib/api-enhanced';
import DropshipOperationsWorkspace from '../dropship/DropshipOperationsWorkspace';
import {
  Package, ShoppingCart, Settings, RefreshCw, Upload, Search, Truck,
  Globe, DollarSign, Warehouse, ExternalLink, Loader2, CheckCircle2,
  XCircle, AlertTriangle, Plus, Trash2, Edit, Eye, ChevronDown,
  ChevronRight, BarChart3, Link, Webhook, Database, Activity, Box,
  Store, Layers, GitBranch, Clock, Shield, Zap
} from 'lucide-react';
import { useConfirm } from '../../components/ConfirmDialog';

type Tab = 'overview' | 'operations' | 'connections' | 'products' | 'orders' | 'imports' | 'mappings' | 'settings';

const PROVIDER_META: Record<string, { name: string; color: string; icon: string }> = {
  cjdropshipping: { name: 'CJ Dropshipping', color: 'orange', icon: '🇨🇳' },
  aliexpress: { name: 'AliExpress', color: 'red', icon: '🇨🇳' },
  amazon: { name: 'Amazon', color: 'yellow', icon: '🇺🇸' },
  alibaba: { name: 'Alibaba', color: 'blue', icon: '🇨🇳' },
  custom: { name: 'Custom Provider', color: 'gray', icon: '🔗' },
};

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    CONNECTED: 'bg-green-100 text-green-700 border-green-200',
    ACTIVE: 'bg-green-100 text-green-700 border-green-200',
    VERIFIED: 'bg-green-100 text-green-700 border-green-200',
    COMPLETED: 'bg-green-100 text-green-700 border-green-200',
    SUCCESS: 'bg-green-100 text-green-700 border-green-200',
    READY: 'bg-blue-100 text-blue-700 border-blue-200',
    RUNNING: 'bg-blue-100 text-blue-700 border-blue-200',
    PROCESSING: 'bg-blue-100 text-blue-700 border-blue-200',
    PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    SHIPPED: 'bg-purple-100 text-purple-700 border-purple-200',
    FAILED: 'bg-red-100 text-red-700 border-red-200',
    ERROR: 'bg-red-100 text-red-700 border-red-200',
    NOT_CONFIGURED: 'bg-gray-100 text-gray-500 border-gray-200',
    INACTIVE: 'bg-gray-100 text-gray-500 border-gray-200',
    CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
    REFUNDED: 'bg-pink-100 text-pink-700 border-pink-200',
    DELIVERED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

function StatusBadge({ value, pulse }: { value: string; pulse?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(value)}`}>
      {pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
      {value}
    </span>
  );
}

export default function AdminUnifiedDropshipping() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'operations', label: 'Operations', icon: <Activity className="w-4 h-4" /> },
    { key: 'connections', label: 'Connections', icon: <Globe className="w-4 h-4" /> },
    { key: 'products', label: 'Search & Import', icon: <Search className="w-4 h-4" /> },
    { key: 'mappings', label: 'Product Mappings', icon: <Layers className="w-4 h-4" /> },
    { key: 'orders', label: 'Dropship Orders', icon: <ShoppingCart className="w-4 h-4" /> },
    { key: 'imports', label: 'Import Jobs', icon: <Upload className="w-4 h-4" /> },
    { key: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="space-ç-5">
      {/* Header */}
      <div className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dropshipping Control Center</h1>
            <p className="mt-1 text-indigo-200">
              Unified marketplace integration panel — manage all providers from one place
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
            <Zap className="w-4 h-4 text-yellow-300" />
            <span>Multi-Provider Engine Active</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'operations' && <DropshipOperationsWorkspace tone="admin" scope="admin" />}
      {activeTab === 'connections' && <ConnectionsTab />}
      {activeTab === 'products' && <SearchImportTab />}
      {activeTab === 'mappings' && <MappingsTab />}
      {activeTab === 'orders' && <OrdersTab />}
      {activeTab === 'imports' && <ImportJobsTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  OVERVIEW DASHBOARD
// ═══════════════════════════════════════════════

function OverviewTab() {
  const dashboardQuery = useQuery({
    queryKey: ['provider-dashboard'],
    queryFn: () => get<any>('/providers/dashboard'),
    refetchInterval: 30000,
  });

  const readinessQuery = useQuery({
    queryKey: ['provider-readiness'],
    queryFn: () => get<any>('/providers/readiness'),
  });

  const capabilitiesQuery = useQuery({
    queryKey: ['provider-capabilities'],
    queryFn: () => get<any>('/providers/capabilities'),
  });

  const syncAllMutation = useMutation({
    mutationFn: () => post('/providers/sync-all', {}),
    onSuccess: (data) => {
      toast.success(`Sync completed across ${data.data?.length || 0} connections`);
      dashboardQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Sync failed'),
  });

  const stats = dashboardQuery.data?.data;
  const readiness = readinessQuery.data?.data;
  const capabilities = capabilitiesQuery.data?.data;

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Globe className="w-5 h-5" />}
          label="Connections"
          value={stats?.overview?.totalConnections || 0}
          sub={`${stats?.overview?.verifiedConnections || 0} verified`}
          color="indigo"
        />
        <MetricCard
          icon={<Layers className="w-5 h-5" />}
          label="Product Mappings"
          value={stats?.overview?.totalMappings || 0}
          sub={`${stats?.overview?.totalSuppliers || 0} suppliers`}
          color="purple"
        />
        <MetricCard
          icon={<ShoppingCart className="w-5 h-5" />}
          label="Dropship Orders"
          value={stats?.overview?.totalDropshipOrders || 0}
          sub="All time"
          color="orange"
        />
        <MetricCard
          icon={<Upload className="w-5 h-5" />}
          label="Import Jobs"
          value={stats?.recentImportJobs?.length || 0}
          sub="Recent"
          color="green"
        />
      </div>

      {/* Provider Status Cards */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-gray-900">Marketplace Connections</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(capabilities || []).map((provider: any) => {
            const configured = readiness?.marketplaces?.configured?.find((c: any) => c.provider === provider.provider);
            const meta = PROVIDER_META[provider.provider] || { name: provider.name, color: 'gray', icon: '🔗' };
            const isReady = configured?.ready;
            return (
              <div key={provider.provider} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meta.icon}</span>
                    <h4 className="font-medium text-gray-900">{meta.name}</h4>
                  </div>
                  <StatusBadge value={isReady ? 'CONNECTED' : 'NOT_CONFIGURED'} />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  Auth: {provider.authType}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {provider.capabilities?.slice(0, 4).map((cap: string) => (
                    <span key={cap} className="rounded bg-white px-1.5 py-0.5 text-xs text-gray-600 border border-gray-200">
                      {cap.split('.').pop()}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Orders by Status */}
      {stats?.orderStatusBreakdown && Object.keys(stats.orderStatusBreakdown).length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-gray-900">Dropship Orders by Status</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.orderStatusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <StatusBadge value={status} />
                <span className="text-lg font-bold text-gray-900">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provider Breakdown */}
      {stats?.byProvider && stats.byProvider.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-gray-900">Provider Breakdown</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.byProvider.map((provider: any) => (
              <div key={provider.provider} className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500 uppercase">{provider.provider}</p>
                <div className="mt-1 space-y-1 text-sm">
                  <p className="text-gray-700">Total: <span className="font-semibold">{provider.connections}</span></p>
                  <p className="text-green-600">Verified: {provider.verified}</p>
                  <p className="text-blue-600">Active: {provider.active}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => syncAllMutation.mutate()}
          disabled={syncAllMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
        >
          {syncAllMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sync All Providers
        </button>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: number; sub: string; color: string }) {
  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2 ${colorClasses[color] || 'bg-gray-50 text-gray-600'}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  CONNECTIONS TAB
// ═══════════════════════════════════════════════

function ConnectionsTab() {
  const qc = useQueryClient();
  const confirmAction = useConfirm();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editConnection, setEditConnection] = useState<any>(null);
  const [testResult, setTestResult] = useState<{ [key: string]: any }>({});

  const connectionsQuery = useQuery({
    queryKey: ['provider-connections'],
    queryFn: () => get<any[]>('/providers/connections'),
  });

  const capabilitiesQuery = useQuery({
    queryKey: ['provider-capabilities'],
    queryFn: () => get<any[]>('/providers/capabilities'),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => post(`/providers/connections/${id}/test`, {}),
    onSuccess: (data, id) => {
      setTestResult((prev) => ({ ...prev, [id]: data.data }));
      if (data.data?.status === 'CONNECTED') toast.success('Connection verified!');
      else toast.error(data.data?.message || 'Test failed');
      connectionsQuery.refetch();
    },
    onError: (err, id) => {
      setTestResult((prev) => ({ ...prev, [id]: { status: 'FAILED', message: err.message } }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/providers/connections/${id}`),
    onSuccess: () => {
      toast.success('Connection deleted');
      connectionsQuery.refetch();
      qc.invalidateQueries({ queryKey: ['provider-dashboard'] });
    },
    onError: (err: any) => toast.error(err.message || 'Delete failed'),
  });

  const handleDeleteConnection = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Delete connection?',
      message: 'This will also remove import jobs for the connection.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (confirmed) deleteMutation.mutate(id);
  };

  const connections = connectionsQuery.data?.data || [];
  const providers = capabilitiesQuery.data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{connections.length} connections configured</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
        >
          <Plus className="w-4 h-4" /> Add Connection
        </button>
      </div>

      <div className="space-y-3">
        {connections.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <Globe className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900">No Connections</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add your first marketplace connection to start importing products.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
              <Plus className="w-4 h-4" /> Add Connection
            </button>
          </div>
        )}

        {connections.map((conn: any) => {
          const meta = PROVIDER_META[conn.adapter?.provider] || { name: conn.adapter?.name || 'Unknown', color: 'gray', icon: '🔗' };
          const testInfo = testResult[conn.id];
          const credentials: any = conn.credentials ? JSON.parse(conn.credentials) : {};
          const config: any = conn.config ? JSON.parse(conn.config) : {};
          const credKeys = Object.keys(credentials).filter((k) => !['password', 'secret', 'token', 'key'].includes(k.toLowerCase()));

          return (
            <div key={conn.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-lg">
                    {meta.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{conn.name}</h3>
                    <p className="text-xs text-gray-500">{meta.name} · {conn.adapter?.provider}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={conn.isVerified ? 'VERIFIED' : 'PENDING'} pulse={conn.isVerified} />
                  {conn.isActive ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactive</span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                {config?.catalogUrl && <span>Catalog: {config.catalogUrl}</span>}
                {config?.storeUrl && <span>Store: {config.storeUrl}</span>}
                {config?.currency && <span>Currency: {config.currency}</span>}
                {credKeys.length > 0 && <span>{credKeys.length} credential(s)</span>}
                {conn.lastSyncAt && <span>Last sync: {new Date(conn.lastSyncAt).toLocaleString()}</span>}
              </div>

              {conn.lastError && (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">
                  <AlertTriangle className="w-3 h-3" />
                  {conn.lastError}
                </div>
              )}

              {testInfo && (
                <div className={`mt-2 rounded-lg px-3 py-1.5 text-xs ${testInfo.status === 'CONNECTED' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  Test: {testInfo.status} — {testInfo.message || ''}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => testMutation.mutate(conn.id)}
                  disabled={testMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {testMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                  Test
                </button>
                <button
                  onClick={() => setEditConnection(conn)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => void handleDeleteConnection(conn.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Connection Modal */}
      {(showAddModal || editConnection) && (
        <ConnectionModal
          connection={editConnection}
          providers={providers}
          onClose={() => { setShowAddModal(false); setEditConnection(null); }}
          onSaved={() => { connectionsQuery.refetch(); qc.invalidateQueries({ queryKey: ['provider-dashboard'] }); setShowAddModal(false); setEditConnection(null); }}
        />
      )}
    </div>
  );
}

function ConnectionModal({ connection, providers, onClose, onSaved }: { connection: any; providers: any[]; onClose: () => void; onSaved: () => void }) {
  const [provider, setProvider] = useState(connection?.adapter?.provider || providers[0]?.provider || 'cjdropshipping');
  const [name, setName] = useState(connection?.name || '');
  const [credentials, setCredentials] = useState<Record<string, string>>(connection?.credentials ? JSON.parse(connection.credentials) : {});
  const [config, setConfig] = useState<Record<string, string>>(connection?.config ? JSON.parse(connection.config) : {});
  const [isActive, setIsActive] = useState(connection?.isActive !== false);

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      connection?.id
        ? put(`/providers/connections/${connection.id}`, data)
        : post('/providers/connections', data),
    onSuccess: () => {
      toast.success(connection?.id ? 'Connection updated' : 'Connection created');
      onSaved();
    },
    onError: (err: any) => toast.error(err.message || 'Save failed'),
  });

  const selectedProvider = providers.find((p: any) => p.provider === provider);
  const requiredFields = selectedProvider?.requiredCredentials || ['apiKey'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }

    saveMutation.mutate({
      adapterId: connection?.adapterId || connection?.adapter?.id || undefined,
      provider,
      name,
      credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
      config: Object.keys(config).length > 0 ? config : undefined,
      isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900">
          {connection?.id ? 'Edit Connection' : 'New Provider Connection'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure your marketplace provider credentials and settings.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Provider</label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setCredentials({});
              }}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {providers.map((p: any) => (
                <option key={p.provider} value={p.provider}>
                  {p.name} ({p.authType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Connection Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder={`My ${selectedProvider?.name || 'Provider'} Store`}
            />
          </div>

          {/* Dynamic credential fields */}
          {requiredFields.map((field: string) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700">
                {field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
              </label>
              <input
                type={field.toLowerCase().includes('secret') || field.toLowerCase().includes('key') || field.toLowerCase().includes('token') ? 'password' : 'text'}
                value={credentials[field] || ''}
                onChange={(e) => setCredentials((prev) => ({ ...prev, [field]: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder={`Enter ${field}`}
              />
            </div>
          ))}

          {/* Common config fields */}
          <div className="border-t border-gray-200 pt-4">
            <p className="mb-2 text-sm font-medium text-gray-700">Configuration (Optional)</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500">Store URL</label>
                <input
                  type="url"
                  value={config.storeUrl || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, storeUrl: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Catalog API URL</label>
                <input
                  type="url"
                  value={config.catalogUrl || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, catalogUrl: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  placeholder="https://api..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500">Currency</label>
                  <input
                    type="text"
                    value={config.currency || 'USD'}
                    onChange={(e) => setConfig((prev) => ({ ...prev, currency: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Profit Margin</label>
                  <input
                    type="number"
                    value={(config.profitMargin ? parseFloat(config.profitMargin) * 100 : 30)}
                    onChange={(e) => setConfig((prev) => ({ ...prev, profitMargin: String(Number(e.target.value) / 100) }))}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    min={0}
                    max={500}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {connection?.id ? 'Update' : 'Create Connection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SEARCH & IMPORT TAB
// ═══════════════════════════════════════════════

function SearchImportTab() {
  const connectionsQuery = useQuery({
    queryKey: ['provider-connections'],
    queryFn: () => get<any[]>('/providers/connections'),
  });

  const [selectedConnection, setSelectedConnection] = useState('');
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const connections = connectionsQuery.data?.data || [];

  const searchMutation = useMutation({
    mutationFn: (params: { connectionId: string; keyword: string }) =>
      post(`/providers/connections/${params.connectionId}/search`, { keyword: params.keyword }),
    onSuccess: (data) => {
      setResults(data.data?.products || []);
      if (!data.data?.products?.length) toast('No products found');
    },
    onError: (err: any) => toast.error(err.message || 'Search failed'),
  });

  const importMutation = useMutation({
    mutationFn: (params: { connectionId: string; keyword: string; maxProducts: number }) =>
      post(`/providers/connections/${params.connectionId}/import-products`, {
        keyword: params.keyword || undefined,
        maxProducts: params.maxProducts,
      }),
    onSuccess: (data) => {
      toast.success(`Import completed: ${data.data?.imported} products imported`);
      setResults([]);
    },
    onError: (err: any) => toast.error(err.message || 'Import failed'),
  });

  const handleSearch = () => {
    if (!selectedConnection) { toast.error('Select a connection first'); return; }
    searchMutation.mutate({ connectionId: selectedConnection, keyword });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-gray-900">Search Provider Catalog</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Connection</label>
            <select
              value={selectedConnection}
              onChange={(e) => setSelectedConnection(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Select a connection...</option>
              {connections.map((conn: any) => (
                <option key={conn.id} value={conn.id}>
                  {conn.name} ({conn.adapter?.provider})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Search products..."
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searchMutation.isPending || !selectedConnection}
            className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {searchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Browse
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{results.length} products found</p>
            <button
              onClick={() => importMutation.mutate({ connectionId: selectedConnection, keyword, maxProducts: 50 })}
              disabled={importMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import All Results
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((product: any, idx: number) => (
              <div key={product.sku || idx} className="rounded-lg border border-gray-200 bg-white p-3">
                {product.images?.[0] && (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="mb-2 h-40 w-full rounded-lg object-cover bg-gray-100"
                    onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                  />
                )}
                <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{product.title}</h4>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-indigo-600">
                      {product.currency} {product.price?.toFixed(2)}
                    </p>
                    {product.comparePrice && (
                      <p className="text-xs text-gray-400 line-through">
                        {product.currency} {product.comparePrice?.toFixed(2)}
                      </p>
                    )}
                  </div>
                  {product.url && (
                    <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {product.variants?.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">{product.variants.length} variants</p>
                )}
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
//  MAPPINGS TAB
// ═══════════════════════════════════════════════

function MappingsTab() {
  const qc = useQueryClient();
  const confirmAction = useConfirm();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedConnection, setSelectedConnection] = useState('');

  const connectionsQuery = useQuery({
    queryKey: ['provider-connections'],
    queryFn: () => get<any[]>('/providers/connections'),
  });

  const suppliersQuery = useQuery({
    queryKey: ['provider-suppliers'],
    queryFn: () => get<any[]>('/providers/suppliers'),
  });

  const mappingsQuery = useQuery({
    queryKey: ['provider-mappings', page, search],
    queryFn: () => get<any>(`/providers/mappings?page=${page}&limit=20&search=${encodeURIComponent(search)}`),
  });

  const syncMutation = useMutation({
    mutationFn: (connectionId: string) => post(`/providers/connections/${connectionId}/sync-inventory`, {}),
    onSuccess: (data) => {
      toast.success(`Inventory synced: ${data.data?.updated} products updated`);
      mappingsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Sync failed'),
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: any }) => put(`/providers/mappings/${params.id}`, params.data),
    onSuccess: () => {
      toast.success('Mapping updated');
      mappingsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/providers/mappings/${id}`),
    onSuccess: () => {
      toast.success('Mapping deleted');
      mappingsQuery.refetch();
      qc.invalidateQueries({ queryKey: ['provider-dashboard'] });
    },
    onError: (err: any) => toast.error(err.message || 'Delete failed'),
  });

  const handleDeleteMapping = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Delete mapping?',
      message: 'This removes the provider product mapping.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (confirmed) deleteMutation.mutate(id);
  };

  const data = mappingsQuery.data?.data;
  const mappings = data?.mappings || [];
  const total = data?.total || 0;
  const connections = connectionsQuery.data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none w-64"
            placeholder="Search mappings..."
          />
          <p className="text-sm text-gray-500">{total} total</p>
        </div>
        <div className="flex gap-2">
          {selectedConnection && (
            <button
              onClick={() => syncMutation.mutate(selectedConnection)}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {syncMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Sync Inventory
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Product</th>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Supplier</th>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Cost</th>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Sell Price</th>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Stock</th>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Linked</th>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Sync</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mappings.map((mapping: any) => (
              <tr key={mapping.id} className="hover:bg-gray-50">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    {mapping.imageUrl && (
                      <img src={mapping.imageUrl} alt="" className="h-8 w-8 rounded object-cover bg-gray-100" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 line-clamp-1 max-w-[200px]">{mapping.supplierTitle}</p>
                      <p className="text-xs text-gray-400">SKU: {mapping.supplierSku?.slice(0, 16)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-gray-700">
                  <span className="text-xs font-medium text-gray-500">
                    {mapping.supplier?.name || 'Unknown'} ({mapping.supplier?.provider})
                  </span>
                </td>
                <td className="px-3 py-3 text-gray-900 font-mono text-xs">
                  {mapping.supplierCurrency} {mapping.costPrice?.toFixed(2)}
                </td>
                <td className="px-3 py-3">
                  <span className="font-mono font-medium text-indigo-600 text-xs">
                    ${mapping.sellingPrice?.toFixed(2)}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className={`font-mono text-xs ${mapping.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {mapping.quantity}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {mapping.localProductId ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      <CheckCircle2 className="w-3 h-3" /> Linked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      <XCircle className="w-3 h-3" /> Unlinked
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge value={mapping.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </td>
                <td className="px-3 py-3 text-xs text-gray-400">
                  {mapping.lastSyncedAt ? new Date(mapping.lastSyncedAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateMutation.mutate({ id: mapping.id, data: { isActive: !mapping.isActive } })}
                      className="rounded p-1 text-gray-400 hover:text-gray-600"
                      title="Toggle active"
                    >
                      {mapping.isActive ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => void handleDeleteMapping(mapping.id)}
                      className="rounded p-1 text-gray-400 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {mappings.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-sm text-gray-500">
                  <Package className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  No product mappings found. Import products from your provider connections.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  ORDERS TAB
// ═══════════════════════════════════════════════

function OrdersTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const ordersQuery = useQuery({
    queryKey: ['dropship-orders', page, statusFilter],
    queryFn: () => get<any>(`/providers/dropship-orders?page=${page}&limit=20&status=${statusFilter}`),
  });

  const data = ordersQuery.data?.data;
  const orders = data?.orders || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <p className="text-sm text-gray-500">{total} orders</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Supplier Order</th>
              <th className="px-3 py-3 text-left font-medium text-gray-500">Supplier</th>
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
                <td className="px-3 py-3 font-mono text-xs text-gray-900">{order.supplierOrderId?.slice(0, 24)}</td>
                <td className="px-3 py-3">
                  <span className="text-xs">{order.supplier?.name} ({order.supplier?.provider})</span>
                </td>
                <td className="px-3 py-3 text-xs text-gray-500">{order.localOrderId?.slice(0, 8)}...</td>
                <td className="px-3 py-3 font-mono text-xs text-gray-900">
                  {order.currency} {order.totalCost?.toFixed(2)}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge value={order.status} />
                </td>
                <td className="px-3 py-3">
                  {order.trackingUrl ? (
                    <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
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
                <td colSpan={7} className="px-3 py-12 text-center text-sm text-gray-500">
                  <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  No dropship orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50">Previous</button>
          <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 20)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  IMPORT JOBS TAB
// ═══════════════════════════════════════════════

function ImportJobsTab() {
  const [page, setPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const jobsQuery = useQuery({
    queryKey: ['import-jobs', page],
    queryFn: () => get<any>(`/providers/import-jobs?page=${page}&limit=20`),
  });

  const jobDetailQuery = useQuery({
    queryKey: ['import-job-detail', selectedJob],
    queryFn: () => get<any>(`/providers/import-jobs/${selectedJob}`),
    enabled: !!selectedJob,
  });

  const data = jobsQuery.data?.data;
  const jobs = data?.jobs || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{total} import jobs</p>

      <div className="grid gap-3">
        {jobs.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <Upload className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900">No Import Jobs</h3>
            <p className="mt-1 text-sm text-gray-500">Import products from your connections to see job history.</p>
          </div>
        )}

        {jobs.map((job: any) => (
          <div
            key={job.id}
            className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 hover:border-indigo-200 transition-colors"
            onClick={() => setSelectedJob(job.id === selectedJob ? null : job.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusBadge value={job.status} pulse={job.status === 'RUNNING'} />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {job.totalItems} products · {job.imported} imported · {job.failed} failed
                  </p>
                  <p className="text-xs text-gray-500">
                    {job.supplier?.name || 'Unknown supplier'} · {new Date(job.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {job.startedAt && <span className="text-xs text-gray-400">{new Date(job.startedAt).toLocaleString()}</span>}
                {job.id === selectedJob ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </div>

            {selectedJob === job.id && jobDetailQuery.data?.data && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><span className="text-gray-500">Status:</span> <StatusBadge value={jobDetailQuery.data.data.status} /></div>
                    <div><span className="text-gray-500">Total:</span> {jobDetailQuery.data.data.totalItems}</div>
                    <div><span className="text-gray-500">Imported:</span> {jobDetailQuery.data.data.imported}</div>
                    <div><span className="text-gray-500">Failed:</span> {jobDetailQuery.data.data.failed}</div>
                    <div><span className="text-gray-500">Started:</span> {jobDetailQuery.data.data.startedAt ? new Date(jobDetailQuery.data.data.startedAt).toLocaleString() : '-'}</div>
                    <div><span className="text-gray-500">Completed:</span> {jobDetailQuery.data.data.completedAt ? new Date(jobDetailQuery.data.data.completedAt).toLocaleString() : '-'}</div>
                  </div>

                  {(jobDetailQuery.data.data.errors || []).length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-600 mb-1">Errors:</p>
                      <div className="max-h-32 overflow-y-auto rounded-lg bg-red-50 p-2 text-xs text-red-700 space-y-1">
                        {jobDetailQuery.data.data.errors.map((err: string, i: number) => (
                          <p key={i}>{err}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50">Previous</button>
          <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 20)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SETTINGS TAB
// ═══════════════════════════════════════════════

function SettingsTab() {
  const capabilitiesQuery = useQuery({
    queryKey: ['provider-capabilities'],
    queryFn: () => get<any[]>('/providers/capabilities'),
  });

  const providers = capabilitiesQuery.data?.data || [];

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900">Supported Providers</h3>
        <p className="mb-4 text-sm text-gray-500">All marketplace providers available in the integration engine.</p>

        <div className="space-y-3">
          {providers.map((provider: any) => (
            <div key={provider.provider} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{provider.name}</h4>
                  <p className="text-xs text-gray-500">
                    Provider: <code className="rounded bg-gray-200 px-1 py-0.5">{provider.provider}</code>
                    · Auth: {provider.authType}
                  </p>
                </div>
                <StatusBadge value="READY" />
              </div>
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-500 mb-1">Capabilities:</p>
                <div className="flex flex-wrap gap-1">
                  {provider.capabilities.map((cap: string) => (
                    <span key={cap} className="rounded-lg bg-white border border-gray-200 px-2 py-0.5 text-xs text-gray-600">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-500 mb-1">Required Credentials:</p>
                <div className="flex flex-wrap gap-1">
                  {provider.requiredCredentials.map((cred: string) => (
                    <span key={cred} className="rounded-lg bg-white border border-gray-200 px-2 py-0.5 text-xs font-mono text-gray-600">
                      {cred}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-indigo-50 p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-indigo-900">Integration Engine Status</h4>
            <p className="text-sm text-indigo-700 mt-1">
              The multi-provider integration engine is active with {providers.length} registered adapters.
              Each adapter implements a standardized interface for product import, order placement,
              inventory sync, price sync, and webhook handling.
            </p>
            <p className="text-sm text-indigo-700 mt-1">
              To add a new provider, create an adapter class extending BaseProviderAdapter
              and register it in the ProviderAdapterRegistry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
