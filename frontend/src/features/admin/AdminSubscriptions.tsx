import { AdminResourcePage, StatusBadge } from './AdminResourcePage';

export default function AdminSubscriptions() {
  return <AdminResourcePage config={{
    title: 'Subscriptions',
    description: 'Manage plans, pricing tiers, feature toggles, and subscribers.',
    endpoint: '/subscriptions/plans',
    queryKey: 'admin-subscriptions',
    tabs: ['Plans', 'Pricing Tiers', 'Features', 'Subscribers'],
    fields: [
      { name: 'name', label: 'Plan name' },
      { name: 'slug', label: 'Slug' },
      { name: 'description', label: 'Description', type: 'textarea', fullWidth: true },
      { name: 'price', label: 'Price', type: 'number' },
      { name: 'currency', label: 'Currency', defaultValue: 'TZS' },
      { name: 'billingCycle', label: 'Billing cycle', type: 'select', options: ['monthly', 'quarterly', 'yearly'] },
      { name: 'trialDays', label: 'Trial days', type: 'number', defaultValue: 0 },
      { name: 'features', label: 'Features', type: 'multiselect', fullWidth: true },
      { name: 'isFeatured', label: 'Featured', type: 'checkbox', defaultValue: false },
      { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
    ],
    columns: [
      { key: 'name', label: 'Plan' },
      { key: 'price', label: 'Price', render: (v, row) => `${Number(v || 0).toLocaleString()} ${row.currency || 'TZS'}` },
      { key: 'billingCycle', label: 'Cycle' },
      { key: 'features', label: 'Features', render: (v) => v?.length || 0 },
      { key: 'trialDays', label: 'Trial' },
      { key: 'isActive', label: 'Status', render: (v) => <StatusBadge value={v === false ? 'INACTIVE' : 'ACTIVE'} /> },
    ],
  }} />;
}
