import React from 'react';
import { Toaster, toast as hotToast } from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';
export type ToastMessage = React.ReactElement | string | null;

interface ToastAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface ToastProps {
  type: ToastType;
  message: React.ReactNode;
  visible?: boolean;
  onDismiss?: () => void;
  action?: ToastAction;
}

const toastStyles: Record<ToastType, { icon: React.ElementType; iconClass: string; ringClass: string }> = {
  success: { icon: CheckCircle2, iconClass: 'text-green-600', ringClass: 'ring-green-100' },
  error: { icon: XCircle, iconClass: 'text-red-600', ringClass: 'ring-red-100' },
  info: { icon: Info, iconClass: 'text-blue-600', ringClass: 'ring-blue-100' },
  warning: { icon: AlertTriangle, iconClass: 'text-yellow-600', ringClass: 'ring-yellow-100' },
  loading: { icon: Loader2, iconClass: 'text-gray-500 animate-spin', ringClass: 'ring-gray-100' },
};

export default function Toast({ type, message, visible = true, onDismiss, action }: ToastProps) {
  const style = toastStyles[type];
  const Icon = style.icon;

  return (
    <div
      className={`pointer-events-auto flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-lg ring-4 transition-all duration-200 dark:border-gray-700 dark:bg-gray-900 ${style.ringClass} ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
      role="status"
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconClass}`} />
      <div className="min-w-0 flex-1 leading-5 text-gray-700 dark:text-gray-100">{message}</div>
      {action && (
        <div className="ml-3 flex items-center">
          {action.href ? (
            <a href={action.href} className="inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-200">
              {action.label}
            </a>
          ) : (
            <button onClick={action.onClick} className="inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-200">
              {action.label}
            </button>
          )}
        </div>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ToastViewport() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      toastOptions={{
        duration: 10000,
        style: {
          background: 'rgb(var(--color-gray-800))',
          color: 'rgb(var(--color-gray-100))',
          borderRadius: '8px',
          boxShadow: '0 16px 40px rgb(15 23 42 / 0.18)',
          transition: 'background-color 0.3s ease, color 0.3s ease',
        },
        success: {
          iconTheme: {
            primary: 'rgb(var(--color-accent-600))',
            secondary: 'rgb(var(--color-gray-900))',
          },
        },
        error: {
          iconTheme: {
            primary: 'rgb(var(--color-danger))',
            secondary: 'rgb(var(--color-gray-900))',
          },
        },
      }}
    />
  );
}

export function showCustomToast(type: ToastType, message: ToastMessage, duration?: number, action?: ToastAction) {
  return hotToast.custom(
    (toast) => (
      <Toast
        type={type}
        message={message}
        visible={toast.visible}
        action={action}
        onDismiss={() => hotToast.dismiss(toast.id)}
      />
    ),
    { duration: duration ?? 10000 }
  );
}
