import { AdminResourcePage } from './AdminResourcePage';

export default function AdminAnalyticsDashboard() {
  return <AdminResourcePage config={{
    title: 'Analytics',
    description: 'Widget dashboard with date range filtering, exports, and summary metrics.',
    endpoint: '/analytics/widgets',
    queryKey: 'admin-analytics',
    filters: [{ name: 'dateFrom', label: 'Date from', type: 'date' }, { name: 'dateTo', label: 'Date to', type: 'date' }],
    fields: [
      { name: 'title', label: 'Widget title' },
      { name: 'metric', label: 'Metric' },
      { name: 'chartType', label: 'Chart type', type: 'select', options: ['LINE', 'BAR', 'PIE', 'STAT'] },
      { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
    ],
    columns: [
      { key: 'title', label: 'Widget' },
      { key: 'metric', label: 'Metric' },
      { key: 'chartType', label: 'Type' },
      { key: 'value', label: 'Current Value' },
    ],
    actions: [{ label: 'Export CSV', endpoint: '/analytics/export', method: 'post' }],
  }} />;
}
