import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '../../lib/api-enhanced';
import toast from 'react-hot-toast';
import { Search, Plus, Globe, Languages, Save, Trash2, Edit3, X, Check, ChevronDown, Loader2 } from 'lucide-react';

interface Language {
  id: string; code: string; name: string; nativeName: string | null;
  isRtl: boolean; isDefault: boolean; isActive: boolean; flagUrl: string | null; sortOrder: number;
}

interface TranslationKey {
  id: string; key: string; group: string; description: string | null;
  values: Array<{ id: string; language: string; value: string; updatedAt: string }>;
}

export default function AdminTranslations() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'keys' | 'languages'>('keys');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editingValue, setEditingValue] = useState<{ keyId: string; lang: string; value: string } | null>(null);
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKey, setNewKey] = useState({ key: '', group: 'general', description: '' });

  const { data: keysData, isLoading: keysLoading } = useQuery({
    queryKey: ['admin', 'translations', groupFilter, search, page],
    queryFn: () => get('/translations/keys', { group: groupFilter || undefined, search: search || undefined, page, limit: 20 }),
  });

  const { data: groups } = useQuery({
    queryKey: ['admin', 'translations', 'groups'],
    queryFn: () => get('/translations/groups'),
  });

  const { data: languagesData, isLoading: langsLoading } = useQuery({
    queryKey: ['admin', 'translations', 'languages'],
    queryFn: () => get('/translations/languages'),
  });

  const languages: Language[] = languagesData?.data || [];
  const groupsList: string[] = groups?.data || [];
  const keys: TranslationKey[] = keysData?.data?.data || [];
  const pagination = keysData?.data?.pagination;

  // Mutations
  const setValueMutation = useMutation({
    mutationFn: ({ keyId, language, value }: { keyId: string; language: string; value: string }) =>
      put(`/translations/values/${keyId}`, { language, value }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'translations'] }); toast.success('Value saved'); setEditingValue(null); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const deleteKeyMutation = useMutation({
    mutationFn: (id: string) => del(`/translations/keys/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'translations'] }); toast.success('Key deleted'); },
  });

  const createKeyMutation = useMutation({
    mutationFn: (data: any) => post('/translations/keys', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'translations'] }); toast.success('Key created'); setShowAddKey(false); setNewKey({ key: '', group: 'general', description: '' }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create'),
  });

  const createLangMutation = useMutation({
    mutationFn: (data: any) => post('/translations/languages', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'translations', 'languages'] }); toast.success('Language added'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add language'),
  });

  const toggleLangMutation = useMutation({
    mutationFn: ({ code, isActive }: { code: string; isActive: boolean }) => put(`/translations/languages/${code}`, { isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'translations', 'languages'] }); },
  });

  const getValue = (key: TranslationKey, lang: string) => key.values.find((v) => v.language === lang)?.value || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Translation Editor</h1>
          <p className="text-sm text-gray-500">Manage multi-language content across the marketplace</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        <button onClick={() => setActiveTab('keys')} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'keys' ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700'}`}>
          <Languages className="w-4 h-4 inline mr-1.5" /> Translation Keys
        </button>
        <button onClick={() => setActiveTab('languages')} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'languages' ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700'}`}>
          <Globe className="w-4 h-4 inline mr-1.5" /> Languages
        </button>
      </div>

      {activeTab === 'keys' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search keys..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
            </div>
            <select value={groupFilter} onChange={(e) => { setGroupFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Groups</option>
              {groupsList.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <button onClick={() => setShowAddKey(true)} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Key
            </button>
          </div>

          {/* Add Key Modal */}
          {showAddKey && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowAddKey(false)}>
              <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">New Translation Key</h3>
                  <button onClick={() => setShowAddKey(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                  <input value={newKey.key} onChange={(e) => setNewKey({ ...newKey, key: e.target.value })} placeholder="Translation key (e.g., nav.home)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <select value={newKey.group} onChange={(e) => setNewKey({ ...newKey, group: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {['general', 'nav', 'product', 'cart', 'checkout', 'auth', 'account', 'footer', 'admin', 'seller', 'errors'].map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <input value={newKey.description} onChange={(e) => setNewKey({ ...newKey, description: e.target.value })} placeholder="Description (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <button onClick={() => createKeyMutation.mutate(newKey)} disabled={!newKey.key} className="w-full py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
                    {createKeyMutation.isPending ? 'Creating...' : 'Create Key'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Keys Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Key</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Group</th>
                    {languages.slice(0, 4).map((l) => (
                      <th key={l.code} className="text-left px-4 py-3 font-medium text-gray-600">{l.nativeName || l.name}</th>
                    ))}
                    {languages.length > 4 && <th className="px-4 py-3 text-gray-400">+{languages.length - 4} more</th>}
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {keysLoading ? (
                    <tr><td colSpan={languages.length + 3} className="text-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</td></tr>
                  ) : keys.length === 0 ? (
                    <tr><td colSpan={languages.length + 3} className="text-center py-8 text-gray-400">No translation keys found</td></tr>
                  ) : keys.map((key) => (
                    <tr key={key.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-800 max-w-[200px] truncate">{key.key}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{key.group}</span></td>
                      {languages.slice(0, 4).map((l) => {
                        const val = getValue(key, l.code);
                        const isEditing = editingValue?.keyId === key.id && editingValue?.lang === l.code;
                        return (
                          <td key={l.code} className="px-4 py-3 max-w-[200px]">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input defaultValue={editingValue.value} autoFocus className="w-full px-2 py-1 border border-orange-300 rounded text-xs focus:ring-1 focus:ring-orange-500" onKeyDown={(e) => {
                                  if (e.key === 'Enter') setValueMutation.mutate({ keyId: key.id, language: l.code, value: (e.target as HTMLInputElement).value });
                                  if (e.key === 'Escape') setEditingValue(null);
                                }} />
                                <button onClick={() => setEditingValue(null)} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <span className="text-gray-700 text-xs cursor-pointer hover:text-orange-600 truncate block" onClick={() => setEditingValue({ keyId: key.id, lang: l.code, value: val })} title={val}>
                                {val || <span className="text-gray-300 italic">empty</span>}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      {languages.length > 4 && <td className="px-4 py-3 text-gray-400 text-xs">...</td>}
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteKeyMutation.mutate(key.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-100">Prev</button>
                  <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-100">Next</button>
                </div>
              </div>
            )}
          </div>

          {/* All language values for each key */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Edit All Languages</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {languages.map((l) => (
                <div key={l.code} className="flex items-center gap-3 text-sm">
                  <span className="w-20 font-medium text-gray-600">{l.nativeName || l.name}</span>
                  {keys.slice(0, 5).map((key) => {
                    const val = getValue(key, l.code);
                    const isEditing = editingValue?.keyId === key.id && editingValue?.lang === l.code;
                    return (
                      <div key={key.id} className="flex-1">
                        {isEditing ? (
                          <input defaultValue={editingValue.value} autoFocus className="w-full px-2 py-1 border border-orange-300 rounded text-xs" onBlur={(e) => setValueMutation.mutate({ keyId: key.id, language: l.code, value: e.target.value })} onKeyDown={(e) => e.key === 'Escape' && setEditingValue(null)} />
                        ) : (
                          <span className="text-xs text-gray-500 cursor-pointer hover:text-orange-600 truncate block" onClick={() => setEditingValue({ keyId: key.id, lang: l.code, value: val })} title={val}>
                            {val || <span className="text-gray-300">—</span>}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'languages' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Supported Languages</h3>
              <p className="text-xs text-gray-500">East Africa: Swahili, Amharic, Somali, Arabic + International: English, French, Portuguese, Chinese</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Native Name</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">RTL</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Default</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {languages.map((l) => (
                  <tr key={l.code} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{l.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{l.name}</td>
                    <td className="px-4 py-3 text-gray-600">{l.nativeName || '—'}</td>
                    <td className="px-4 py-3 text-center">{l.isRtl ? <Check className="w-4 h-4 text-green-500 inline" /> : '—'}</td>
                    <td className="px-4 py-3 text-center">{l.isDefault ? <Check className="w-4 h-4 text-orange-500 inline" /> : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleLangMutation.mutate({ code: l.code, isActive: !l.isActive })} className={`px-2 py-0.5 rounded text-xs font-medium ${l.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {l.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Add Language */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Language</h3>
            <LanguageAddForm onAdd={(data) => createLangMutation.mutate(data)} />
          </div>
        </div>
      )}
    </div>
  );
}

function LanguageAddForm({ onAdd }: { onAdd: (data: any) => void }) {
  const [form, setForm] = useState({ code: '', name: '', nativeName: '', isRtl: false, isDefault: false });

  const languagePresets = [
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
    { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
    { code: 'so', name: 'Somali', nativeName: 'Soomaali' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRtl: true },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {languagePresets.map((preset) => (
          <button key={preset.code} type="button" onClick={() => setForm({ ...form, ...preset })} className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${form.code === preset.code ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            {preset.nativeName || preset.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Code (e.g., sw)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name (e.g., Swahili)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <input value={form.nativeName} onChange={(e) => setForm({ ...form, nativeName: e.target.value })} placeholder="Native Name (e.g., Kiswahili)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isRtl} onChange={(e) => setForm({ ...form, isRtl: e.target.checked })} className="rounded" /> RTL</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="rounded" /> Default</label>
        </div>
      </div>
      <button onClick={() => onAdd(form)} disabled={!form.code || !form.name} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
        Add Language
      </button>
    </div>
  );
}