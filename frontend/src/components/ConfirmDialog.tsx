import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Info, ShieldAlert, X } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface ConfirmDialogProps extends Required<Omit<ConfirmOptions, 'message'>> {
  message?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ConfirmRequest {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

const variantStyles: Record<ConfirmVariant, { icon: React.ElementType; iconClass: string; iconBg: string; buttonClass: string }> = {
  danger: {
    icon: ShieldAlert,
    iconClass: 'text-red-600',
    iconBg: 'bg-red-50',
    buttonClass: 'btn-danger',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-yellow-600',
    iconBg: 'bg-yellow-50',
    buttonClass: 'btn-primary',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-600',
    iconBg: 'bg-blue-50',
    buttonClass: 'btn-primary',
  },
};

export default function ConfirmDialog({
  title,
  message,
  confirmText,
  cancelText,
  variant,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const style = variantStyles[variant];
  const Icon = style.icon;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 glass-modal-backdrop"
        onClick={onCancel}
        aria-label="Close confirmation dialog"
      />
      <div
        className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`}>
            <Icon className={`h-5 w-5 ${style.iconClass}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 id="confirm-dialog-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                aria-label="Close confirmation dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {message && (
              <div className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {message}
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="btn-secondary">
            {cancelText}
          </button>
          <button type="button" onClick={onConfirm} className={style.buttonClass}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setRequest((current) => {
        current?.resolve(false);
        return { options, resolve };
      });
    });
  }, []);

  const close = useCallback((confirmed: boolean) => {
    setRequest((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request && (
        <ConfirmDialog
          title={request.options.title}
          message={request.options.message}
          confirmText={request.options.confirmText || 'Confirm'}
          cancelText={request.options.cancelText || 'Cancel'}
          variant={request.options.variant || 'warning'}
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used inside ConfirmProvider');
  return context.confirm;
}
