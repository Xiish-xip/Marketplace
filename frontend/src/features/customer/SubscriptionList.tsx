import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api-enhanced';
import { CreditCard, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { SkeletonPage } from '../../components/Skeleton';

export default function SubscriptionList() {
  const { data, isLoading } = useQuery({
    queryKey: ['customer', 'subscriptions'],
    queryFn: () => get('/subscriptions/my'),
  });

  const subscriptions = data?.data || [];

  if (isLoading) return <SkeletonPage cards={4} columns={2} className="min-h-screen px-4 py-6" />;

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-12">
        <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Subscriptions</h3>
        <p className="text-sm text-gray-500">You haven't subscribed to any plans yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">My Subscriptions</h2>
      {subscriptions.map((sub: any) => (
        <div key={sub.id} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">{sub.plan?.name || 'Subscription'}</h3>
              <p className="text-sm text-gray-500">Started {new Date(sub.createdAt).toLocaleDateString()}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
              sub.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
              sub.status === 'PAST_DUE' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {sub.status}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Renews {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : 'N/A'}</span>
            <span className="flex items-center gap-1"><CreditCard className="w-4 h-4" /> {sub.plan?.price || 0} {sub.plan?.currency || 'USD'}/{sub.plan?.interval || 'month'}</span>
          </div>
          {sub.plan?.features?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {sub.plan.features.map((f: any, i: number) => (
                  <span key={i} className="flex items-center gap-1 text-xs text-gray-600">
                    <CheckCircle className="w-3 h-3 text-green-500" /> {f.label || f.key}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}