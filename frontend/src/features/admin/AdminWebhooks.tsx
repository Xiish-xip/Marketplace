import { AdminResourcePage, StatusBadge } from './AdminResourcePage';

export default function AdminWebhooks() {
  return <AdminResourcePage config={{
    title: 'Webhooks',
    description: 'Configure outgoing webhook endpoints and event subscriptions.',
    endpoint: '/providers/webhooks',
    queryKey: 'admin-webhooks',
    createLabel: 'Create webhook',
    fields: [
      { name: 'connectionId', label: 'Provider connection ID' },
      { name: 'url', label: 'URL' },
      { name: 'events', label: 'Events', type: 'multiselect', placeholder: 'order.created, payment.completed', fullWidth: true },
      { name: 'secret', label: 'Secret' },
      { name: 'retryCount', label: 'Retry count', type: 'number', defaultValue: 3 },
      { name: 'timeout', label: 'Timeout ms', type: 'number', defaultValue: 5000 },
      { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
    ],
    columns: [
      { key: 'connectionId', label: 'Connection', render: (v) => String(v || '').slice(0, 8) },
      { key: 'url', label: 'URL', render: (v) => <span className="line-clamp-1">{v}</span> },
      { key: 'events', label: 'Events Count', render: (v) => {
        if (Array.isArray(v)) return v.length;
        try { return JSON.parse(v || '[]').length || 0; } catch { return 0; }
      } },
      { key: 'retryCount', label: 'Retries' },
      { key: 'timeout', label: 'Timeout' },
      { key: 'isActive', label: 'Status', render: (v) => <StatusBadge value={v === false ? 'INACTIVE' : 'ACTIVE'} /> },
    ],
  }} />;
}
