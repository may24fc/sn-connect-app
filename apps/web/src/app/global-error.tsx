'use client';

import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Root-level error boundary. This catches errors that occur in the
 * root layout itself (where the route-group error.tsx files can't help).
 * Must render its own <html>/<body> since the root layout may have errored.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): ReactNode {
  return (
    <html lang="en">
      <body className="h-screen bg-zinc-50 font-sans antialiased flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
            <AlertTriangle className="h-7 w-7 text-rose-600" />
          </div>

          <h1 className="text-xl font-bold text-zinc-900">Application Error</h1>

          <p className="text-sm text-zinc-600">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
