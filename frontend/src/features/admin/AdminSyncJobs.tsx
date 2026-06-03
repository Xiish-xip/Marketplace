import { AdminResourcePage, StatusBadge } from './AdminResourcePage';

export default function AdminSyncJobs() {
  return <AdminResourcePage config={{
    title: 'Sync Jobs',
    description: 'Monitor background sync jobs, progress, errors, manual triggers, and schedules.',
    endpoint: '/sync/jobs',
    queryKey: 'admin-sync-jobs',
    fields: [
      { name: 'name', label: 'Job name' },
      { name: 'type', label: 'Type', type: 'select', options: ['product_sync', 'order_sync', 'inventory_sync', 'price_sync', 'full_sync'], defaultValue: 'product_sync' },
      { name: 'providerType', label: 'Provider type' },
      { name: 'schedule', label: 'Schedule' },
      { name: 'status', label: 'Status', type: 'select', options: ['IDLE', 'RUNNING', 'PAUSED', 'FAILED'], defaultValue: 'IDLE' },
      { name: 'lastError', label: 'Last error', type: 'textarea', fullWidth: true },
      { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
    ],
    columns: [
      { key: 'name', label: 'Job' },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v} /> },
      { key: 'schedule', label: 'Schedule' },
      { key: 'lastRunStatus', label: 'Last Run', render: (v) => v || '-' },
      { key: 'lastError', label: 'Error Viewer', render: (v) => v ? <span className="text-red-600 line-clamp-1">{v}</span> : '-' },
    ],
    actions: [{ label: 'Trigger', endpoint: (r) => `/sync/jobs/${r.id}/trigger`, method: 'post' }],
  }} />;
}
