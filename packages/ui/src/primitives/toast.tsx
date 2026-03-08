'use client';

import { X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../utils/cn';
import { Button } from './button';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  onClose?: () => void;
}

export interface ToastState extends ToastProps {
  visible: boolean;
}

const toastVariants = {
  default: 'bg-popover text-popover-foreground border-border',
  success: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800',
  error: 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800',
  warning: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
};

const Toast = React.forwardRef<HTMLDivElement, ToastState>(
  ({ title, description, variant = 'default', onClose, visible }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'pointer-events-auto flex w-full max-w-md items-start gap-3 overflow-hidden rounded-md border p-4 shadow-lg transition-all',
          toastVariants[variant],
          visible
            ? 'animate-in slide-in-from-bottom-4 fade-in'
            : 'animate-out slide-out-to-bottom-4 fade-out'
        )}
      >
        <div className="flex-1 space-y-1">
          {title && <p className="text-sm font-medium">{title}</p>}
          {description && <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }
);
Toast.displayName = 'Toast';

// Toast Provider Context
interface ToastContextValue {
  toasts: ToastState[];
  addToast: (toast: Omit<ToastProps, 'id'>) => string;
  updateToast: (id: string, toast: Partial<Omit<ToastProps, 'id'>>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

// Track active auto-dismiss timers so they can be cancelled on update
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearToastTimer(id: string): void {
  const timer = toastTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    toastTimers.delete(id);
  }
}

function scheduleToastDismiss(
  id: string,
  duration: number,
  setToasts: React.Dispatch<React.SetStateAction<ToastState[]>>
): void {
  clearToastTimer(id);

  const timer = setTimeout(() => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)));
    // Remove from DOM after animation
    const removeTimer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      toastTimers.delete(id);
    }, 300);
    toastTimers.set(`${id}_remove`, removeTimer);
  }, duration);

  toastTimers.set(id, timer);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastState[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastProps, 'id'>): string => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = toast.duration ?? 3000;

    setToasts((prev) => [...prev, { ...toast, id, visible: true }]);

    // Auto-dismiss after duration (0 = persistent until manually updated/removed)
    if (duration > 0) {
      scheduleToastDismiss(id, duration, setToasts);
    }

    return id;
  }, []);

  const updateToast = React.useCallback(
    (id: string, updates: Partial<Omit<ToastProps, 'id'>>): void => {
      // Clear any existing auto-dismiss timer
      clearToastTimer(id);
      clearToastTimer(`${id}_remove`);

      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates, visible: true } : t)));

      // Schedule new auto-dismiss with the updated duration (default 3000ms)
      const newDuration = updates.duration ?? 3000;
      if (newDuration > 0) {
        scheduleToastDismiss(id, newDuration, setToasts);
      }
    },
    []
  );

  const removeToast = React.useCallback((id: string) => {
    clearToastTimer(id);
    clearToastTimer(`${id}_remove`);
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, updateToast, removeToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:flex-col md:max-w-[420px]">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export { Toast };
