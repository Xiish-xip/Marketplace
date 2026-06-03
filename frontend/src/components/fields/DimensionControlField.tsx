import React, { useState, useCallback } from 'react';

export interface DimensionValues {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

interface DimensionControlFieldProps {
  label: string;
  value: string | DimensionValues;
  onChange: (value: string | DimensionValues) => void;
  description?: string;
  presets?: string[];
  allowAllSides?: boolean;
}

const DEFAULT_PRESETS = ['0', '0.25rem', '0.5rem', '0.75rem', '1rem', '1.5rem', '2rem', '3rem', '4rem', '6rem', '8rem'];

const CSS_UNITS = ['px', 'rem', 'em', '%', 'vh', 'vw'];

export default function DimensionControlField({
  label,
  value,
  onChange,
  description,
  presets = DEFAULT_PRESETS,
  allowAllSides = true,
}: DimensionControlFieldProps) {
  const [mode, setMode] = useState<'all' | 'individual'>('all');
  const [unit, setUnit] = useState('rem');

  const isObject = typeof value === 'object';
  const allValue = typeof value === 'string' ? value : '';

  const handleAllChange = useCallback((newVal: string) => {
    onChange(newVal);
  }, [onChange]);

  const handleSideChange = useCallback((side: keyof DimensionValues, newVal: string) => {
    const current = typeof value === 'object' ? value : {};
    onChange({ ...current, [side]: newVal || undefined });
  }, [value, onChange]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {label}
        </label>
        {allowAllSides && (
          <div className="flex rounded overflow-hidden text-[9px]" style={{ border: '1px solid rgb(var(--color-border))' }}>
            <button
              type="button"
              onClick={() => { setMode('all'); if (isObject) onChange(''); }}
              className="px-1.5 py-0.5"
              style={{
                backgroundColor: mode === 'all' ? 'rgb(var(--color-primary-100))' : 'transparent',
                color: mode === 'all' ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text-muted))',
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setMode('individual')}
              className="px-1.5 py-0.5"
              style={{
                backgroundColor: mode === 'individual' ? 'rgb(var(--color-primary-100))' : 'transparent',
                color: mode === 'individual' ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text-muted))',
              }}
            >
              Sides
            </button>
          </div>
        )}
      </div>
      {description && (
        <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{description}</p>
      )}

      {mode === 'all' ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={allValue}
            onChange={(e) => handleAllChange(e.target.value)}
            placeholder="0"
            className="flex-1 px-2 py-1.5 rounded text-xs"
            style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text))' }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
            const sideValue = isObject ? (value as DimensionValues)[side] || '' : '';
            return (
              <div key={side} className="flex items-center gap-1">
                <span className="text-[9px] uppercase w-6" style={{ color: 'rgb(var(--color-text-muted))' }}>{side.slice(0, 1)}</span>
                <input
                  type="text"
                  value={sideValue}
                  onChange={(e) => handleSideChange(side, e.target.value)}
                  placeholder="0"
                  className="flex-1 px-1.5 py-1 rounded text-[10px]"
                  style={{ border: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text))' }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Preset chips */}
      <div className="flex flex-wrap gap-1">
        {presets.slice(0, 6).map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              if (mode === 'all') handleAllChange(preset);
              else {
                const current = typeof value === 'object' ? value : {};
                onChange({ top: preset, right: preset, bottom: preset, left: preset });
              }
            }}
            className="px-1.5 py-0.5 rounded text-[9px] font-mono"
            style={{
              border: '1px solid rgb(var(--color-border))',
              backgroundColor: allValue === preset ? 'rgb(var(--color-primary-100))' : 'transparent',
              color: allValue === preset ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text-muted))',
            }}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}