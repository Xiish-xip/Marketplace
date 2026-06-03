import React from 'react';
import { AlertCircle, Check, Edit2, Eye, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DataTable, { type Column } from '../shared/DataTable';
import { del, get, patch, post, put } from '../../lib/api-enhanced';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ConfirmDialog';

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'date' | 'datetime-local' | 'checkbox' | 'multiselect' | 'file';

export interface AdminField {
  name: string;
  label: string;
  type?: FieldType;
  options?: string[];
  placeholder?: string;
  defaultValue?: any;
  fullWidth?: boolean;
}

export interface AdminAction {
  label: string;
  endpoint?: string | ((row: any) => string);
  method?: 'post' | 'patch' | 'put' | 'delete';
  data?: any | ((row: any) => any);
  confirm?: string;
}

export interface AdminResourceConfig {
  title: string;
  description: string;
  endpoint: string;
  queryKey: string;
  columns: Column<any>[];
  fields: AdminField[];
  filters?: AdminField[];
  tabs?: string[];
  createLabel?: string;
  emptyTitle?: string;
  actions?: AdminAction[];
  bulkActions?: AdminAction[];
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  details?: (row: any) => React.ReactNode;
  stats?: { label: string; value: string; tone?: string }[];
}

const toFormValue = (value: any) => {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value;
  return value ?? '';
};

const normalizeRows = (payload: any, fallback: any[]) => {
  const raw = payload?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.results)) return raw.results;
  return fallback;
};

const normalizePagination = (payload: any, rows: any[], page: number) => {
  const pagination = payload?.pagination || payload?.data?.pagination;
  if (pagination) return pagination;
  return { page, limit: 10, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / 10)) };
};

function FieldInput({ field, value, onChange }: { field: AdminField; value: any; onChange: (value: any) => void }) {
  const type = field.type || 'text';
  if (type === 'textarea') {
    return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className="input-field min-h-[92px]" />;
  }
  if (type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className="select-field">
        <option value="">Select...</option>
        {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }
  if (type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
        <span className="text-sm text-gray-600">Enabled</span>
      </label>
    );
  }
  if (type === 'multiselect') {
    return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || 'Comma separated values'} className="input-field" />;
  }
  if (type === 'file') {
    return <input type="file" onChange={(e) => onChange(e.target.files?.[0]?.name || '')} className="input-field" />;
  }
  return <input type={type} value={value} onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} placeholder={field.placeholder} className="input-field" />;
}

export function StatusBadge({ value }: { value: string }) {
  const status = String(value || 'UNKNOWN').toUpperCase();
  const styles: Record<string, string> = {
    ACTIVE: 'badge-success',
    APPROVED: 'badge-success',
    COMPLETED: 'badge-success',
    DELIVERED: 'badge-success',
    PAID: 'badge-success',
    PENDING: 'badge-warning',
    PROCESSING: 'badge-info',
    SHIPPED: 'badge-info',
    CONFIRMED: 'badge-info',
    DRAFT: 'badge-neutral',
    INACTIVE: 'badge-neutral',
    CANCELLED: 'badge-error',
    REJECTED: 'badge-error',
    FAILED: 'badge-error',
    SUSPENDED: 'badge-error',
  };
  return <span className={styles[status] || 'badge-neutral'}>{status}</span>;
}

export function Stars({ value }: { value: number }) {
  return <span className="text-yellow-500">{'★★★★★'.slice(0, Math.round(value || 0))}<span className="text-gray-300">{'★★★★★'.slice(Math.round(value || 0))}</span></span>;
}

export function AdminResourcePage({ config }: { config: AdminResourceConfig }) {
  const confirmAction = useConfirm();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [activeTab, setActiveTab] = React.useState(config.tabs?.[0] || '');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [viewing, setViewing] = React.useState<any | null>(null);
  const [form, setForm] = React.useState<Record<string, any>>({});
  const [filters, setFilters] = React.useState<Record<string, any>>({});
  const qc = useQueryClient();
  const allowCreate = config.allowCreate !== false;
  const allowEdit = config.allowEdit !== false;
  const allowDelete = config.allowDelete !== false;

  const params = { page, limit: 10, search: search || undefined, ...filters, tab: activeTab || undefined };
  const query = useQuery({
    queryKey: [config.queryKey, params],
    queryFn: () => get(config.endpoint, params),
    retry: false,
  });
  const rows = normalizeRows(query.data, []);
  const pagination = normalizePagination(query.data, rows, page);

  const openForm = (row?: any) => {
    const next: Record<string, any> = {};
    config.fields.forEach((field) => {
      next[field.name] = row ? toFormValue(row[field.name]) : toFormValue(field.defaultValue);
    });
    setForm(next);
    setEditing(row || {});
  };

  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form };
      config.fields.filter((field) => field.type === 'multiselect').forEach((field) => {
        body[field.name] = String(body[field.name] || '').split(',').map((item) => item.trim()).filter(Boolean);
      });
      if (editing?.id) return put(`${config.endpoint}/${editing.id}`, body);
      return post(config.endpoint, body);
    },
    onSuccess: () => {
      toast.success(editing?.id ? 'Updated' : 'Created');
      setEditing(null);
      qc.invalidateQueries({ queryKey: [config.queryKey] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => del(`${config.endpoint}/${id}`),
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: [config.queryKey] });
    },
  });

  const runAction = useMutation({
    mutationFn: async ({ action, row }: { action: AdminAction; row: any }) => {
      const url = typeof action.endpoint === 'function' ? action.endpoint(row) : action.endpoint || `${config.endpoint}/${row.id}`;
      const body = typeof action.data === 'function' ? action.data(row) : action.data;
      if (action.method === 'delete') return del(url);
      if (action.method === 'put') return put(url, body);
      if (action.method === 'post') return post(url, body);
      return patch(url, body);
    },
    onSuccess: (result: any) => {
      const exportData = result?.data;
      if (exportData?.content && exportData?.filename) {
        const blob = new Blob([exportData.content], { type: exportData.mimeType || 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = exportData.filename;
        link.click();
        URL.revokeObjectURL(url);
      }
      toast.success('Action completed');
      qc.invalidateQueries({ queryKey: [config.queryKey] });
    },
  });

  const handleRowAction = async (action: AdminAction, row: any) => {
    if (action.confirm) {
      const confirmed = await confirmAction({
        title: action.confirm,
        message: 'Please confirm before continuing.',
        confirmText: action.method === 'delete' ? 'Delete' : 'Confirm',
        variant: action.method === 'delete' ? 'danger' : 'warning',
      });
      if (!confirmed) return;
    }
    runAction.mutate({ action, row });
  };

  const handleDeleteRow = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Delete this record?',
      message: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (confirmed) remove.mutate(id);
  };

  const handleBulkAction = async (action: AdminAction) => {
    if (action.confirm) {
      const confirmed = await confirmAction({
        title: action.confirm,
        message: `${selectedIds.length} selected record${selectedIds.length === 1 ? '' : 's'} will be affected.`,
        confirmText: action.method === 'delete' ? 'Delete' : 'Confirm',
        variant: action.method === 'delete' ? 'danger' : 'warning',
      });
      if (!confirmed) return;
    }
    selectedIds.forEach((id) => runAction.mutate({ action: { ...action, endpoint: action.endpoint || `${config.endpoint}/${id}` }, row: { id } }));
    setSelectedIds([]);
  };

  const actionColumn: Column<any> = {
    key: 'id',
    label: 'Actions',
    render: (_value, row) => (
      <div className="flex items-center gap-1">
        <button onClick={() => setViewing(row)} className="p-1.5 rounded hover:bg-gray-100" aria-label="View details"><Eye className="h-4 w-4 text-gray-500" /></button>
        {allowEdit && <button onClick={() => openForm(row)} className="p-1.5 rounded hover:bg-gray-100" aria-label="Edit"><Edit2 className="h-4 w-4 text-gray-500" /></button>}
        {(config.actions || []).map((action) => (
          <button key={action.label} onClick={() => void handleRowAction(action, row)} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200">
            {action.label}
          </button>
        ))}
        {allowDelete && <button onClick={() => void handleDeleteRow(row.id)} className="p-1.5 rounded hover:bg-red-50" aria-label="Delete"><Trash2 className="h-4 w-4 text-red-500" /></button>}
      </div>
    ),
  };

  const bulkActions = (
    <>
      {(config.bulkActions || (allowDelete ? [{ label: 'Delete selected', method: 'delete' as const, confirm: 'Delete selected records?' }] : [])).map((action) => (
        <button
          key={action.label}
          onClick={() => void handleBulkAction(action)}
          className="btn-secondary text-xs"
        >
          {action.label}
        </button>
      ))}
    </>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{config.description}</p>
        </div>
        {allowCreate && <button onClick={() => openForm()} className="btn-primary inline-flex items-center gap-2"><Plus className="h-4 w-4" />{config.createLabel || 'Create'}</button>}
      </div>

      {config.stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {config.stats.map((stat) => <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">{stat.label}</p><p className="mt-1 text-xl font-semibold text-gray-900">{stat.value}</p></div>)}
        </div>
      )}

      {config.tabs && (
        <div className="flex flex-wrap gap-2">
          {config.tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 text-xs font-medium rounded-full ${activeTab === tab ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{tab}</button>)}
        </div>
      )}

      {config.filters && (
        <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          {config.filters.map((field) => <div key={field.name}><label className="mb-1 block text-xs font-medium text-gray-500">{field.label}</label><FieldInput field={field} value={filters[field.name] || ''} onChange={(value) => { setFilters((old) => ({ ...old, [field.name]: value || undefined })); setPage(1); }} /></div>)}
        </div>
      )}

      {query.error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4" /> Live data could not be loaded. No fallback sample data is shown.
          <button onClick={() => query.refetch()} className="ml-auto inline-flex items-center gap-1 text-xs font-medium"><RefreshCw className="h-3 w-3" />Retry</button>
        </div>
      )}

      <DataTable
        columns={[...config.columns, actionColumn]}
        data={rows}
        loading={query.isLoading}
        pagination={pagination}
        onPageChange={setPage}
        search={search}
        onSearch={(value) => { setSearch(value); setPage(1); }}
        searchPlaceholder={`Search ${config.title.toLowerCase()}...`}
        emptyTitle={config.emptyTitle || `No ${config.title.toLowerCase()} found`}
        selectedIds={selectedIds}
        onSelectionChange={allowDelete ? setSelectedIds : undefined}
        bulkActions={allowDelete ? bulkActions : undefined}
      />

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[86vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editing.id ? `Edit ${config.title}` : config.createLabel || `Create ${config.title}`}</h2>
              <button onClick={() => setEditing(null)} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {config.fields.map((field) => (
                <div key={field.name} className={field.fullWidth ? 'sm:col-span-2' : ''}>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{field.label}</label>
                  <FieldInput field={field} value={form[field.name]} onChange={(value) => setForm((old) => ({ ...old, [field.name]: value }))} />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary inline-flex items-center gap-2"><Check className="h-4 w-4" />Save</button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setViewing(null)}>
          <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Details</h2>
              <button onClick={() => setViewing(null)} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            {config.details ? config.details(viewing) : <pre className="overflow-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-600">{JSON.stringify(viewing, null, 2)}</pre>}
          </div>
        </div>
      )}
    </div>
  );
}
