import { useMemo, useState } from 'react';
import { Filter, Grid3X3, Image as ImageIcon, List, Search, Upload } from 'lucide-react';
import AssetPicker from '../../components/AssetPicker';
import { useAssetFamilies, useAssets, useBulkUpload, useUpdateAsset } from '../../lib/asset-hooks';
import type { Asset } from '../../lib/asset-types';
import { assetUrl } from '../../lib/assets';

const mimeFilters = [
  { label: 'All', value: '' },
  { label: 'Images', value: 'image/*' },
  { label: 'Videos', value: 'video/*' },
  { label: 'Documents', value: 'application/' },
  { label: 'Icons', value: 'image/svg' },
];

export default function AdminAssets() {
  const [search, setSearch] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [groupId, setGroupId] = useState<string | undefined>();
  const [familyId, setFamilyId] = useState<string | undefined>();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [detail, setDetail] = useState<Asset | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const families = useAssetFamilies();
  const bulkUpload = useBulkUpload();
  const updateAsset = useUpdateAsset();
  const params = useMemo(() => ({ page, limit: 30, search, mimeType, groupId, familyId }), [page, search, mimeType, groupId, familyId]);
  const assets = useAssets(params);
  const items = assets.data?.data || [];
  const pagination = assets.data?.pagination;

  const handleUpload = (files: FileList | null) => {
    if (!files?.length) return;
    const form = new FormData();
    Array.from(files).forEach((file) => form.append('files', file));
    if (groupId) form.append('groupId', groupId);
    bulkUpload.mutate(form);
  };

  return (
    <div className="h-[calc(100vh-7rem)] overflow-hidden rounded-lg border bg-white">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Asset Manager</h1>
          <p className="text-sm text-gray-500">Centralized media for products, pages, branding, and campaigns.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">
            <Upload className="h-4 w-4" />
            Upload
            <input type="file" multiple onChange={(event) => handleUpload(event.target.files)} className="hidden" />
          </label>
        </div>
      </div>

      <div className="grid h-[calc(100%-73px)] grid-cols-[240px_1fr]">
        <aside className="overflow-y-auto border-r bg-gray-50 p-3">
          <button onClick={() => { setFamilyId(undefined); setGroupId(undefined); }} className="mb-2 w-full rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-white">All Assets</button>
          {(families.data?.data || []).map((family) => (
            <div key={family.id} className="mb-2">
              <button onClick={() => { setFamilyId(family.id); setGroupId(undefined); }} className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-white">
                {family.icon} {family.name}
              </button>
              <div className="ml-3 mt-1 space-y-1">
                {family.groups.map((group) => (
                  <button key={group.id} onClick={() => { setFamilyId(undefined); setGroupId(group.id); }} className={`w-full rounded-md px-3 py-1.5 text-left text-xs ${groupId === group.id ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white'}`}>
                    {group.icon} {group.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <main className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search..." className="w-full rounded-md border py-2 pl-9 pr-3 text-sm" />
            </div>
            <div className="flex rounded-md border">
              <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-gray-100' : ''}`} aria-label="Grid view"><Grid3X3 className="h-4 w-4" /></button>
              <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-gray-100' : ''}`} aria-label="List view"><List className="h-4 w-4" /></button>
            </div>
            <Filter className="h-4 w-4 text-gray-400" />
            {mimeFilters.map((filter) => (
              <button key={filter.label} onClick={() => { setMimeType(filter.value); setPage(1); }} className={`rounded-full px-3 py-1 text-xs ${mimeType === filter.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>{filter.label}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {view === 'grid' ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                {items.map((asset) => <AssetTile key={asset.id} asset={asset} onClick={() => setDetail(asset)} />)}
              </div>
            ) : (
              <div className="divide-y rounded-md border">
                {items.map((asset) => (
                  <button key={asset.id} onClick={() => setDetail(asset)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-gray-50">
                    <AssetThumb asset={asset} className="h-12 w-12" />
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{asset.title || asset.originalName}</div><div className="text-xs text-gray-500">{asset.mimeType} · {Math.round(asset.size / 1024)} KB</div></div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-gray-600">
            <span>{pagination?.total || 0} assets</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1 disabled:opacity-50">Prev</button>
              <span>Page {page}</span>
              <button disabled={pagination && page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1 disabled:opacity-50">Next</button>
            </div>
          </div>
        </main>
      </div>

      {detail && (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md overflow-y-auto border-l bg-white p-5 shadow-xl">
          <button onClick={() => setDetail(null)} className="mb-4 text-sm text-gray-500">Close</button>
          <AssetThumb asset={detail} className="mb-4 aspect-video w-full" />
          <label className="mb-3 block text-sm font-medium">Title<input defaultValue={detail.title || ''} onBlur={(event) => updateAsset.mutate({ id: detail.id, data: { title: event.target.value } })} className="mt-1 w-full rounded-md border px-3 py-2" /></label>
          <label className="mb-3 block text-sm font-medium">Alt text<input defaultValue={detail.altText || ''} onBlur={(event) => updateAsset.mutate({ id: detail.id, data: { altText: event.target.value } })} className="mt-1 w-full rounded-md border px-3 py-2" /></label>
          <label className="mb-3 block text-sm font-medium">Description<textarea defaultValue={detail.description || ''} onBlur={(event) => updateAsset.mutate({ id: detail.id, data: { description: event.target.value } })} className="mt-1 min-h-24 w-full rounded-md border px-3 py-2" /></label>
          <dl className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <dt>Mime</dt><dd>{detail.mimeType}</dd>
            <dt>Size</dt><dd>{Math.round(detail.size / 1024)} KB</dd>
            <dt>Dimensions</dt><dd>{detail.width || '-'} x {detail.height || '-'}</dd>
            <dt>Usage</dt><dd>{detail.usageCount}</dd>
          </dl>
        </div>
      )}

      <AssetPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={() => setPickerOpen(false)} multiple />
    </div>
  );
}

function AssetTile({ asset, onClick }: { asset: Asset; onClick: () => void }) {
  return (
    <button onClick={onClick} className="overflow-hidden rounded-md border bg-gray-50 text-left hover:border-gray-400">
      <AssetThumb asset={asset} className="aspect-square w-full" />
      <div className="truncate px-2 py-1.5 text-xs text-gray-700">{asset.title || asset.originalName}</div>
    </button>
  );
}

function AssetThumb({ asset, className = '' }: { asset: Asset; className?: string }) {
  const src = asset.thumbnailUrl || asset.optimizedUrl || asset.url;
  return (
    <div className={`overflow-hidden rounded-md bg-gray-100 ${className}`}>
      {asset.mimeType.startsWith('image/') ? <img src={assetUrl(src)} alt={asset.altText || asset.title || ''} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><ImageIcon className="h-8 w-8 text-gray-300" /></div>}
    </div>
  );
}
