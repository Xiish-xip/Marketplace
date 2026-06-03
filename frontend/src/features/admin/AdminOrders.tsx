import { AdminResourcePage, StatusBadge } from './AdminResourcePage';

export default function AdminOrders() {
  return <AdminResourcePage config={{
    title: 'Orders',
    description: 'View, update, and cancel customer orders across the marketplace.',
    endpoint: '/orders/admin/all',
    queryKey: 'admin-orders',
    allowCreate: false,
    allowEdit: false,
    allowDelete: false,
    filters: [
      { name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] },
      { name: 'dateFrom', label: 'Date from', type: 'date' },
      { name: 'dateTo', label: 'Date to', type: 'date' },
      { name: 'customer', label: 'Customer search' },
    ],
    fields: [
      { name: 'customerEmail', label: 'Customer email' },
      { name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'], defaultValue: 'PENDING' },
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'notes', label: 'Notes', type: 'textarea', fullWidth: true },
    ],
    columns: [
      { key: 'id', label: 'Order ID', render: (v) => String(v).slice(0, 8) },
      { key: 'customer', label: 'Customer', render: (v, row) => v?.email || row.user?.email || row.customerEmail || '-' },
      { key: 'items', label: 'Items', render: (v, row) => v?.length || row.orderItems?.length || row.itemsCount || 0 },
      { key: 'total', label: 'Total', render: (v, row) => `${Number(v ?? row.totalAmount ?? 0).toLocaleString()} TZS` },
      { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v} /> },
      { key: 'createdAt', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    ],
    actions: [
      { label: 'Confirm', endpoint: (r) => `/orders/${r.id}/status`, method: 'patch', data: { status: 'CONFIRMED' } },
      { label: 'Cancel', endpoint: (r) => `/orders/${r.id}/cancel`, method: 'post', confirm: 'Cancel this order?' },
    ],
  }} />;
}
