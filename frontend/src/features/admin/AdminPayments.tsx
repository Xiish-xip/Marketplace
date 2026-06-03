import { AdminResourcePage, StatusBadge } from './AdminResourcePage';

export default function AdminPayments() {
  return <AdminResourcePage config={{
    title: 'Payments',
    description: 'View transactions, issue refunds, and reconcile order payments.',
    endpoint: '/payments',
    queryKey: 'admin-payments',
    allowCreate: false,
    allowEdit: false,
    allowDelete: false,
    filters: [{ name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'] }],
    fields: [
      { name: 'orderId', label: 'Order ID' },
      { name: 'customerEmail', label: 'Customer email' },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'method', label: 'Method', type: 'select', options: ['CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CASH'] },
      { name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'], defaultValue: 'PENDING' },
    ],
    columns: [
      { key: 'id', label: 'Transaction ID', render: (v) => String(v).slice(0, 10) },
      { key: 'orderId', label: 'Order' },
      { key: 'customer', label: 'Customer', render: (v, row) => v?.email || row.customerEmail || '-' },
      { key: 'amount', label: 'Amount', render: (v) => `${Number(v || 0).toLocaleString()} TZS` },
      { key: 'method', label: 'Method' },
      { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v} /> },
      { key: 'createdAt', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    ],
    actions: [
      { label: 'Refund', endpoint: (r) => `/payments/${r.id}/refund`, method: 'post', confirm: 'Refund this payment?' },
      { label: 'Complete', endpoint: (r) => `/payments/${r.id}/complete`, method: 'patch' },
    ],
  }} />;
}
