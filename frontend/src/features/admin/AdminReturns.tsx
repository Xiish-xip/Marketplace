import { AdminResourcePage, StatusBadge } from './AdminResourcePage';

export default function AdminReturns() {
  return <AdminResourcePage config={{
    title: 'Returns',
    description: 'Approve, reject, refund, and track customer return requests.',
    endpoint: '/returns',
    queryKey: 'admin-returns',
    allowCreate: false,
    allowEdit: false,
    filters: [{ name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'] }],
    fields: [
      { name: 'orderId', label: 'Order ID' },
      { name: 'productId', label: 'Product ID' },
      { name: 'reason', label: 'Reason', type: 'textarea', fullWidth: true },
      { name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'], defaultValue: 'PENDING' },
    ],
    columns: [
      { key: 'id', label: 'Return ID', render: (v) => String(v).slice(0, 8) },
      { key: 'orderId', label: 'Order', render: (v, row) => row.order?.id || v || '-' },
      { key: 'product', label: 'Product', render: (v, row) => v?.title || row.productTitle || '-' },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v} /> },
      { key: 'createdAt', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    ],
    actions: [
      { label: 'Approve', endpoint: (r) => `/returns/${r.id}/approve`, method: 'patch' },
      { label: 'Reject', endpoint: (r) => `/returns/${r.id}/reject`, method: 'patch' },
      { label: 'Refund', endpoint: (r) => `/returns/${r.id}/refund`, method: 'post', confirm: 'Process refund?' },
    ],
  }} />;
}
