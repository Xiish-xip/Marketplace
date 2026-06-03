import { AdminResourcePage, StatusBadge } from './AdminResourcePage';

export default function AdminShipping() {
  return <AdminResourcePage config={{
    title: 'Shipping',
    description: 'Create and manage shipment records, tracking numbers, courier status, and delivery estimates.',
    endpoint: '/shipping',
    queryKey: 'admin-shipping',
    createLabel: 'Create shipment',
    fields: [
      { name: 'orderId', label: 'Order ID' },
      { name: 'courierCode', label: 'Courier code' },
      { name: 'trackingNumber', label: 'Tracking number' },
      { name: 'origin', label: 'Origin' },
      { name: 'destination', label: 'Destination' },
      { name: 'weight', label: 'Weight', type: 'number' },
      { name: 'estimatedDays', label: 'Estimated days', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'] },
    ],
    columns: [
      { key: 'trackingNumber', label: 'Tracking #', render: (v) => v || '-' },
      { key: 'courierCode', label: 'Courier' },
      { key: 'order', label: 'Order', render: (_v, row) => row.order?.orderNumber || row.orderId },
      { key: 'destination', label: 'Destination', render: (v) => v || '-' },
      { key: 'estimatedDays', label: 'ETA', render: (v) => v ? `${v} day${Number(v) === 1 ? '' : 's'}` : '-' },
      { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v || 'PENDING'} /> },
    ],
  }} />;
}
