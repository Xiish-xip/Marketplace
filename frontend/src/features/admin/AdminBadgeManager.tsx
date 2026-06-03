import { FormEvent, useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api-enhanced';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ConfirmDialog';

interface BadgeType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string;
  category: string;
  criteria: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface UserBadge {
  id: string;
  userId: string;
  badgeTypeId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  badgeType: BadgeType;
}

export default function AdminBadgeManager() {
  const confirmAction = useConfirm();
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [pendingBadges, setPendingBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<UserBadge[]>([]);
  const [activeTab, setActiveTab] = useState<'types' | 'pending' | 'all'>('types');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BadgeType | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    color: '#6366f1',
    category: 'seller',
    criteria: '',
  });

  const fetchBadgeTypes = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/badges');
      setBadgeTypes(data.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load badge types');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingBadges = useCallback(async () => {
    try {
      const { data } = await api.get('/badges/pending');
      setPendingBadges(data.data || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchAllBadges = useCallback(async () => {
    try {
      const { data } = await api.get('/badges/all');
      setAllBadges(data.data || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchBadgeTypes();
    fetchPendingBadges();
    fetchAllBadges();
  }, [fetchBadgeTypes, fetchPendingBadges, fetchAllBadges]);

  const resetForm = () => {
    setForm({ name: '', slug: '', description: '', icon: '', color: '#6366f1', category: 'seller', criteria: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (bt: BadgeType) => {
    setForm({
      name: bt.name,
      slug: bt.slug,
      description: bt.description || '',
      icon: bt.icon || '',
      color: bt.color,
      category: bt.category,
      criteria: bt.criteria || '',
    });
    setEditing(bt);
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        description: form.description || undefined,
        icon: form.icon || undefined,
        criteria: form.criteria || undefined,
      };
      if (editing) {
        await api.put(`/badges/${editing.id}`, payload);
        toast.success('Badge type updated');
      } else {
        await api.post('/badges', payload);
        toast.success('Badge type created');
      }
      resetForm();
      fetchBadgeTypes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save badge type');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Delete badge type?',
      message: 'This will also remove all user badges of this type.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/badges/${id}`);
      toast.success('Badge type deleted');
      fetchBadgeTypes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/badges/${id}/review`, { status });
      toast.success(`Badge ${status.toLowerCase()}`);
      fetchPendingBadges();
      fetchAllBadges();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to review');
    }
  };

  const handleRevoke = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Revoke badge?',
      message: 'The badge will be removed from this user.',
      confirmText: 'Revoke',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.put(`/badges/${id}/revoke`);
      toast.success('Badge revoked');
      fetchAllBadges();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to revoke');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Badge Manager</h1>
          <p className="text-sm text-gray-500 mt-1">Manage badge types and review user badge applications</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          + New Badge Type
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['types', 'pending', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'types' && `Badge Types (${badgeTypes.length})`}
            {tab === 'pending' && `Pending Reviews (${pendingBadges.length})`}
            {tab === 'all' && `All Badges (${allBadges.length})`}
          </button>
        ))}
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Badge Type' : 'Create Badge Type'}</h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text" required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text" required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon (emoji)</label>
                  <input
                    type="text" value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="color" value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="seller">Seller</option>
                    <option value="delivery">Delivery</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Criteria (JSON)</label>
                <input
                  type="text" value={form.criteria}
                  onChange={(e) => setForm({ ...form, criteria: e.target.value })}
                  placeholder='{"minSales": 100}'
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                  {editing ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Badge Types */}
      {activeTab === 'types' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : badgeTypes.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No badge types yet. Create one to get started.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {badgeTypes.map((bt) => (
                <div key={bt.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: bt.color + '20' }}>
                    {bt.icon || '🏅'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{bt.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        bt.category === 'seller' ? 'bg-amber-100 text-amber-700' :
                        bt.category === 'delivery' ? 'bg-pink-100 text-pink-700' :
                        'bg-cyan-100 text-cyan-700'
                      }`}>{bt.category}</span>
                      {!bt.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                    </div>
                    {bt.description && <p className="text-sm text-gray-500 truncate">{bt.description}</p>}
                    <p className="text-xs text-gray-400">/{bt.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(bt)} className="text-xs px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg">Edit</button>
                    <button onClick={() => handleDelete(bt.id)} className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Pending Reviews */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {pendingBadges.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No pending badge applications.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingBadges.map((ub) => (
                <div key={ub.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: ub.badgeType.color + '20' }}>
                    {ub.badgeType.icon || '🏅'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900">{ub.badgeType.name}</span>
                    <span className="text-xs ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">PENDING</span>
                    <p className="text-xs text-gray-500 mt-0.5">User: {ub.userId} | Applied: {new Date(ub.appliedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleReview(ub.id, 'APPROVED')} className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button>
                    <button onClick={() => handleReview(ub.id, 'REJECTED')} className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: All Badges */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {allBadges.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No badges assigned yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {allBadges.map((ub) => (
                <div key={ub.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: ub.badgeType.color + '20' }}>
                    {ub.badgeType.icon || '🏅'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900">{ub.badgeType.name}</span>
                    <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${
                      ub.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      ub.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{ub.status}</span>
                    <p className="text-xs text-gray-500 mt-0.5">User: {ub.userId}</p>
                    {ub.reviewNote && <p className="text-xs text-gray-400">Note: {ub.reviewNote}</p>}
                  </div>
                  {ub.status === 'APPROVED' && (
                    <button onClick={() => handleRevoke(ub.id)} className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg">Revoke</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
