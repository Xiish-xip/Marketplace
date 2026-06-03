import { Outlet } from 'react-router-dom';
import { Bell, CreditCard, LayoutDashboard, Package, Settings, User, Bot, Star, Gift, Briefcase, Share2 } from 'lucide-react';
import ProtectedLayout from '../shared/ProtectedLayout';
import ErrorBoundary from '../../components/ErrorBoundary';

const navItems = [
  { label: 'Overview', href: '/account', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Orders', href: '/account/orders', icon: <Package className="h-5 w-5" /> },
  { label: 'Subscriptions', href: '/account/subscriptions', icon: <Gift className="h-5 w-5" /> },
  { label: 'Loyalty Program', href: '/account/loyalty', icon: <Star className="h-5 w-5" /> },
  { label: 'B2B Portal', href: '/account/b2b', icon: <Briefcase className="h-5 w-5" /> },
  { label: 'Referrals', href: '/account/referrals', icon: <Share2 className="h-5 w-5" /> },
  { label: 'Notifications', href: '/account/notifications', icon: <Bell className="h-5 w-5" /> },
  { label: 'Payments', href: '/account/payments', icon: <CreditCard className="h-5 w-5" /> },
  { label: 'AI Assistant', href: '/account/ai', icon: <Bot className="h-5 w-5" /> },
  { label: 'Settings', href: '/account/settings', icon: <Settings className="h-5 w-5" /> },
  { label: 'Public Profile', href: '/profile', icon: <User className="h-5 w-5" /> },
];

export default function CustomerLayout() {
  return (
    <ProtectedLayout items={navItems} title="Customer Center" subtitle="Track purchases, messages, payments, and preferences" allowedRoles={['CUSTOMER', 'SELLER', 'DELIVERY', 'ADMIN', 'SUPER_ADMIN']}>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </ProtectedLayout>
  );
}
