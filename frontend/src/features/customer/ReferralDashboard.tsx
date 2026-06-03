import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../../lib/api-enhanced';
import { Share2, Users, Gift, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { SkeletonPage } from '../../components/Skeleton';

export default function ReferralDashboard() {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customer', 'referrals'],
    queryFn: () => get('/referrals/my'),
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email?: string; phone?: string }) => post('/referrals/invite', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer', 'referrals'] }); toast.success('Invite sent!'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to send invite'),
  });

  const referralLink = data?.data?.referralLink || `${window.location.origin}/register?ref=${data?.data?.code || ''}`;
  const referrals = data?.data?.referrals || [];
  const stats = data?.data?.stats || { total: 0, joined: 0, rewarded: 0, pointsEarned: 0 };

  if (isLoading) return <SkeletonPage cards={4} columns={2} className="min-h-screen px-4 py-6" />;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Referral Program</h2>
        <p className="text-sm text-gray-500">Invite friends and earn rewards</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Users className="w-5 h-5 text-orange-500 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total Invited</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Users className="w-5 h-5 text-green-500 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{stats.joined}</p>
          <p className="text-xs text-gray-500">Joined</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Gift className="w-5 h-5 text-yellow-500 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{stats.rewarded}</p>
          <p className="text-xs text-gray-500">Rewarded</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Gift className="w-5 h-5 text-purple-500 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{stats.pointsEarned}</p>
          <p className="text-xs text-gray-500">Points Earned</p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Referral Link</h3>
        <div className="flex items-center gap-2">
          <input readOnly value={referralLink} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600" />
          <button onClick={copyLink} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 flex items-center gap-1.5">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Share this link with friends. You earn points when they join!</p>
      </div>

      {/* Invite by Email */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Invite by Email</h3>
        <InviteForm onInvite={(data) => inviteMutation.mutate(data)} />
      </div>

      {/* Referral List */}
      {referrals.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Referrals</h3>
          <div className="space-y-2">
            {referrals.map((ref: any) => (
              <div key={ref.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <span className="text-gray-600">{ref.refereeEmail || ref.refereePhone || 'Invited'}</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    ref.status === 'JOINED' ? 'bg-green-100 text-green-700' :
                    ref.status === 'REWARDED' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{ref.status}</span>
                  {ref.rewardPoints > 0 && <span className="text-xs text-orange-600">+{ref.rewardPoints} pts</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InviteForm({ onInvite }: { onInvite: (data: any) => void }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="flex gap-2">
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Friend's email" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Or phone" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
      <button onClick={() => { onInvite({ email: email || undefined, phone: phone || undefined }); setEmail(''); setPhone(''); }} disabled={!email && !phone} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
        Send
      </button>
    </div>
  );
}