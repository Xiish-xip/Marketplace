import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout, Plus, Search, Eye, Copy, Check, Trash2, X, AlertCircle,
  Globe, Home, EyeOff, FileEdit, ExternalLink, ArrowUpRight,
  RefreshCw, LayoutDashboard
} from 'lucide-react';
import { useLayouts, useCreateLayout, useDeleteLayout, useDuplicateLayout, useUpdateLayout } from '../../lib/page-builder-hooks';
import toast from 'react-hot-toast';

interface PageLayout {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  pageType: string;
  isSystem: boolean;
  isPublished: boolean;
  isActive: boolean;
  path?: string | null;
  _count?: { sections: number };
  updatedAt: string;
}

const SYSTEM_PAGES = ['home', 'about', 'contact', 'terms', 'privacy', 'faq', 'returns'];

export default function AdminPages() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'system'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newPage, setNewPage] = useState({ title: '', slug: '', description: '', pageType: 'custom' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: layoutsData, isLoading, refetch } = useLayouts({ 
    search: search || undefined, 
    limit: 100 
  });
  const createLayout = useCreateLayout();
  const deleteLayout = useDeleteLayout();
  const duplicateLayout = useDuplicateLayout();
  const updateLayout = useUpdateLayout();

  const allLayouts = (layoutsData?.data || []) as PageLayout[];

  const filteredLayouts = allLayouts.filter((layout) => {
    if (filter === 'published') return layout.isPublished;
    if (filter === 'draft') return !layout.isPublished;
    if (filter === 'system') return layout.isSystem;
    return true;
  });

  const handleCreate = () => {
    if (!newPage.title.trim()) {
      toast.error('Page title is required');
      return;
    }
    const slug = newPage.slug || newPage.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    createLayout.mutate(
      { title: newPage.title, slug, description: newPage.description, pageType: newPage.pageType },
      {
        onSuccess: (res: any) => {
          setShowCreate(false);
          setNewPage({ title: '', slug: '', description: '', pageType: 'custom' });
          navigate(`/admin/page-builder/${res?.data?.id || res?.id}`);
        },
      }
    );
  };

  const handleSetHomepage = (layout: PageLayout) => {
    // Update layout to be the homepage — set isHomepage flag and publish
    updateLayout.mutate(
      { id: layout.id, data: { isHomepage: true } },
      { onSuccess: () => toast.success(`"${layout.title}" set as homepage`) }
    );
  };

  const handleTogglePublish = (layout: PageLayout) => {
    updateLayout.mutate(
      { id: layout.id, data: { isPublished: !layout.isPublished } },
      { onSuccess: () => toast.success(layout.isPublished ? 'Page unpublished' : 'Page published') }
    );
  };

  const handleDuplicate = (id: string) => {
    duplicateLayout.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteLayout.mutate(id, { onSuccess: () => setDeleteConfirm(null) });
  };

  const getPageTypeBadge = (layout: PageLayout) => {
    if (layout.isSystem) return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">System</span>;
    if (layout.slug === 'home' || (layout as any).isHomepage) return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700"><Home className="w-3 h-3 inline mr-0.5" />Home</span>;
    if (layout.pageType === 'landing') return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">Landing</span>;
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">Custom</span>;
  };

  const getStatusBadge = (layout: PageLayout) => {
    if (layout.isPublished) return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700"><Check className="w-3 h-3" />Published</span>;
    return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700"><EyeOff className="w-3 h-3" />Draft</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>Pages</h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Manage all pages on your marketplace. Create, edit, and organize content.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" aria-hidden="true" /> New Page
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {(['all', 'published', 'draft', 'system'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'all' && ` (${allLayouts.length})`}
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <input
            type="text"
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 text-sm"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl" style={{ backgroundColor: 'rgb(var(--color-surface-active))' }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredLayouts.length === 0 && (
        <div className="text-center py-16">
          <Layout className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgb(var(--color-text-disabled))' }} />
          <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>No pages found</h3>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {search ? 'Try a different search term' : 'Create your first page to get started'}
          </p>
          {!search && (
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              <Plus className="w-4 h-4" aria-hidden="true" /> Create Page
            </button>
          )}
        </div>
      )}

      {/* Page List */}
      {!isLoading && filteredLayouts.length > 0 && (
        <div className="space-y-2">
          {filteredLayouts.map((layout) => (
            <div
              key={layout.id}
              className="card p-4 flex items-center gap-4 transition-all hover:shadow-md"
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: layout.isSystem ? 'rgb(var(--color-purple-100))' : 'rgb(var(--color-primary-50))' }}
              >
                <Layout className="w-5 h-5" style={{ color: layout.isSystem ? 'rgb(var(--color-purple-600))' : 'rgb(var(--color-primary-600))' }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate" style={{ color: 'rgb(var(--color-text))' }}>{layout.title}</h3>
                  {getPageTypeBadge(layout)}
                  {getStatusBadge(layout)}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>/page/{layout.slug}</span>
                  {layout._count && (
                    <span className="text-xs" style={{ color: 'rgb(var(--color-text-disabled))' }}>
                      {layout._count.sections} sections
                    </span>
                  )}
                  <span className="text-xs" style={{ color: 'rgb(var(--color-text-disabled))' }}>
                    Updated {new Date(layout.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => navigate(`/admin/page-builder/${layout.id}`)}
                  className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                  title="Edit with page builder"
                >
                  <FileEdit className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </button>
                <button
                  onClick={() => window.open(`/page/${layout.slug}`, '_blank')}
                  className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                  title="Preview page"
                >
                  <ExternalLink className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </button>
                <button
                  onClick={() => handleTogglePublish(layout)}
                  className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                  title={layout.isPublished ? 'Unpublish' : 'Publish'}
                >
                  {layout.isPublished ? (
                    <EyeOff className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  ) : (
                    <Eye className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  )}
                </button>
                <button
                  onClick={() => handleDuplicate(layout.id)}
                  className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </button>
                {!layout.isSystem && (
                  <button
                    onClick={() => setDeleteConfirm(layout.id)}
                    className="p-2 rounded-lg transition-colors hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" style={{ color: 'rgb(var(--color-danger))' }} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-2xl p-6 shadow-xl" style={{ backgroundColor: 'rgb(var(--color-surface))' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>Create New Page</h2>
                <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>Add a new page to your marketplace</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>Page Title *</label>
                <input
                  type="text"
                  value={newPage.title}
                  onChange={(e) => {
                    setNewPage({ ...newPage, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') });
                  }}
                  placeholder="About Us"
                  className="input-field"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>URL Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>/page/</span>
                  <input
                    type="text"
                    value={newPage.slug}
                    onChange={(e) => setNewPage({ ...newPage, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="about-us"
                    className="input-field flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>Description</label>
                <textarea
                  value={newPage.description}
                  onChange={(e) => setNewPage({ ...newPage, description: e.target.value })}
                  placeholder="Brief description of this page"
                  rows={2}
                  className="input-field resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>Page Type</label>
                <select
                  value={newPage.pageType}
                  onChange={(e) => setNewPage({ ...newPage, pageType: e.target.value })}
                  className="select-field"
                >
                  <option value="custom">Custom Page</option>
                  <option value="landing">Landing Page</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleCreate} disabled={!newPage.title || createLayout.isPending} className="btn-primary flex-1">
                {createLayout.isPending ? 'Creating...' : 'Create Page'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-xl" style={{ backgroundColor: 'rgb(var(--color-surface))' }} onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgb(var(--color-danger))' }} />
              <h2 className="text-lg font-bold mb-1" style={{ color: 'rgb(var(--color-text))' }}>Delete Page?</h2>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                This action cannot be undone. All sections and content will be permanently removed.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleteLayout.isPending} className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: 'rgb(var(--color-danger))' }}>
                {deleteLayout.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}