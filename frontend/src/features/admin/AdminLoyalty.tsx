import { AdminResourcePage, StatusBadge } from './AdminResourcePage';

export default function AdminLoyalty() {
  return <AdminResourcePage config={{
    title: 'Loyalty Program',
    description: 'Configure loyalty tiers, point ranges, multipliers, badges, and benefits.',
    endpoint: '/loyalty/tiers',
    queryKey: 'admin-loyalty',
    fields: [
      { name: 'name', label: 'Tier name' },
      { name: 'slug', label: 'Slug' },
      { name: 'minPoints', label: 'Minimum points', type: 'number', defaultValue: 0 },
      { name: 'maxPoints', label: 'Maximum points', type: 'number' },
      { name: 'multiplier', label: 'Earning multiplier', type: 'number', defaultValue: 1 },
      { name: 'color', label: 'Badge color' },
      { name: 'benefits', label: 'Benefits JSON', type: 'textarea', fullWidth: true },
      { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'minPoints', label: 'Min points' },
      { key: 'maxPoints', label: 'Max points', render: (v) => v ?? '-' },
      { key: 'multiplier', label: 'Multiplier', render: (v) => `${Number(v || 1).toFixed(2)}x` },
      { key: 'benefits', label: 'Benefits', render: (v) => v || '-' },
      { key: 'isActive', label: 'Status', render: (v) => <StatusBadge value={v === false ? 'INACTIVE' : 'ACTIVE'} /> },
    ],
  }} />;
}
