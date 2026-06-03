import { useState, useRef } from 'react';
import { Upload, Search, X, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api-enhanced';
import { assetUrl } from '../lib/assets';
import AssetPicker from './AssetPicker';
import ImageMetadataInput, { type ImageMetadata } from './ImageMetadataInput';
import type { AssetPickerResult } from '../lib/asset-types';
import toast from 'react-hot-toast';

interface UniversalMediaFieldProps {
  label: string;
  value?: string | null;
  onChange: (url: string) => void;
  accept?: string;
  preview?: boolean;
  /** Optional filter to narrow the AssetPicker library view */
  filter?: {
    mimeType?: string;
    category?: string;
    groupId?: string;
    familyId?: string;
  };
  /** Entity type to link the uploaded asset to (e.g. "config", "branding") */
  entityType?: string;
  /** Entity ID to link the uploaded asset to */
  entityId?: string;
  /** Whether to show the metadata form (requires title + alt text) */
  requireMetadata?: boolean;
  /** Allow clearing the current value */
  clearable?: boolean;
}

export default function UniversalMediaField({
  label,
  value,
  onChange,
  accept = 'image/jpeg,image/png,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon,image/avif,.jpg,.jpeg,.png,.webp,.gif,.ico,.avif',
  preview = true,
  filter,
  entityType,
  entityId,
  requireMetadata = true,
  clearable = true,
}: UniversalMediaFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [metadata, setMetadata] = useState<ImageMetadata>({ title: '', altText: '', description: '', caption: '' });
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateMetadata = (): boolean => {
    if (!requireMetadata) return true;
    if (!metadata.title?.trim()) {
      setValidationError('Image title is required');
      return false;
    }
    if (!metadata.altText?.trim()) {
      setValidationError('Alt text is required for accessibility');
      return false;
    }
    setValidationError(null);
    return true;
  };

  /** Upload a new file via the /assets API */
  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    // Validate metadata before upload
    if (!validateMetadata()) {
      toast.error(validationError || 'Please fill in all required metadata fields');
      return;
    }

    setUploading(true);
    setValidationError(null);
    try {
      const payload = new FormData();
      payload.append('file', file);
      if (metadata.title) payload.append('title', metadata.title);
      if (metadata.altText) payload.append('altText', metadata.altText);
      if (metadata.description) payload.append('description', metadata.description);
      if (metadata.caption) payload.append('caption', metadata.caption);
      if (metadata.credit) payload.append('credit', metadata.credit);
      if (metadata.copyright) payload.append('copyright', metadata.copyright);
      if (metadata.tags) payload.append('tags', metadata.tags);
      if (filter?.category) payload.append('category', filter.category);
      if (filter?.groupId) payload.append('groupId', filter.groupId);
      // Link asset to entity for ownership tracking
      if (entityType) payload.append('entityType', entityType);
      if (entityId) payload.append('entityId', entityId);

      const res = await api.post('/assets', payload);
      const asset = res.data?.data;
      if (!asset?.url) throw new Error('Upload did not return an asset URL');
      onChange(asset.url);
      toast.success('Asset uploaded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  /** Handle selection from the AssetPicker library browser */
  const handlePickerSelect = (results: AssetPickerResult[]) => {
    const selected = results[0];
    if (!selected) return;
    onChange(selected.url);
    // Pre-fill metadata from the selected asset
    if (selected.altText) setMetadata((prev) => ({ ...prev, altText: selected.altText ?? undefined }));
    if (selected.title) setMetadata((prev) => ({ ...prev, title: selected.title ?? undefined }));
    toast.success('Asset selected from library');
  };

  const handleClear = () => {
    onChange('');
    setMetadata({ title: '', altText: '', description: '', caption: '' });
    setValidationError(null);
  };

  const hasValue = !!value;

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
        {label}
      </label>

      {/* URL text input for manual paste */}
      <div className="relative">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);
            setValidationError(null);
          }}
          placeholder="https://... or /uploads/... or paste URL"
          className="input-field w-full pr-20 text-sm"
        />
        {hasValue && clearable && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-red-500"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {validationError}
        </div>
      )}

      {/* Metadata fields - required before upload */}
      {requireMetadata && (
        <ImageMetadataInput
          metadata={metadata}
          onChange={setMetadata}
          fields={{ title: true, altText: true, description: true, caption: false, credit: false, copyright: false, category: false, tags: false }}
          labels={{ title: 'Image Title *', altText: 'Alt Text *', description: 'Description' }}
        />
      )}

      {/* Action buttons: Upload / Browse */}
      <div className="flex flex-wrap gap-2">
        <label
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50"
          style={{ borderColor: 'rgb(var(--color-border-strong))', color: 'rgb(var(--color-text-secondary))' }}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {uploading ? 'Uploading...' : 'Upload new'}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            disabled={uploading}
            onChange={uploadFile}
            className="hidden"
          />
        </label>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50"
          style={{ borderColor: 'rgb(var(--color-border-strong))', color: 'rgb(var(--color-text-secondary))' }}
        >
          <Search className="h-3.5 w-3.5" />
          Browse library
        </button>
      </div>

      {/* Asset picker modal */}
      {pickerOpen && (
        <AssetPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handlePickerSelect}
          multiple={false}
          filter={filter}
          title={`Select ${label}`}
        />
      )}

      {/* Preview */}
      {preview && hasValue && (
        <div
          className="overflow-hidden rounded-lg border"
          style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface-muted))' }}
        >
          <img
            src={assetUrl(value!)}
            alt={metadata.altText || ''}
            className="h-32 w-full object-contain p-2"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
}
