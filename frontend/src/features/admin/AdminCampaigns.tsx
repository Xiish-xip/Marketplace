import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '../../lib/api-enhanced';
import toast from 'react-hot-toast';
import { Plus, Search, Edit3, Trash2, X, Megaphone, Calendar, Loader2, Check } from 'lucide-react';
import { useConfirm } from '../../components/ConfirmDialog';

export default function AdminCampaigns() {
  const qc = useQueryClient();
  const confirmAction = useConfirm();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: '', description: '', banner: '', type: 'FLASH_SALE', discountType: 'PERCENTAGE', discountValue: 0, startAt: '', endAt: '', isActive: true });
  const [productIds, setProductIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'campaigns', search, page],
    queryFn: () => get('/campaigns', { search: search || undefined, page, limit: 20 }),
  });

  const campaigns = data?.data?.data || [];
  const pagination = data?.data?.pagination;

  const { data: productsData } = useQuery({
    queryKey: ['admin', 'products', 'simple'],
    queryFn: () => get('/products', { limit: 100, select: 'id,title,slug' }),
  });
  const allProducts = productsData?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => post('/campaigns', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'campaigns'] }); toast.success('Campaign created'); closeForm(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create campaign'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => put(`/campaigns/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'campaigns'] }); toast.success('Campaign updated'); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'campaigns'] }); toast.success('Campaign deleted'); },
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm({ name: '', description: '', banner: '', type: 'FLASH_SALE', discountType: 'PERCENTAGE', discountValue: 0, startAt: '', endAt: '', isActive: true }); setProductIds([]); };

  const openEdit = (campaign: any) => {
    setEditing(campaign);
    setForm({
      name: campaign.name,
      description: campaign.description || '',
      banner: campaign.banner || '',
      type: campaign.type,
      discountType: campaign.discountType,
      discountValue: campaign.discountValue,
      startAt: campaign.startAt?.slice(0, 16) || '',
      endAt: campaign.endAt?.slice(0, 16) || '',
      isActive: campaign.isActive,
    });
    setProductIds(campaign.products?.map((p: any) => p.productId) || []);
    setShowForm(true);
  };

  const handleSubmit = () => {
    const payload = { ...form, productIds };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const handleDeleteCampaign = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Delete campaign?',
      message: 'This removes the promotional campaign from the marketplace.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (confirmed) deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Manager</h1>
          <p className="text-sm text-gray-500">Create and manage promotional campaigns</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* Campaign Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={closeForm}>
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Campaign' : 'New Campaign'}</h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Campaign Name" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div className="col-span-2"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} /></div>
              <div><input value={form.banner} onChange={(e) => setForm({ ...form, banner: e.target.value })} placeholder="Banner URL" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="FLASH_SALE">Flash Sale</option>
                <option value="SEASONAL">Seasonal</option>
                <option value="VENDOR_DRIVEN">Vendor Driven</option>
              </select>
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED_AMOUNT">Fixed Amount</option>
              </select>
              <input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })} placeholder="Discount Value" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" /> Active</label>
            </div>
            {/* Product Selection */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Products ({productIds.length} selected)</h4>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {allProducts.map((p: any) => (
                  <label key={p.id} className="flex items-center gap-2 py-1 text-sm cursor-pointer hover:bg-gray-50 px-2 rounded">
                    <input type="checkbox" checked={productIds.includes(p.id)} onChange={(e) => setProductIds(e.target.checked ? [...productIds, p.id] : productIds.filter((id) => id !== p.id))} className="rounded" />
                    {p.title}
                  </label>
                ))}
              </div>
            </div>
            <button onClick={handleSubmit} disabled={!form.name} className="w-full mt-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
              {editing ? 'Update Campaign' : 'Create Campaign'}
            </button>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Discount</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Products</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Active</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No campaigns found</td></tr>
            ) : campaigns.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{c.type}</span></td>
                <td className="px-4 py-3">{c.discountValue}{c.discountType === 'PERCENTAGE' ? '%' : '$'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {new Date(c.startAt).toLocaleDateString()} - {new Date(c.endAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">{c.products?.length || 0}</td>
                <td className="px-4 py-3 text-center">{c.isActive ? <Check className="w-4 h-4 text-green-500 inline" /> : <X className="w-4 h-4 text-gray-300 inline" />}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-orange-500 mr-2"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => void handleDeleteCampaign(c.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50">Prev</button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
