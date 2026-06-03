import { AdminResourcePage, StatusBadge } from './AdminResourcePage';
import { assetUrl } from '../../lib/assets';

export default function AdminBrands() {
  return <AdminResourcePage config={{
    title: 'Brands',
    description: 'Manage brand profiles, logos, websites, and active status.',
    endpoint: '/brands',
    queryKey: 'admin-brands',
    createLabel: 'Create brand',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'slug', label: 'Slug', placeholder: 'Auto-generated when blank' },
      { name: 'logo', label: 'Logo', type: 'file' },
      { name: 'description', label: 'Description', type: 'textarea', fullWidth: true },
      { name: 'isApproved', label: 'Approved', type: 'checkbox', defaultValue: false },
    ],
    columns: [
      { key: 'logo', label: 'Logo', render: (v) => v ? <img src={assetUrl(v)} alt="" className="h-9 w-9 rounded object-cover" /> : <div className="h-9 w-9 rounded bg-gray-100" /> },
      { key: 'name', label: 'Name' },
      { key: 'slug', label: 'Slug' },
      { key: '_count', label: 'Products', render: (v) => v?.products ?? 0 },
      { key: 'isApproved', label: 'Status', render: (v) => <StatusBadge value={v === false ? 'PENDING' : 'APPROVED'} /> },
    ],
  }} />;
}
