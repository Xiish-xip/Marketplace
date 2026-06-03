import React, { useState } from 'react';

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#6b7280',
  '#1e293b', '#475569', '#94a3b8', '#cbd5e1', '#e2e8f0',
  '#f8fafc', '#ffffff', '#000000', '#dc2626', '#2563eb',
  '#7c3aed', '#059669', '#d97706', '#dc2626',
];

interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
  showPresets?: boolean;
}

export default function ColorPickerField({
  label,
  value,
  onChange,
  description,
  showPresets = true,
}: ColorPickerFieldProps) {
  const [inputMode, setInputMode] = useState<'picker' | 'hex'>(!value || !value.startsWith('#') ? 'hex' : 'picker');

  const validatedValue = value || '#6b7280';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {label}
        </label>
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-[9px] px-1 py-0.5 rounded"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setInputMode(inputMode === 'picker' ? 'hex' : 'picker')}
            className="text-[9px] px-1 py-0.5 rounded"
            style={{ color: 'rgb(var(--color-primary-600))' }}
          >
            {inputMode === 'picker' ? 'Hex' : 'Picker'}
          </button>
        </div>
      </div>
      {description && (
        <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{description}</p>
      )}

      <div className="flex items-center gap-2">
        {/* Color swatch */}
        <div className="relative">
          <input
            type="color"
            value={validatedValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0"
            style={{ backgroundColor: 'transparent' }}
          />
          <div
            className="absolute inset-0 rounded pointer-events-none border"
            style={{
              backgroundColor: validatedValue,
              borderColor: 'rgb(var(--color-border))',
            }}
          />
        </div>

        {inputMode === 'hex' ? (
          <div className="flex-1 flex items-center gap-1">
            <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>#</span>
            <input
              type="text"
              value={value?.replace('#', '') || ''}
              onChange={(e) => {
                const hex = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                onChange(hex ? `#${hex}` : '');
              }}
              placeholder="000000"
              maxLength={6}
              className="flex-1 px-2 py-1.5 rounded text-xs font-mono"
              style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text))' }}
            />
          </div>
        ) : (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#6b7280"
            className="flex-1 px-2 py-1.5 rounded text-xs font-mono"
            style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text))' }}
          />
        )}
      </div>

      {/* Preset color swatches */}
      {showPresets && (
        <div className="flex flex-wrap gap-1">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${
                value === color ? 'border-primary-500 scale-110' : 'border-transparent'
              }`}
              style={{
                backgroundColor: color,
                borderColor: value === color ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-border))',
              }}
              title={color}
            />
          ))}
        </div>
      )}

      {/* RGBA/CSS variable note */}
      {value && !value.startsWith('#') && (
        <p className="text-[9px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
          CSS value: {value}
        </p>
      )}
    </div>
  );
}