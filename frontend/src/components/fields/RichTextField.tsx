import React from 'react';
import RichTextEditor from '../../components/RichTextEditor';

interface RichTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  required?: boolean;
}

export default function RichTextField({
  label,
  value,
  onChange,
  placeholder = 'Start writing...',
  description,
  required = false,
}: RichTextFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <label className="text-[11px] font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {label}{required && <span className="ml-1 text-[10px] text-danger">*</span>}
          </label>
          {description && (
            <p className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {description}
            </p>
          )}
        </div>
        <div className="flex-1">
          <RichTextEditor
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            minHeight={150}
            maxHeight={400}
          />
        </div>
      </div>
    </div>
  );
}