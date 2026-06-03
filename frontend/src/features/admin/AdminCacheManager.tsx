import { AdminResourcePage, StatusBadge } from './AdminResourcePage';

export default function AdminCacheManager() {
  return <AdminResourcePage config={{
    title: 'Cache Manager',
    description: 'Manage API rate limit rules and cache invalidation operations.',
    endpoint: '/cache/rate-limits',
    queryKey: 'admin-cache',
    fields: [
      { name: 'name', label: 'Rule name' },
      { name: 'keyPattern', label: 'Key pattern', placeholder: 'api:/api/products:GET' },
      { name: 'points', label: 'Allowed requests', type: 'number', defaultValue: 100 },
      { name: 'duration', label: 'Window seconds', type: 'number', defaultValue: 60 },
      { name: 'blockDuration', label: 'Block seconds', type: 'number', defaultValue: 300 },
      { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
    ],
    columns: [
      { key: 'name', label: 'Rule' },
      { key: 'keyPattern', label: 'Pattern' },
      { key: 'points', label: 'Limit' },
      { key: 'duration', label: 'Window (s)' },
      { key: 'blockDuration', label: 'Block (s)' },
      { key: 'isActive', label: 'Status', render: (v) => <StatusBadge value={v === false ? 'INACTIVE' : 'ACTIVE'} /> },
    ],
    actions: [{ label: 'Clear Cache', endpoint: '/cache/clear', method: 'post', confirm: 'Clear application cache?' }],
  }} />;
}
