import { AdminResourcePage, StatusBadge } from './AdminResourcePage';

export default function AdminDropshipping() {
  return <AdminResourcePage config={{
    title: 'Dropshipping',
    description: 'Manage suppliers, mappings, import jobs, automation, margins, and shipping profiles.',
    endpoint: '/dropship/suppliers',
    queryKey: 'admin-dropshipping',
    fields: [
      { name: 'name', label: 'Supplier name' },
      { name: 'provider', label: 'Provider', type: 'select', options: ['alibaba', 'aliexpress', 'amazon', 'manual'] },
      { name: 'storeUrl', label: 'Store URL' },
      { name: 'apiEndpoint', label: 'API endpoint' },
      { name: 'commissionRate', label: 'Commission rate', type: 'number', defaultValue: 0 },
      { name: 'minProfitMargin', label: 'Minimum profit margin', type: 'number', defaultValue: 0.15 },
      { name: 'currency', label: 'Currency', defaultValue: 'USD' },
      { name: 'shippingMethods', label: 'Shipping methods', type: 'multiselect', fullWidth: true },
      { name: 'isVerified', label: 'Verified', type: 'checkbox', defaultValue: false },
      { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'provider', label: 'Provider' },
      { key: 'storeUrl', label: 'Store', render: (v) => v || '-' },
      { key: 'minProfitMargin', label: 'Min margin', render: (v) => v ? `${Math.round(Number(v) * 100)}%` : '-' },
      { key: 'currency', label: 'Currency' },
      { key: 'status', label: 'Status', render: (v, row) => <StatusBadge value={v || (row.isActive === false ? 'INACTIVE' : 'ACTIVE')} /> },
    ],
  }} />;
}
