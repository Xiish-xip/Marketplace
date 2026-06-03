import { AdminResourcePage, StatusBadge } from './AdminResourcePage';

export default function AdminSearchConfig() {
  return <AdminResourcePage config={{
    title: 'Search Config',
    description: 'Manage product-search synonym groups and trigger reindex operations.',
    endpoint: '/search/synonyms',
    queryKey: 'admin-search-config',
    fields: [
      { name: 'terms', label: 'Synonym terms', type: 'textarea', placeholder: 'phone, smartphone, mobile', fullWidth: true },
      { name: 'language', label: 'Language', defaultValue: 'en' },
      { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
    ],
    columns: [
      { key: 'terms', label: 'Terms', render: (v) => <span className="line-clamp-1">{v || '-'}</span> },
      { key: 'language', label: 'Language' },
      { key: 'isActive', label: 'Status', render: (v) => <StatusBadge value={v === false ? 'INACTIVE' : 'ACTIVE'} /> },
    ],
    actions: [{ label: 'Reindex', endpoint: '/search/reindex', method: 'post', confirm: 'Trigger search reindex?' }],
  }} />;
}
