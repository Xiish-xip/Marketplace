import { AdminResourcePage, StatusBadge } from './AdminResourcePage';

export default function AdminCurrencies() {
  return <AdminResourcePage config={{
    title: 'Currencies & Languages',
    description: 'Manage currency exchange rates used by pricing and checkout displays.',
    endpoint: '/currencies/rates',
    queryKey: 'admin-currencies',
    fields: [
      { name: 'fromCurrency', label: 'From currency' },
      { name: 'toCurrency', label: 'To currency' },
      { name: 'rate', label: 'Exchange rate', type: 'number' },
      { name: 'provider', label: 'Provider', defaultValue: 'manual' },
      { name: 'autoRefresh', label: 'Auto refresh', type: 'checkbox', defaultValue: true },
      { name: 'refreshInterval', label: 'Refresh interval seconds', type: 'number', defaultValue: 3600 },
    ],
    columns: [
      { key: 'fromCurrency', label: 'From' },
      { key: 'toCurrency', label: 'To' },
      { key: 'rate', label: 'Rate', render: (v) => v || '-' },
      { key: 'provider', label: 'Provider' },
      { key: 'autoRefresh', label: 'Refresh', render: (v) => <StatusBadge value={v === false ? 'MANUAL' : 'ACTIVE'} /> },
    ],
  }} />;
}
