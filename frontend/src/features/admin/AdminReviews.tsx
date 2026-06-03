import { AdminResourcePage, Stars, StatusBadge } from './AdminResourcePage';

export default function AdminReviews() {
  return <AdminResourcePage config={{
    title: 'Reviews',
    description: 'Moderate product reviews, ratings, replies, and removals.',
    endpoint: '/reviews',
    queryKey: 'admin-reviews',
    allowCreate: false,
    allowEdit: false,
    filters: [
      { name: 'rating', label: 'Rating', type: 'select', options: ['5', '4', '3', '2', '1'] },
      { name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'APPROVED', 'REJECTED'] },
      { name: 'product', label: 'Product search' },
    ],
    fields: [
      { name: 'productId', label: 'Product ID' },
      { name: 'customerEmail', label: 'Customer email' },
      { name: 'rating', label: 'Rating', type: 'number' },
      { name: 'title', label: 'Title' },
      { name: 'text', label: 'Text', type: 'textarea', fullWidth: true },
      { name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'APPROVED', 'REJECTED'], defaultValue: 'PENDING' },
      { name: 'adminReply', label: 'Admin reply', type: 'textarea', fullWidth: true },
    ],
    columns: [
      { key: 'product', label: 'Product', render: (v, row) => v?.title || row.productTitle || '-' },
      { key: 'customer', label: 'Customer', render: (v, row) => v?.email || row.customerEmail || '-' },
      { key: 'rating', label: 'Rating', render: (v) => <Stars value={v} /> },
      { key: 'title', label: 'Title' },
      { key: 'text', label: 'Text', render: (v) => <span className="line-clamp-1">{v}</span> },
      { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v || 'PENDING'} /> },
      { key: 'createdAt', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    ],
    actions: [
      { label: 'Approve', endpoint: (r) => `/reviews/${r.id}/approve`, method: 'patch' },
      { label: 'Reject', endpoint: (r) => `/reviews/${r.id}/reject`, method: 'patch' },
    ],
  }} />;
}
