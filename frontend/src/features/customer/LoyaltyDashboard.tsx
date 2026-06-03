import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api-enhanced';
import { Star, Gift, Award, TrendingUp } from 'lucide-react';
import { SkeletonPage } from '../../components/Skeleton';

export default function LoyaltyDashboard() {
  const { data: memberData, isLoading } = useQuery({
    queryKey: ['customer', 'loyalty', 'me'],
    queryFn: () => get('/loyalty/my-status'),
  });

  const { data: rewardsData } = useQuery({
    queryKey: ['customer', 'loyalty', 'rewards'],
    queryFn: () => get('/loyalty/rewards'),
  });

  const member = memberData?.data;
  const rewards = rewardsData?.data || [];

  if (isLoading) return <SkeletonPage cards={4} columns={2} className="min-h-screen px-4 py-6" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">My Loyalty Program</h2>
        <p className="text-sm text-gray-500">Earn points, unlock tiers, and redeem rewards</p>
      </div>

      {/* Points Card */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm font-medium">Available Points</p>
            <p className="text-4xl font-bold mt-1">{member?.points || 0}</p>
            <p className="text-orange-100 text-xs mt-1">
              {member?.tier?.name || 'Bronze'} Tier
            </p>
          </div>
          <div className="bg-white/20 rounded-full p-4">
            <Star className="w-8 h-8" />
          </div>
        </div>
        {member?.lifetimePoints && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-2 text-sm text-orange-100">
              <TrendingUp className="w-4 h-4" />
              <span>Lifetime: {member.lifetimePoints} points earned</span>
            </div>
          </div>
        )}
      </div>

      {/* Tiers */}
      {member?.tier && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-orange-500" /> Current Tier Benefits
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {member.tier.benefits?.length > 0 ? member.tier.benefits.map((b: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <Star className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>{b}</span>
              </div>
            )) : (
              <p className="text-sm text-gray-400 col-span-2">No special benefits yet. Keep earning!</p>
            )}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {member?.transactions?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Points History</h3>
          <div className="space-y-2">
            {member.transactions.slice(0, 5).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{tx.type} {tx.reference ? `- ${tx.reference}` : ''}</span>
                <span className={tx.points > 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                  {tx.points > 0 ? '+' : ''}{tx.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Rewards */}
      {rewards.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Gift className="w-4 h-4 text-orange-500" /> Available Rewards
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rewards.filter((r: any) => r.isActive).map((reward: any) => (
              <div key={reward.id} className="border border-gray-100 rounded-lg p-3 hover:border-orange-200 transition-colors">
                <h4 className="font-medium text-sm text-gray-900">{reward.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{reward.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-semibold text-orange-600">{reward.pointsRequired} points</span>
                  <button
                    disabled={!member || member.points < reward.pointsRequired}
                    className="px-3 py-1 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Redeem
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}