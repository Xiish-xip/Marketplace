import React from 'react';
import { Play } from 'lucide-react';

interface VideoUrlFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
}

export default function VideoUrlField({
  label,
  value,
  onChange,
  placeholder = 'Enter video URL (YouTube, Vimeo, etc.)',
  description,
}: VideoUrlFieldProps) {
  const [previewUrl, setPreviewUrl] = React.useState(value || '');
  const [error, setError] = React.useState<string | null>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();
    setPreviewUrl(url);
    setError(null); // Clear error when user types
    onChange(url);
  };

  // Simple validation for common video platforms
  const isValidVideoUrl = (url: string): boolean => {
    if (!url) return true; // Allow empty
    const videoPatterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch/,
      /^https?:\/\/(www\.)?youtu\.be\//,
      /^https?:\/\/(www\.)?vimeo\.com\//,
      /^https?:\/\/(www\.)?dailymotion\.com\/video\//,
      /\.mp4$/, /\.webm$/, /\.ogv$/ // Direct video files
    ];
    return videoPatterns.some(pattern => pattern.test(url));
  };

  React.useEffect(() => {
    if (previewUrl && !isValidVideoUrl(previewUrl)) {
      setError('Please enter a valid video URL');
    } else {
      setError(null);
    }
  }, [previewUrl]);

  return (
    <div className="space-y-2">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <label className="text-[11px] font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {label}
          </label>
          {description && (
            <p className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {description}
            </p>
          )}
        </div>
        <div className="flex-1">
          <div className="space-y-2">
            {/* URL Input */}
            <div>
              <input
                type="url"
                value={previewUrl || ''}
                onChange={handleUrlChange}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded border"
                style={{
                  borderColor: 'rgb(var(--color-border))',
                  backgroundColor: 'rgb(var(--color-surface))',
                  color: 'rgb(var(--color-text))',
                }}
              />
              {error && (
                <p className="text-[10px] mt-1" style={{ color: 'rgb(var(--color-danger))' }}>
                  {error}
                </p>
              )}
            </div>

            {/* Preview */}
            {previewUrl && !error && (
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {/* Simple thumbnail preview */}
                  <div className="w-24 h-24 rounded bg-surface-muted flex items-center justify-center">
                    <Play className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-600))' }} />
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl('');
                      onChange('');
                    }}
                    className="text-[10px] underline"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}