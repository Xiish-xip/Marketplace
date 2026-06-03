import React from 'react';

export interface ImageMetadata {
  title?: string;
  altText?: string;
  description?: string;
  caption?: string;
  credit?: string;
  copyright?: string;
  category?: string;
  subtype?: string;
  tags?: string;
}

interface ImageMetadataInputProps {
  metadata: ImageMetadata;
  onChange: (metadata: ImageMetadata) => void;
  /** Show/hide specific fields. Defaults to all visible. */
  fields?: {
    title?: boolean;
    altText?: boolean;
    description?: boolean;
    caption?: boolean;
    credit?: boolean;
    copyright?: boolean;
    category?: boolean;
    subtype?: boolean;
    tags?: boolean;
  };
  /** Override field labels */
  labels?: Partial<Record<keyof ImageMetadata, string>>;
  className?: string;
}

const defaultFields = {
  title: true,
  altText: true,
  description: true,
  caption: true,
  credit: false,
  copyright: false,
  category: false,
  subtype: false,
  tags: false,
};

const defaultLabels: Record<keyof ImageMetadata, string> = {
  title: 'Title',
  altText: 'Alt Text',
  description: 'Description',
  caption: 'Caption',
  credit: 'Credit',
  copyright: 'Copyright',
  category: 'Category',
  subtype: 'Subtype',
  tags: 'Tags',
};

export default function ImageMetadataInput({
  metadata,
  onChange,
  fields: fieldOverrides,
  labels: labelOverrides,
  className = '',
}: ImageMetadataInputProps) {
  const fields = { ...defaultFields, ...fieldOverrides };
  const labels = { ...defaultLabels, ...labelOverrides };

  const update = (key: keyof ImageMetadata, value: string) => {
    onChange({ ...metadata, [key]: value });
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
        Image Metadata
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {fields.title && (
          <div>
            <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {labels.title}
            </label>
            <input
              type="text"
              value={metadata.title || ''}
              onChange={(e) => update('title', e.target.value)}
              className="form-input text-xs"
              placeholder="e.g. Product Hero Shot"
            />
          </div>
        )}
        {fields.altText && (
          <div>
            <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {labels.altText}
            </label>
            <input
              type="text"
              value={metadata.altText || ''}
              onChange={(e) => update('altText', e.target.value)}
              className="form-input text-xs"
              placeholder="Descriptive text for accessibility"
            />
          </div>
        )}
        {fields.description && (
          <div className="sm:col-span-2">
            <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {labels.description}
            </label>
            <textarea
              value={metadata.description || ''}
              onChange={(e) => update('description', e.target.value)}
              className="form-textarea text-xs"
              rows={2}
              placeholder="A brief description of this image"
            />
          </div>
        )}
        {fields.caption && (
          <div>
            <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {labels.caption}
            </label>
            <input
              type="text"
              value={metadata.caption || ''}
              onChange={(e) => update('caption', e.target.value)}
              className="form-input text-xs"
              placeholder="Caption displayed below the image"
            />
          </div>
        )}
        {fields.credit && (
          <div>
            <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {labels.credit}
            </label>
            <input
              type="text"
              value={metadata.credit || ''}
              onChange={(e) => update('credit', e.target.value)}
              className="form-input text-xs"
              placeholder="Photographer or source"
            />
          </div>
        )}
        {fields.copyright && (
          <div>
            <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {labels.copyright}
            </label>
            <input
              type="text"
              value={metadata.copyright || ''}
              onChange={(e) => update('copyright', e.target.value)}
              className="form-input text-xs"
              placeholder="© Copyright notice"
            />
          </div>
        )}
        {fields.tags && (
          <div className="sm:col-span-2">
            <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {labels.tags}
            </label>
            <input
              type="text"
              value={metadata.tags || ''}
              onChange={(e) => update('tags', e.target.value)}
              className="form-input text-xs"
              placeholder="Comma-separated or JSON tags"
            />
          </div>
        )}
        {fields.category && (
          <div>
            <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {labels.category}
            </label>
            <input
              type="text"
              value={metadata.category || ''}
              onChange={(e) => update('category', e.target.value)}
              className="form-input text-xs"
              placeholder="Image category"
            />
          </div>
        )}
        {fields.subtype && (
          <div>
            <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {labels.subtype}
            </label>
            <input
              type="text"
              value={metadata.subtype || ''}
              onChange={(e) => update('subtype', e.target.value)}
              className="form-input text-xs"
              placeholder="Image subtype"
            />
          </div>
        )}
      </div>
    </div>
  );
}