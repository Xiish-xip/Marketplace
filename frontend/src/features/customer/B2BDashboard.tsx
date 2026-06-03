import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api-enhanced';
import { Briefcase, ShoppingCart, FileText, TrendingUp, DollarSign } from 'lucide-react';
import { SkeletonPage } from '../../components/Skeleton';

export default function B2BDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['customer', 'b2b', 'dashboard'],
    queryFn: () => get('/b2b/my-dashboard'),
  });

  if (isLoading) return <SkeletonPage cards={4} columns={2} className="min-h-screen px-4 py-6" />;

  const account = data?.data?.account;
  const stats = data?.data?.stats;
  const recentOrders = data?.data?.recentOrders || [];
  const quoteRequests = data?.data?.quoteRequests || [];

  if (!account) {
    return (
      <div className="text-center py-12">
        <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Business Account</h3>
        <p className="text-sm text-gray-500">No business account found. Contact sales to set up B2B access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">B2B Dashboard</h2>
        <p className="text-sm text-gray-500">{account.companyName} — {account.creditLimit ? `${account.currency || 'USD'} ${account.creditLimit.toLocaleString()} credit limit` : 'Net terms available'}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><ShoppingCart className="w-4 h-4" /> Orders</div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalOrders || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><DollarSign className="w-4 h-4" /> Total Spent</div>
            <p className="text-2xl font-bold text-gray-900">{account.currency || 'USD'} {stats.totalSpent?.toLocaleString() || '0'}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><FileText className="w-4 h-4" /> Quote Requests</div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalQuotes || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><TrendingUp className="w-4 h-4" /> Tier</div>
            <p className="text-2xl font-bold text-gray-900">{account.pricingTier || 'Standard'}</p>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Purchase Orders</h3>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-gray-400">No purchase orders yet</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((po: any) => (
              <div key={po.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="font-medium text-gray-800">PO-{po.orderNumber || po.id.slice(0, 8)}</span>
                  <span className="text-gray-400 ml-2">{new Date(po.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">{po.currency || 'USD'} {po.totalAmount?.toLocaleString() || '0'}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    po.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    po.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    po.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{po.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quote Requests */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quote Requests</h3>
        {quoteRequests.length === 0 ? (
          <p className="text-sm text-gray-400">No quote requests</p>
        ) : (
          <div className="space-y-2">
            {quoteRequests.map((qr: any) => (
              <div key={qr.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="font-medium text-gray-800">{qr.subject}</span>
                  <span className="text-gray-400 ml-2">{new Date(qr.createdAt).toLocaleDateString()}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  qr.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                  qr.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                  qr.status === 'COUNTERED' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{qr.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing Tiers */}
      {account.pricingTiers?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Bulk Pricing Tiers</h3>
          <div className="space-y-2">
            {account.pricingTiers.map((tier: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <span className="text-gray-600">{tier.minQuantity}+ units</span>
                <span className="font-medium text-gray-800">{tier.discountPercentage}% off</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}