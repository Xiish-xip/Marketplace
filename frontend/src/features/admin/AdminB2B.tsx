import { AdminResourcePage, StatusBadge } from './AdminResourcePage';

export default function AdminB2B() {
  return <AdminResourcePage config={{
    title: 'B2B Enterprise',
    description: 'Manage verified business accounts, credit limits, payment terms, and approval status.',
    endpoint: '/b2b/accounts',
    queryKey: 'admin-b2b',
    fields: [
      { name: 'userId', label: 'User ID' },
      { name: 'companyName', label: 'Company name' },
      { name: 'registrationNo', label: 'Registration no.' },
      { name: 'taxId', label: 'Tax ID' },
      { name: 'industry', label: 'Industry' },
      { name: 'companySize', label: 'Company size' },
      { name: 'website', label: 'Website' },
      { name: 'phone', label: 'Phone' },
      { name: 'address', label: 'Address', type: 'textarea', fullWidth: true },
      { name: 'creditLimit', label: 'Credit limit', type: 'number', defaultValue: 0 },
      { name: 'netPaymentTerms', label: 'Net payment terms', type: 'number', defaultValue: 30 },
      { name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'], defaultValue: 'PENDING' },
    ],
    columns: [
      { key: 'companyName', label: 'Business Account' },
      { key: 'industry', label: 'Industry', render: (v) => v || '-' },
      { key: 'creditLimit', label: 'Credit Limit', render: (v) => `${Number(v || 0).toLocaleString()} TZS` },
      { key: 'netPaymentTerms', label: 'Terms', render: (v) => `${v || 30} days` },
      { key: 'purchaseOrders', label: 'Purchase Orders', render: (v) => v?.length || 0 },
      { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v || 'PENDING'} /> },
    ],
  }} />;
}
