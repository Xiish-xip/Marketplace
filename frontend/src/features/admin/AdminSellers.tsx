import { AdminResourcePage, Stars, StatusBadge } from './AdminResourcePage';

export default function AdminSellers() {
  return <AdminResourcePage config={{
    title: 'Sellers',
    description: 'Approve seller applications, suspend stores, and manage commissions.',
    endpoint: '/sellers/admin/all',
    queryKey: 'admin-sellers',
    allowCreate: false,
    allowEdit: false,
    allowDelete: false,
    fields: [
      { name: 'storeName', label: 'Store name' },
      { name: 'ownerEmail', label: 'Owner email' },
      { name: 'commissionRate', label: 'Commission rate', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'APPROVED', 'SUSPENDED'], defaultValue: 'PENDING' },
    ],
    columns: [
      { key: 'storeName', label: 'Store Name' },
      { key: 'user', label: 'Owner', render: (v, row) => v?.firstName ? `${v.firstName} ${v.lastName || ''}` : row.ownerName || '-' },
      { key: 'user', label: 'Email', render: (v, row) => v?.email || row.ownerEmail || '-' },
      { key: 'productsCount', label: 'Products Count', render: (v, row) => v || row._count?.products || 0 },
      { key: 'rating', label: 'Rating', render: (v) => <Stars value={v || 0} /> },
      { key: 'status', label: 'Status', render: (v, row) => <StatusBadge value={v || row.kycStatus || 'PENDING'} /> },
      { key: 'createdAt', label: 'Date Joined', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    ],
    actions: [
      { label: 'Approve', endpoint: (r) => `/sellers/${r.id}/approve`, method: 'patch' },
      { label: 'Suspend', endpoint: (r) => `/sellers/${r.id}/suspend`, method: 'patch', confirm: 'Suspend this seller?' },
    ],
  }} />;
}
