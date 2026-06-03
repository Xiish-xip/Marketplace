import React, { createContext, useCallback, useContext, useMemo } from 'react';
import hotToast from 'react-hot-toast';
import { ToastMessage, ToastType, ToastViewport, showCustomToast } from '../components/Toast';

interface ShowToastOptions {
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface ToastContextValue {
  showToast: (message: ToastMessage, options?: ShowToastOptions) => string;
  success: (message: ToastMessage, duration?: number) => string;
  error: (message: ToastMessage, duration?: number) => string;
  info: (message: ToastMessage, duration?: number) => string;
  warning: (message: ToastMessage, duration?: number) => string;
  dismissToast: (id?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const showToast = useCallback((message: ToastMessage, options: ShowToastOptions = {}) => {
    const type = options.type || 'info';
    if (options.action) {
      return showCustomToast(type, message, options.duration ?? 10000, options.action);
    }
    if (type === 'success') return hotToast.success(message, { duration: options.duration ?? 10000 });
    if (type === 'error') return hotToast.error(message, { duration: options.duration ?? 10000 });
    if (type === 'loading') return hotToast.loading(message);
    return showCustomToast(type, message, options.duration ?? 10000);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({
    showToast,
    success: (message, duration) => showToast(message, { type: 'success', duration }),
    error: (message, duration) => showToast(message, { type: 'error', duration }),
    info: (message, duration) => showToast(message, { type: 'info', duration }),
    warning: (message, duration) => showToast(message, { type: 'warning', duration }),
    dismissToast: (id) => hotToast.dismiss(id),
  }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
