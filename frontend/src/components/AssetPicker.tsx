import { useMemo, useState } from 'react';
import { Check, Image as ImageIcon, Search, Upload, X } from 'lucide-react';
import { useAssets, useBulkUpload } from '../lib/asset-hooks';
import type { Asset, AssetPickerResult } from '../lib/asset-types';
import { toPickerResult } from '../lib/asset-types';
import { assetUrl } from '../lib/assets';

interface AssetPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (assets: AssetPickerResult[]) => void;
  multiple?: boolean;
  filter?: {
    mimeType?: string;
    category?: string;
    groupId?: string;
    familyId?: string;
    entityType?: string;
  };
  title?: string;
  maxFiles?: number;
}

export default function AssetPicker({ open, onClose, onSelect, multiple = false, filter, title = 'Select assets', maxFiles = 20 }: AssetPickerProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Asset[]>([]);
  const params = useMemo(() => ({ page: 1, limit: 48, search, ...filter }), [search, filter]);
  const assets = useAssets(params);
  const bulkUpload = useBulkUpload();

  if (!open) return null;

  const toggle = (asset: Asset) => {
    setSelected((prev) => {
      if (prev.some((item) => item.id === asset.id)) return prev.filter((item) => item.id !== asset.id);
      return multiple ? [...prev, asset].slice(0, maxFiles) : [asset];
    });
  };

  const confirm = (items = selected) => {
    onSelect(items.map(toPickerResult));
    setSelected([]);
    onClose();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const form = new FormData();
    Array.from(files).slice(0, maxFiles).forEach((file) => form.append('files', file));
    if (filter?.category) form.append('category', filter.category);
    if (filter?.groupId) form.append('groupId', filter.groupId);
    bulkUpload.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4">
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{selected.length} selected</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" aria-label="Close asset picker">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 border-b px-5 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assets..." className="w-full rounded-md border py-2 pl-9 pr-3 text-sm" />
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">
            <Upload className="h-4 w-4" />
            Upload
            <input type="file" multiple={multiple} accept={filter?.mimeType} onChange={(event) => handleFiles(event.target.files)} className="hidden" />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {assets.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, index) => <div key={index} className="aspect-square animate-pulse rounded-md bg-gray-100" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {(assets.data?.data || []).map((asset) => {
                const isSelected = selected.some((item) => item.id === asset.id);
                const preview = asset.thumbnailUrl || asset.optimizedUrl || asset.url;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => toggle(asset)}
                    onDoubleClick={() => confirm([asset])}
                    className={`group relative overflow-hidden rounded-md border bg-gray-50 text-left ${isSelected ? 'border-green-500 ring-2 ring-green-500' : 'border-gray-200 hover:border-gray-400'}`}
                  >
                    <div className="aspect-square">
                      {asset.mimeType.startsWith('image/') ? (
                        <img src={assetUrl(preview)} alt={asset.altText || asset.title || ''} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center"><ImageIcon className="h-8 w-8 text-gray-300" /></div>
                      )}
                    </div>
                    <div className="truncate px-2 py-1 text-xs text-gray-700">{asset.title || asset.originalName}</div>
                    {isSelected && <span className="absolute right-2 top-2 rounded-full bg-green-600 p-1 text-white"><Check className="h-3 w-3" /></span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
          <button onClick={() => confirm()} disabled={!selected.length} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Select</button>
        </div>
      </div>
    </div>
  );
}
