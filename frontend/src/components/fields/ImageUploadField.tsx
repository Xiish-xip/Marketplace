import React, { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Link } from 'lucide-react';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  placeholder = 'Upload or paste image URL...',
  description,
}: ImageUploadFieldProps) {
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      onChange(base64);
    } catch (error) {
      console.error('Failed to read image file:', error);
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
        {label}
      </label>
      {description && (
        <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{description}</p>
      )}

      {value ? (
        <div className="relative rounded-lg overflow-hidden group" style={{ border: '1px solid rgb(var(--color-border))' }}>
          <img
            src={value}
            alt="Upload preview"
            className="w-full h-28 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <label className="px-2 py-1 rounded text-[10px] font-medium text-white cursor-pointer bg-white/20 hover:bg-white/30">
              Change
              <input type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
            </label>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-white bg-red-500/50 hover:bg-red-500/70"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`relative rounded-lg border-2 border-dashed p-3 text-center transition-all ${
            dragOver ? 'border-primary-400 bg-primary-50' : ''
          }`}
          style={{
            borderColor: dragOver ? 'rgb(var(--color-primary-400))' : 'rgb(var(--color-border))',
            backgroundColor: dragOver ? 'rgb(var(--color-primary-50))' : 'transparent',
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload className="w-5 h-5 mx-auto mb-1" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Drag & drop image or click to browse
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
      )}

      {/* URL Input toggle */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setUrlInput(!urlInput)}
          className="flex items-center gap-1 text-[10px] font-medium"
          style={{ color: 'rgb(var(--color-primary-600))' }}
        >
          <Link className="w-2.5 h-2.5" />
          {urlInput ? 'Hide URL input' : 'Or enter image URL'}
        </button>
      </div>
      {urlInput && (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-2 py-1.5 rounded text-xs"
          style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text))' }}
        />
      )}
    </div>
  );
}