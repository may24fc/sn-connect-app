'use client';

import { getApiErrorStatus, getErrorMessage } from '@/lib/api-error';
import { Button, EmptyState } from '@hr-portal/ui';
import { AlertCircle, FileQuestion, Loader2, Lock, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

export interface QueryStateScreenProps {
  isLoading: boolean;
  error: unknown;
  /** True when the request succeeded but returned no record (e.g. a soft-deleted row). */
  isMissing?: boolean;
  loadingTitle?: string;
  loadingDescription?: string;
  missingTitle?: string;
  missingDescription?: string;
  forbiddenTitle?: string;
  forbiddenDescription?: string;
  errorTitle?: string;
  onRetry?: () => void;
  onBack?: () => void;
  backLabel?: string;
  className?: string;
}

/**
 * Renders the non-ready states of a route-level query as distinct screens:
 * loading, forbidden (403), not found (404), failed (other errors) and missing.
 *
 * Returns `null` when the query is ready, so callers can render it directly
 * above their content instead of branching on `isLoading || !record`, which
 * turns a failed request into a permanent loading screen.
 */
export function QueryStateScreen({
  isLoading,
  error,
  isMissing = false,
  loadingTitle = 'Loading',
  loadingDescription = 'Fetching the latest data.',
  missingTitle = 'Not found',
  missingDescription = 'This record does not exist or has been removed.',
  forbiddenTitle = 'Access denied',
  forbiddenDescription = 'You do not have permission to view this record.',
  errorTitle = 'Failed to load',
  onRetry,
  onBack,
  backLabel = 'Go back',
  className = 'p-6',
}: QueryStateScreenProps): ReactNode {
  if (isLoading) {
    return (
      <div className={className}>
        <EmptyState
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          title={loadingTitle}
          description={loadingDescription}
          size="sm"
        />
      </div>
    );
  }

  const backAction = onBack ? { action: { label: backLabel, onClick: onBack } } : {};

  const missingScreen = (
    <div className={className}>
      <EmptyState
        icon={FileQuestion}
        title={missingTitle}
        description={missingDescription}
        size="sm"
        {...backAction}
      />
    </div>
  );

  if (error) {
    const status = getApiErrorStatus(error);

    if (status === 403 || status === 401) {
      return (
        <div className={className}>
          <EmptyState
            icon={Lock}
            title={forbiddenTitle}
            description={forbiddenDescription}
            size="sm"
            {...backAction}
          />
        </div>
      );
    }

    if (status === 404) {
      return missingScreen;
    }

    return (
      <div className={className}>
        <EmptyState
          icon={AlertCircle}
          title={errorTitle}
          description={getErrorMessage(error, 'The request could not be completed.')}
          size="sm"
        />
        <FailureActions onRetry={onRetry} onBack={onBack} backLabel={backLabel} />
      </div>
    );
  }

  if (isMissing) {
    return missingScreen;
  }

  return null;
}

function FailureActions({
  onRetry,
  onBack,
  backLabel,
}: {
  onRetry?: (() => void) | undefined;
  onBack?: (() => void) | undefined;
  backLabel: string;
}): ReactNode {
  if (!(onRetry || onBack)) {
    return null;
  }

  return (
    <div className="mt-4 flex justify-center gap-2">
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Try again
        </Button>
      )}
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack}>
          {backLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Calls {@link QueryStateScreen} directly and returns `null` when the query is
 * ready. Use this instead of `<QueryStateScreen />` in an early-return guard:
 * a JSX element is always truthy, which would hide the page's real content.
 *
 * `QueryStateScreen` uses no hooks, so invoking it as a plain function is safe.
 */
export function renderQueryState(props: QueryStateScreenProps): ReactNode {
  return QueryStateScreen(props);
}
