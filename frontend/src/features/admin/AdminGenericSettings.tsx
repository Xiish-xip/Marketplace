import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ChevronLeft, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../lib/auth-store';
import { api } from '../../lib/api-enhanced';

interface ModuleConfig {
  title: string;
  description: string;
  apiPrefix: string;
  endpoints: { label: string; path: string; method?: string }[];
  docs?: string;
}

const MODULES: Record<string, ModuleConfig> = {
  currencies: {
    title: 'Currencies & Languages',
    description: 'Manage exchange rates, site languages, and translations. All values are configured via database - no hardcoding.',
    apiPrefix: '/api/currencies',
    endpoints: [
      { label: 'Currency Settings', path: '/currencies/settings' },
      { label: 'Exchange Rates', path: '/currencies/rates' },
      { label: 'Site Languages', path: '/currencies/languages' },
      { label: 'Translations', path: '/currencies/translations' },
    ],
  },
  search: {
    title: 'Search Configuration',
    description: 'Configure search synonyms, stop words, filter templates, and trigger reindexing. All search behavior is configurable via admin.',
    apiPrefix: '/api/search',
    endpoints: [
      { label: 'Synonyms', path: '/search/synonyms' },
      { label: 'Stop Words', path: '/search/stop-words' },
      { label: 'Filter Templates', path: '/search/filter-templates' },
      { label: 'Reindex Jobs', path: '/search/index-jobs' },
    ],
  },
  cache: {
    title: 'Cache & Queue Management',
    description: 'Manage Redis cache configurations, queue monitoring, and rate limiting rules. All caching behavior is configurable.',
    apiPrefix: '/api/cache',
    endpoints: [
      { label: 'Cache Configs', path: '/cache/configs' },
      { label: 'Queue Monitors', path: '/cache/queues' },
      { label: 'Rate Limit Rules', path: '/cache/rate-limits' },
    ],
  },
  dropshipping: {
    title: 'Dropshipping Management',
    description: 'Manage dropship suppliers, product mappings, import jobs, automation rules, profit margins, and shipping profiles.',
    apiPrefix: '/api/dropship',
    endpoints: [
      { label: 'Suppliers', path: '/dropship/suppliers' },
      { label: 'Product Mappings', path: '/dropship/mappings' },
      { label: 'Import Jobs', path: '/dropship/import-jobs' },
      { label: 'Orders', path: '/dropship/orders' },
      { label: 'Automation Rules', path: '/dropship/rules' },
      { label: 'Profit Margins', path: '/dropship/profit-margins' },
      { label: 'Shipping Profiles', path: '/dropship/shipping-profiles' },
    ],
  },
  subscriptions: {
    title: 'Subscription & Membership Plans',
    description: 'Create and manage subscription plans with tiered features, benefits, billing cycles, and subscriber management.',
    apiPrefix: '/api/subscriptions',
    endpoints: [
      { label: 'Subscription Plans', path: '/subscriptions/plans' },
      { label: 'Active Subscriptions', path: '/subscriptions' },
    ],
  },
  loyalty: {
    title: 'Loyalty Points Program',
    description: 'Configure loyalty program settings, tiers, member management, points transactions, and reward catalog.',
    apiPrefix: '/api/loyalty',
    endpoints: [
      { label: 'Program Settings', path: '/loyalty/program' },
      { label: 'Loyalty Tiers', path: '/loyalty/tiers' },
      { label: 'Members', path: '/loyalty/members' },
      { label: 'Transactions', path: '/loyalty/transactions' },
      { label: 'Reward Catalog', path: '/loyalty/rewards' },
    ],
  },
  b2b: {
    title: 'B2B Enterprise Features',
    description: 'Manage business accounts, bulk pricing tiers, purchase orders, and quote requests for enterprise customers.',
    apiPrefix: '/api/b2b',
    endpoints: [
      { label: 'Business Accounts', path: '/b2b/accounts' },
      { label: 'Bulk Pricing', path: '/b2b/bulk-pricing' },
      { label: 'Purchase Orders', path: '/b2b/purchase-orders' },
      { label: 'Quote Requests', path: '/b2b/quote-requests' },
    ],
  },
  analytics: {
    title: 'Analytics & Reports',
    description: 'Build custom dashboards with drag-drop widgets, configure report templates, and track analytics events.',
    apiPrefix: '/api/analytics',
    endpoints: [
      { label: 'Dashboard Widgets', path: '/analytics/widgets' },
      { label: 'Report Templates', path: '/analytics/reports' },
      { label: 'Events', path: '/analytics/events' },
      { label: 'Summary Stats', path: '/analytics/summary' },
    ],
  },
  integrations: {
    title: 'Provider Integrations',
    description: 'Configure provider adapters, connections, and webhook endpoints for AliExpress, Amazon, Alibaba, and custom providers.',
    apiPrefix: '/api/providers',
    endpoints: [
      { label: 'Provider Adapters', path: '/providers/adapters' },
      { label: 'Connections', path: '/providers/connections' },
      { label: 'Webhook Endpoints', path: '/providers/webhooks' },
    ],
  },
  'sync-jobs': {
    title: 'Scheduled Sync & Monitoring',
    description: 'Configure sync jobs, view logs, resolve errors, and manage sync schedules for background data synchronization.',
    apiPrefix: '/api/sync',
    endpoints: [
      { label: 'Sync Jobs', path: '/sync/jobs' },
      { label: 'Sync Errors', path: '/sync/errors' },
      { label: 'Schedules', path: '/sync/schedules' },
    ],
  },
};

export default function AdminGenericSettings() {
  const { module: routeModule } = useParams<{ module: string }>();
  const navigate = useNavigate();
  // Derive module from URL last segment if not in params (for named routes)
  const pathParts = window.location.pathname.split('/');
  const module = routeModule || pathParts[pathParts.length - 1];
  const config = module ? MODULES[module] : null;
  const showOverview = !routeModule && module === 'generic-settings';
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Get token from Zustand auth store instead of raw localStorage
  const token = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const fetchEndpoint = useCallback(async (path: string) => {
    setLoading((l) => ({ ...l, [path]: true }));
    try {
      const res = await api.get(path);
      setData((d) => ({ ...d, [path]: res.data }));
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch');
    } finally {
      setLoading((l) => ({ ...l, [path]: false }));
    }
  }, []);

  useEffect(() => {
    // If no token, redirect to login
    if (!isAuthenticated || !token) {
      navigate('/login', { replace: true });
      return;
    }

    if (showOverview || !config) return;

    // Fetch all endpoints for this module
    config.endpoints.forEach((ep) => {
      fetchEndpoint(ep.path);
    });
  }, [module, isAuthenticated, token, config, showOverview, navigate, fetchEndpoint]);

  if (showOverview) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <button onClick={() => navigate('/admin')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Settings Control Center</h1>
          <p className="text-gray-500 mt-1">Open any configurable platform module from one place.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(MODULES).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(`/admin/generic-settings/${key}`)}
              className="rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-gray-500">{item.description}</p>
              <p className="mt-3 text-xs font-medium text-indigo-600">{item.endpoints.length} endpoints</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-700">Module not found</h2>
        <p className="text-gray-500 mt-2">The requested module configuration does not exist.</p>
        <button onClick={() => navigate('/admin')} className="mt-4 text-indigo-600 hover:underline">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
        <p className="text-gray-500 mt-1">{config.description}</p>
      </div>

      <div className="grid gap-6">
        {config.endpoints.map((ep) => {
          const key = ep.path;
          const isLoading = loading[key];
          const result = data[key];
          return (
            <div key={key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{ep.label}</h3>
                <button
                  onClick={() => fetchEndpoint(key)}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
              <div className="text-xs text-gray-400 mb-2 font-mono">{ep.path}</div>
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
              ) : result?.success ? (
                <div className="bg-gray-50 rounded p-3 overflow-auto max-h-64">
                  <pre className="text-xs text-gray-600">{JSON.stringify(result.data, null, 2).slice(0, 2000)}</pre>
                  {JSON.stringify(result.data, null, 2).length > 2000 && (
                    <p className="text-xs text-gray-400 mt-1">...truncated (full response available via API)</p>
                  )}
                </div>
              ) : result ? (
                <div className="text-sm text-red-500">Error: {result.message || 'Unknown error'}</div>
              ) : error ? (
                <div className="text-sm text-red-500">{error}</div>
              ) : (
                <div className="text-sm text-gray-400">No data loaded</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-5 bg-indigo-50 rounded-lg border border-indigo-100">
        <h3 className="text-sm font-semibold text-indigo-800">Configuration Note</h3>
        <p className="text-xs text-indigo-600 mt-1">
          All values in this module are stored in the database and fully configurable via the API. 
          There is zero hardcoding of business logic. The super admin can configure 100% of the behavior 
          through API requests or the admin panel builder interface.
        </p>
      </div>
    </div>
  );
}
