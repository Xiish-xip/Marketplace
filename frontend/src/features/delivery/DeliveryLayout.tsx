import { Outlet } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import ProtectedLayout from '../shared/ProtectedLayout';

const navItems = [
  { label: 'Dashboard', href: '/delivery', icon: <LayoutDashboard className="w-5 h-5" /> },
];

export default function DeliveryLayout() {
  return (
    <ProtectedLayout items={navItems} title="Delivery Center" subtitle="Accept jobs, update status, and track payouts" allowedRoles={['DELIVERY', 'ADMIN', 'SUPER_ADMIN']}>
      <Outlet />
    </ProtectedLayout>
  );
}
