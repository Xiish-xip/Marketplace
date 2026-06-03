import React from 'react';
import { Link } from 'react-router-dom';
import { Inbox, ArrowLeft } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  const ActionButton = () => {
    if (!actionLabel) return null;
    const className =
      'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors mt-4';
    if (actionHref) {
      return (
        <Link to={actionHref} className={`${className} btn-primary`}>
          {actionLabel}
        </Link>
      );
    }
    return (
      <button onClick={onAction} className={`${className} btn-primary`}>
        {actionLabel}
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}
      >
        {icon || (
          <Inbox className="w-8 h-8" style={{ color: 'rgb(var(--color-text-disabled))' }} />
        )}
      </div>
      <h3 className="text-lg font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm max-w-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {description}
        </p>
      )}
      <ActionButton />
    </div>
  );
}