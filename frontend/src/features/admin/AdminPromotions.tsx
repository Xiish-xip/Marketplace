import { AdminResourcePage, StatusBadge } from './AdminResourcePage';

export default function AdminPromotions() {
  return <AdminResourcePage config={{
    title: 'Promotions',
    description: 'Create coupons, discount campaigns, and usage limits.',
    endpoint: '/promotions/campaigns',
    queryKey: 'admin-promotions',
    createLabel: 'Create promotion',
    allowEdit: false,
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'slug', label: 'Slug' },
      { name: 'description', label: 'Description', type: 'textarea', fullWidth: true },
      { name: 'banner', label: 'Banner URL' },
      { name: 'type', label: 'Campaign type', type: 'select', options: ['FLASH_SALE', 'SEASONAL', 'VENDOR_DRIVEN'], defaultValue: 'FLASH_SALE' },
      { name: 'discountType', label: 'Discount type', type: 'select', options: ['PERCENTAGE', 'FIXED'], defaultValue: 'PERCENTAGE' },
      { name: 'discountValue', label: 'Discount value', type: 'number' },
      { name: 'startAt', label: 'Start date', type: 'datetime-local' },
      { name: 'endAt', label: 'End date', type: 'datetime-local' },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Campaign' },
      { key: 'discountType', label: 'Type' },
      { key: 'discountValue', label: 'Value' },
      { key: '_count', label: 'Products', render: (v) => v?.products ?? 0 },
      { key: 'status', label: 'Status', render: (v, row) => <StatusBadge value={v || (row.isActive === false ? 'INACTIVE' : 'ACTIVE')} /> },
      { key: 'startAt', label: 'Date Range', render: (v, row) => `${v ? new Date(v).toLocaleDateString() : '-'} - ${row.endAt ? new Date(row.endAt).toLocaleDateString() : '-'}` },
    ],
  }} />;
}
