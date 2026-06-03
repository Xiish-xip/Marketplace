import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminResourcePage, StatusBadge } from './AdminResourcePage';
import { get, post } from '../../lib/api-enhanced';

export default function AdminIntegrations() {
  const qc = useQueryClient();
  const readiness = useQuery({ queryKey: ['provider-readiness'], queryFn: () => get('/providers/readiness') });
  const testConnection = useMutation({
    mutationFn: (id: string) => post(`/providers/connections/${id}/test`),
    onSuccess: () => {
      toast.success('Connection checked');
      qc.invalidateQueries({ queryKey: ['provider-readiness'] });
      qc.invalidateQueries({ queryKey: ['admin-integrations'] });
    },
  });
  const importProducts = useMutation({
    mutationFn: (id: string) => post(`/providers/connections/${id}/import-products`, { count: 12 }),
    onSuccess: () => toast.success('Import job completed'),
  });

  const configured = readiness.data?.data?.marketplaces?.configured || [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Supported marketplaces</p>
          <p className="mt-1 text-2xl font-semibold">{readiness.data?.data?.marketplaces?.supported?.length || 0}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Verified marketplace connections</p>
          <p className="mt-1 text-2xl font-semibold">{readiness.data?.data?.marketplaces?.productionReadyCount || 0}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Active languages</p>
          <p className="mt-1 text-2xl font-semibold">{readiness.data?.data?.localization?.activeLanguages?.length || 0}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Shipping profiles</p>
          <p className="mt-1 text-2xl font-semibold">{readiness.data?.data?.shipping?.profiles || 0}</p>
        </div>
      </div>

      {configured.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-900">Connection Operations</h2>
          <div className="space-y-2">
            {configured.map((adapter: any) => (
              <div key={adapter.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-3">
                <span className="font-medium text-gray-900">{adapter.name}</span>
                <StatusBadge value={adapter.ready ? 'CONNECTED' : adapter.enabled ? 'PENDING' : 'INACTIVE'} />
                <span className="text-xs text-gray-500">{adapter.capabilities?.join(', ')}</span>
                {adapter.activeConnections > 0 && (
                  <span className="ml-auto text-xs text-gray-500">{adapter.activeConnections} active connection(s)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <AdminResourcePage config={{
        title: 'Integrations',
        description: 'Manage provider adapters, connection status, webhook endpoints, product import, and dropship automation readiness.',
        endpoint: '/providers/adapters',
        queryKey: 'admin-integrations',
        fields: [
          { name: 'name', label: 'Provider' },
          { name: 'slug', label: 'Slug' },
          { name: 'provider', label: 'Provider type', type: 'select', options: ['alibaba', 'aliexpress', 'amazon', 'custom'] },
          { name: 'methods', label: 'Capabilities', type: 'multiselect', defaultValue: ['catalog.import', 'order.place'] },
          { name: 'baseUrl', label: 'Base URL' },
          { name: 'authType', label: 'Auth type', type: 'select', options: ['api_key', 'oauth2', 'basic', 'lwa/aws_sigv4', 'none'] },
          { name: 'isEnabled', label: 'Enabled', type: 'checkbox', defaultValue: false },
        ],
        columns: [
          { key: 'name', label: 'Provider' },
          { key: 'provider', label: 'Type' },
          { key: 'connections', label: 'Connections', render: (v) => v?.length || 0 },
          { key: 'methods', label: 'Capabilities', render: (v) => Array.isArray(v) ? v.join(', ') : String(v || '').slice(0, 80) },
          { key: 'isEnabled', label: 'Active', render: (v) => <StatusBadge value={v ? 'ACTIVE' : 'INACTIVE'} /> },
        ],
      }} />
    </div>
  );
}
