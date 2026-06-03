import React, { useState, useCallback } from 'react';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Copy } from 'lucide-react';

export interface RepeaterItem {
  [key: string]: any;
}

export type RepeaterFieldRenderer = (props: {
  item: RepeaterItem;
  index: number;
  onChange: (index: number, key: string, value: any) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) => React.ReactNode;

interface RepeaterFieldProps {
  label: string;
  value: RepeaterItem[];
  onChange: (items: RepeaterItem[]) => void;
  renderItem: RepeaterFieldRenderer;
  defaultNewItem?: RepeaterItem;
  maxItems?: number;
  minItems?: number;
  description?: string;
}

export default function RepeaterField({
  label,
  value = [],
  onChange,
  renderItem,
  defaultNewItem = { title: '', text: '' },
  maxItems = 50,
  minItems = 0,
  description,
}: RepeaterFieldProps) {
  const handleAdd = useCallback(() => {
    if (value.length >= maxItems) return;
    onChange([...value, { ...defaultNewItem }]);
  }, [value, onChange, defaultNewItem, maxItems]);

  const handleRemove = useCallback((index: number) => {
    if (value.length <= minItems) return;
    const next = value.filter((_, i) => i !== index);
    onChange(next);
  }, [value, onChange, minItems]);

  const handleChange = useCallback((index: number, key: string, val: any) => {
    const next = value.map((item, i) =>
      i === index ? { ...item, [key]: val } : item
    );
    onChange(next);
  }, [value, onChange]);

  const handleDuplicate = useCallback((index: number) => {
    if (value.length >= maxItems) return;
    const next = [...value];
    next.splice(index + 1, 0, { ...value[index], title: (value[index]?.title || 'Item') + ' (Copy)' });
    onChange(next);
  }, [value, onChange, maxItems]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const next = [...value];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }, [value, onChange]);

  const handleMoveDown = useCallback((index: number) => {
    if (index >= value.length - 1) return;
    const next = [...value];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }, [value, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-[11px] font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {label}
          </label>
          {description && (
            <p className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={value.length >= maxItems}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium disabled:opacity-40"
          style={{
            backgroundColor: 'rgb(var(--color-primary-50))',
            color: 'rgb(var(--color-primary-600))',
            border: '1px solid rgb(var(--color-primary-200))',
          }}
        >
          <Plus className="w-3 h-3" /> Add Item
        </button>
      </div>

      {value.length === 0 && (
        <div className="rounded-lg border border-dashed p-4 text-center" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
            No items yet. Click "Add Item" to add one.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border overflow-hidden"
            style={{
              borderColor: 'rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-surface))',
            }}
          >
            <div className="flex items-center justify-between px-2 py-1" style={{
              backgroundColor: 'rgb(var(--color-surface-muted))',
              borderBottom: '1px solid rgb(var(--color-border))',
            }}>
              <div className="flex items-center gap-1.5">
                <GripVertical className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <span className="text-[10px] font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                  Item {index + 1}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-0.5 rounded hover:bg-black/5 disabled:opacity-20"
                >
                  <ChevronUp className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index >= value.length - 1}
                  className="p-0.5 rounded hover:bg-black/5 disabled:opacity-20"
                >
                  <ChevronDown className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicate(index)}
                  className="p-0.5 rounded hover:bg-black/5"
                >
                  <Copy className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  disabled={value.length <= minItems}
                  className="p-0.5 rounded hover:bg-red-50 disabled:opacity-20"
                >
                  <Trash2 className="w-3 h-3" style={{ color: 'rgb(var(--color-danger))' }} />
                </button>
              </div>
            </div>
            <div className="p-2 space-y-1.5">
              {renderItem({
                item,
                index,
                onChange: handleChange,
                onRemove: handleRemove,
                onDuplicate: handleDuplicate,
                onMoveUp: handleMoveUp,
                onMoveDown: handleMoveDown,
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Item count */}
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {value.length} item{value.length !== 1 ? 's' : ''}
          {maxItems < 50 ? ` (max ${maxItems})` : ''}
        </span>
        {value.length > 0 && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={value.length >= maxItems}
            className="text-[10px] font-medium disabled:opacity-40"
            style={{ color: 'rgb(var(--color-primary-600))' }}
          >
            + Add another
          </button>
        )}
      </div>
    </div>
  );
}