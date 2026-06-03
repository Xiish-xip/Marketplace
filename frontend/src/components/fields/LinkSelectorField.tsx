import React, { useState, useMemo } from 'react';
import { ExternalLink, Link as LinkIcon } from 'lucide-react';

interface InternalPage {
  label: string;
  path: string;
}

const INTERNAL_PAGES: InternalPage[] = [
  { label: 'Home', path: '/' },
  { label: 'Products', path: '/products' },
  { label: 'Cart', path: '/cart' },
  { label: 'Checkout', path: '/checkout' },
  { label: 'Account', path: '/account' },
  { label: 'Orders', path: '/account/orders' },
  { label: 'Wishlist', path: '/wishlist' },
  { label: 'Sell', path: '/seller/dashboard' },
];

interface LinkSelectorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
}

export default function LinkSelectorField({
  label,
  value,
  onChange,
  placeholder = 'Select or enter URL...',
  description,
}: LinkSelectorFieldProps) {
  const [mode, setMode] = useState<'internal' | 'external' | 'anchor'>(
    !value ? 'internal' : value.startsWith('/') ? 'internal' : value.startsWith('#') ? 'anchor' : 'external'
  );
  const [customUrl, setCustomUrl] = useState(
    value && !value.startsWith('/') && !value.startsWith('#') ? value : ''
  );
  const [anchorId, setAnchorId] = useState(
    value?.startsWith('#') ? value.slice(1) : ''
  );

  const handleInternalSelect = (path: string) => {
    onChange(path);
  };

  const handleExternalChange = (url: string) => {
    setCustomUrl(url);
    onChange(url);
  };

  const handleAnchorChange = (id: string) => {
    setAnchorId(id);
    onChange(id ? `#${id}` : '');
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
        {label}
      </label>
      {description && (
        <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{description}</p>
      )}

      {/* Mode selector tabs */}
      <div className="flex rounded overflow-hidden text-[9px]" style={{ border: '1px solid rgb(var(--color-border))' }}>
        {(['internal', 'external', 'anchor'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="flex-1 px-1.5 py-0.5 capitalize"
            style={{
              backgroundColor: mode === m ? 'rgb(var(--color-primary-100))' : 'transparent',
              color: mode === m ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text-muted))',
            }}
          >
            {m === 'anchor' ? 'Anchor' : m}
          </button>
        ))}
      </div>

      {mode === 'internal' && (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'rgb(var(--color-border))' }}>
          {INTERNAL_PAGES.map((page) => (
            <button
              key={page.path}
              type="button"
              onClick={() => handleInternalSelect(page.path)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-left hover:bg-gray-50 transition-colors"
              style={{
                backgroundColor: value === page.path ? 'rgb(var(--color-primary-50))' : 'transparent',
                color: value === page.path ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text))',
                borderBottom: '1px solid rgb(var(--color-border))',
              }}
            >
              <LinkIcon className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
              {page.label}
              <span className="ml-auto text-[9px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{page.path}</span>
            </button>
          ))}
        </div>
      )}

      {mode === 'external' && (
        <div className="flex items-center gap-1">
          <ExternalLink className="w-3 h-3 shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <input
            type="url"
            value={customUrl}
            onChange={(e) => handleExternalChange(e.target.value)}
            placeholder="https://example.com/page"
            className="flex-1 px-2 py-1.5 rounded text-xs"
            style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text))' }}
          />
        </div>
      )}

      {mode === 'anchor' && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--color-text-muted))' }}>#</span>
          <input
            type="text"
            value={anchorId}
            onChange={(e) => handleAnchorChange(e.target.value)}
            placeholder="section-id"
            className="flex-1 px-2 py-1.5 rounded text-xs font-mono"
            style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text))' }}
          />
        </div>
      )}

      {value && (
        <p className="text-[9px] truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
          Selected: {value}
        </p>
      )}
    </div>
  );
}