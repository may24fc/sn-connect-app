'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback component to render on error. Overrides default UI. */
  fallback?: ReactNode;
  /** Section label for contextual error display */
  section?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Reusable ErrorBoundary with contextual recovery actions.
 * Use as a wrapper around individual page sections so a single
 * broken widget doesn't crash the full page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `[ErrorBoundary${this.props.section ? `:${this.props.section}` : ''}]`,
      error,
      errorInfo
    );
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <ErrorFallbackUI
        error={this.state.error}
        section={this.props.section}
        onRetry={this.handleReset}
      />
    );
  }
}

// ─── Default fallback UI (also exported for use in Next.js error.tsx pages) ───

export interface ErrorFallbackUIProps {
  error: Error | null;
  section?: string | undefined;
  onRetry?: () => void;
  className?: string;
}

export function ErrorFallbackUI({
  error,
  section,
  onRetry,
  className,
}: ErrorFallbackUIProps): ReactNode {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="max-w-md w-full text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
          <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
        </div>

        <h2 className="text-lg font-semibold text-foreground">
          {section ? `Error loading ${section}` : 'An error occurred'}
        </h2>

        <p className="text-sm text-muted-foreground">
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/20 focus-visible:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          )}
          <GoBackButton />
          <DashboardButton />
        </div>
      </div>
    </div>
  );
}

function GoBackButton(): ReactNode {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Go back
    </button>
  );
}

function DashboardButton(): ReactNode {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push('/dashboard')}
      className="inline-flex items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
    >
      <Home className="h-4 w-4" />
      Dashboard
    </button>
  );
}
