import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout, Plus, Trash2, Copy, Check, X, Eye, ExternalLink,
  ArrowLeft, AlertCircle, RefreshCw
} from 'lucide-react';
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useSiteSettings,
} from '../../lib/page-builder-hooks';
import { useConfirm } from '../../components/ConfirmDialog';

type TemplateType = 'header' | 'footer';

interface PageTemplate {
  id: string;
  title: string;
  description?: string | null;
  tree?: unknown[];
  isActive?: boolean;
  isPublished?: boolean;
}

interface SiteTemplateSettings {
  activeHeaderTemplateId?: string | null;
  activeFooterTemplateId?: string | null;
}

function AdminTemplateManager() {
  const navigate = useNavigate();
  const confirmAction = useConfirm();
  const [tab, setTab] = useState<TemplateType>('header');
  const [newModal, setNewModal] = useState(false);
  const [newData, setNewData] = useState({ title: '', slug: '', description: '' });

  const { data: templatesData, isLoading } = useTemplates({ templateType: tab });
  const { data: settingsData } = useSiteSettings();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const templates = (templatesData?.data || []) as PageTemplate[];
  const settings = (settingsData?.data || {}) as SiteTemplateSettings;
  const activeTemplateSettingKey = tab === 'header' ? 'activeHeaderTemplateId' : 'activeFooterTemplateId';
  const activeTemplateId = settings[activeTemplateSettingKey];

  const handleCreate = () => {
    if (!newData.title) return;
    createTemplate.mutate({
      ...newData,
      templateType: tab,
      slug: newData.slug || newData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    }, {
      onSuccess: () => setNewModal(false),
    });
  };

  const handleSetActive = (id: string) => {
    // Deactivate all templates of this type, then activate the selected one
    templates.forEach(t => {
      updateTemplate.mutate({ id: t.id, data: { isActive: t.id === id } });
    });
  };

  const handleTogglePublished = (id: string, isPublished: boolean) => {
    updateTemplate.mutate({ id, data: { isPublished: !isPublished } });
  };

  const handleDeleteTemplate = async (template: PageTemplate) => {
    const confirmed = await confirmAction({
      title: 'Delete template?',
      message: `Delete "${template.title}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (confirmed) deleteTemplate.mutate(template.id);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/admin/page-builder')} className="text-sm flex items-center gap-1 mb-2"
            style={{ color: 'rgb(var(--color-text-muted))' }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Layouts
          </button>
          <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>Header & Footer Builder</h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Create reusable headers and footers that can be assigned to any page
          </p>
        </div>
        <button onClick={() => setNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>
          <Plus className="w-4 h-4" /> New {tab === 'header' ? 'Header' : 'Footer'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
        <button onClick={() => setTab('header')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'header' ? 'shadow-sm' : ''}`}
          style={{
            backgroundColor: tab === 'header' ? 'rgb(var(--color-surface))' : 'transparent',
            color: tab === 'header' ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))',
          }}>
          <Layout className="w-4 h-4 inline mr-1.5" /> Headers
        </button>
        <button onClick={() => setTab('footer')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'footer' ? 'shadow-sm' : ''}`}
          style={{
            backgroundColor: tab === 'footer' ? 'rgb(var(--color-surface))' : 'transparent',
            color: tab === 'footer' ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))',
          }}>
          <Layout className="w-4 h-4 inline mr-1.5" /> Footers
        </button>
      </div>

      {/* Active template indicator */}
      <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgb(var(--color-primary-50))', border: '1px solid rgb(var(--color-primary-200))', color: 'rgb(var(--color-primary-700))' }}>
        <strong>Active {tab}:</strong> {activeTemplateId
          ? templates.find((template) => template.id === activeTemplateId)?.title || 'Unknown'
          : 'None selected'}
      </div>

      {/* Template grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'rgb(var(--color-text-muted))' }} />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
          <Layout className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgb(var(--color-text-disabled))' }} />
          <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>No {tab}s yet</p>
          <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-disabled))' }}>
            Create your first {tab} template
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-xl overflow-hidden transition-all hover:shadow-md"
              style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
              {/* Preview thumbnail */}
              <div className="h-32 flex items-center justify-center"
                style={{ backgroundColor: template.isActive ? 'rgb(var(--color-primary-50))' : 'rgb(var(--color-surface-muted))' }}>
                <Layout className="w-10 h-10" style={{ color: template.isActive ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-disabled))' }} />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>{template.title}</h3>
                  <div className="flex items-center gap-1">
                    {template.isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white"
                        style={{ backgroundColor: 'rgb(var(--color-success))' }}>Active</span>
                    )}
                    {template.isPublished ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white"
                        style={{ backgroundColor: 'rgb(var(--color-success))' }}>Live</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: 'rgb(var(--color-surface-muted))', color: 'rgb(var(--color-text-muted))' }}>Draft</span>
                    )}
                  </div>
                </div>
                {template.description && (
                  <p className="text-xs mb-3" style={{ color: 'rgb(var(--color-text-muted))' }}>{template.description}</p>
                )}
                <div className="flex items-center justify-between text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <span>{(template.tree || []).length} blocks</span>
                  <span>{tab}</span>
                </div>
                <div className="flex gap-1.5 mt-3 pt-3 border-t flex-wrap"
                  style={{ borderColor: 'rgb(var(--color-border))' }}>
                  <button onClick={() => navigate(`/admin/page-builder/${template.id}?type=template&templateType=${tab}`)}
                    className="flex-1 px-2 py-1.5 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>
                    <Eye className="w-3 h-3 inline mr-1" /> Edit
                  </button>
                  {!template.isActive && (
                    <button onClick={() => handleSetActive(template.id)}
                      className="px-2 py-1.5 rounded text-xs font-medium"
                      style={{ border: '1px solid rgb(var(--color-border))', color: 'rgb(var(--color-text-secondary))' }}>
                      <Check className="w-3 h-3 inline mr-1" /> Set Active
                    </button>
                  )}
                  <button onClick={() => handleTogglePublished(template.id, Boolean(template.isPublished))}
                    className="px-2 py-1.5 rounded text-xs font-medium"
                    style={{ border: '1px solid rgb(var(--color-border))', color: 'rgb(var(--color-text-secondary))' }}>
                    {template.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => void handleDeleteTemplate(template)}
                    className="px-2 py-1.5 rounded text-xs font-medium"
                    style={{ border: '1px solid rgb(var(--color-border))', color: 'rgb(var(--color-danger))' }}>
                    <Trash2 className="w-3 h-3 inline mr-1" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Template Modal */}
      {newModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setNewModal(false)}>
          <div className="rounded-xl p-6 w-full max-w-md shadow-xl"
            style={{ backgroundColor: 'rgb(var(--color-surface))' }}
            onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
              New {tab === 'header' ? 'Header' : 'Footer'} Template
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>Title</label>
                <input type="text" value={newData.title} onChange={(e) => setNewData({ ...newData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg))', color: 'rgb(var(--color-text))' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>Slug</label>
                <input type="text" value={newData.slug} onChange={(e) => setNewData({ ...newData, slug: e.target.value })}
                  placeholder="Auto-generated from title"
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg))', color: 'rgb(var(--color-text))' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>Description</label>
                <textarea rows={2} value={newData.description} onChange={(e) => setNewData({ ...newData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg))', color: 'rgb(var(--color-text))' }} />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setNewModal(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ border: '1px solid rgb(var(--color-border))', color: 'rgb(var(--color-text-secondary))' }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={!newData.title}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTemplateManager;
