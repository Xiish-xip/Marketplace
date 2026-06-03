import React, { useState, useMemo } from 'react';

const BUILTIN_ICONS = [
  'Search', 'ShoppingBag', 'Star', 'Heart', 'User', 'Settings', 'Bell', 'Mail',
  'Home', 'Menu', 'X', 'Check', 'ChevronDown', 'ChevronUp', 'ChevronLeft', 'ChevronRight',
  'Plus', 'Minus', 'Trash2', 'Edit', 'Copy', 'Share2', 'Download', 'Upload',
  'Image', 'Video', 'Camera', 'Music', 'Play', 'Pause', 'Volume2', 'VolumeX',
  'MapPin', 'Phone', 'MessageCircle', 'MessageSquare', 'Send', 'Globe', 'Lock', 'Unlock',
  'Shield', 'AlertCircle', 'Info', 'HelpCircle', 'ExternalLink', 'Link', 'Paperclip', 'Tag',
  'Clock', 'Calendar', 'Watch', 'Sun', 'Moon', 'Cloud', 'Zap', 'Wind',
  'Truck', 'Package', 'Box', 'CreditCard', 'DollarSign', 'Percent', 'TrendingUp', 'TrendingDown',
  'Grid', 'List', 'Columns', 'Layout', 'Square', 'Circle', 'PanelLeft', 'PanelRight',
  'FileText', 'FileImage', 'Folder', 'FolderTree', 'Code', 'Terminal', 'Database', 'Server',
  'Award', 'Crown', 'Fire', 'Rocket', 'Target', 'Flag', 'Bookmark', 'ThumbsUp',
  'Facebook', 'Twitter', 'Instagram', 'Youtube', 'Linkedin', 'Github', 'Slack', 'Figma',
  'ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft', 'ArrowUpDown', 'ChevronsLeftRight', 'Expand', 'Collapse',
  'Palette', 'Paintbrush', 'PaintBucket', 'Wand', 'Sparkles', 'Eye', 'EyeOff', 'Filter',
  'RefreshCw', 'Undo', 'Redo', 'Maximize', 'Minimize2', 'ZoomIn', 'ZoomOut', 'Maximize2',
  'Smartphone', 'Tablet', 'Monitor', 'Laptop', 'Wifi', 'Bluetooth', 'Printer', 'Radio',
  'Store', 'ShoppingCart', 'BaggageClaim', 'Gift', 'Trophy', 'Medal', 'BadgeCheck', 'Verified',
];

interface IconPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
}

const FALLBACK_ICONS = ['Star', 'Heart', 'Bell', 'Mail', 'Search', 'Home', 'User', 'Settings'];

export default function IconPickerField({
  label,
  value,
  onChange,
  placeholder = 'Search icons...',
  description,
}: IconPickerFieldProps) {
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return BUILTIN_ICONS.slice(0, 50);
    const q = search.toLowerCase();
    return BUILTIN_ICONS.filter(name => name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
        {label}
      </label>
      {description && (
        <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{description}</p>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left"
          style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text))' }}
        >
          {value ? (
            <>
              <span className="text-lg leading-none">{getIconPreview(value)}</span>
              <span>{value}</span>
            </>
          ) : (
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>Select an icon...</span>
          )}
        </button>

        {showPicker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
            <div
              className="absolute left-0 right-0 z-20 mt-1 rounded-lg border shadow-lg overflow-hidden"
              style={{
                borderColor: 'rgb(var(--color-border))',
                backgroundColor: 'rgb(var(--color-surface))',
                maxHeight: '280px',
              }}
            >
              <div className="p-1.5 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-2 py-1 rounded text-[10px]"
                  style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg))', color: 'rgb(var(--color-text))' }}
                  autoFocus
                />
              </div>
              <div className="overflow-y-auto p-2" style={{ maxHeight: '200px' }}>
                {filteredIcons.length === 0 ? (
                  <p className="text-[10px] text-center py-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    No icons found
                  </p>
                ) : (
                  <div className="grid grid-cols-6 gap-1">
                    {filteredIcons.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => { onChange(name); setShowPicker(false); setSearch(''); }}
                        className={`p-1.5 rounded flex flex-col items-center gap-0.5 transition-all hover:scale-110 ${
                          value === name ? '' : ''
                        }`}
                        style={{
                          backgroundColor: value === name ? 'rgb(var(--color-primary-100))' : 'transparent',
                          border: value === name ? '1px solid rgb(var(--color-primary-300))' : '1px solid transparent',
                        }}
                        title={name}
                      >
                        <span className="text-base leading-none">{getIconPreview(name)}</span>
                        <span className="text-[7px] truncate w-full text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Icon preview using emoji-like mappings for visual representation
function getIconPreview(name: string): string {
  const iconMap: Record<string, string> = {
    Search: '🔍', ShoppingBag: '🛍️', Star: '⭐', Heart: '❤️', User: '👤',
    Settings: '⚙️', Bell: '🔔', Mail: '✉️', Home: '🏠', Menu: '☰',
    X: '✕', Check: '✓', Plus: '➕', Minus: '➖', Trash2: '🗑️',
    Edit: '✏️', Copy: '📋', Share2: '🔗', Download: '⬇️', Upload: '⬆️',
    Image: '🖼️', Video: '🎬', Camera: '📷', Music: '🎵', Play: '▶️',
    MapPin: '📍', Phone: '📞', Globe: '🌐', Lock: '🔒', Unlock: '🔓',
    Shield: '🛡️', Clock: '⏰', Calendar: '📅', Sun: '☀️', Moon: '🌙',
    Truck: '🚚', Package: '📦', CreditCard: '💳', DollarSign: '💵',
    Grid: '📊', List: '📋', Columns: '📰', Layout: '📐', Square: '⬜',
    Folder: '📁', Code: '💻', Database: '🗄️', Award: '🏆', Crown: '👑',
    Fire: '🔥', Rocket: '🚀', Target: '🎯', Flag: '🚩', Bookmark: '🔖',
    Facebook: '📘', Twitter: '🐦', Instagram: '📷', Youtube: '▶️', Linkedin: '💼',
    ArrowUp: '⬆️', ArrowDown: '⬇️', ArrowRight: '➡️', ArrowLeft: '⬅️',
    Palette: '🎨', Paintbrush: '🖌️', Eye: '👁️', Filter: '🔍',
    RefreshCw: '🔄', Undo: '↩️', Redo: '↪️', Maximize: '⛶',
    Smartphone: '📱', Tablet: '📄', Monitor: '🖥️', Store: '🏪',
    ShoppingCart: '🛒', Gift: '🎁', Trophy: '🏆', Medal: '🏅',
  };
  return iconMap[name] || '▪️';
}