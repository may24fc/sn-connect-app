import { QueryStateScreen, renderQueryState } from '@/components/feedback/QueryStateScreen';
import { ApiError } from '@/lib/api-error';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('QueryStateScreen', () => {
  it('shows the loading state while the query is in flight', () => {
    render(
      <QueryStateScreen
        isLoading
        error={null}
        loadingTitle="Loading resource"
        loadingDescription="Fetching it now."
      />
    );

    expect(screen.getByText('Loading resource')).toBeInTheDocument();
  });

  it('shows a forbidden screen for a 403 instead of staying on loading', () => {
    render(
      <QueryStateScreen
        isLoading={false}
        error={new ApiError('Forbidden', 403)}
        forbiddenTitle="Access denied"
        forbiddenDescription="Not shared with your role."
      />
    );

    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
  });

  it('shows a not-found screen for a 404', () => {
    render(
      <QueryStateScreen
        isLoading={false}
        error={new ApiError('Not found', 404)}
        missingTitle="Resource not found"
      />
    );

    expect(screen.getByText('Resource not found')).toBeInTheDocument();
  });

  it('shows the error message and a retry control for other failures', () => {
    const onRetry = vi.fn();

    render(
      <QueryStateScreen
        isLoading={false}
        error={new ApiError('Database unavailable', 500)}
        errorTitle="Failed to load resource"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText('Failed to load resource')).toBeInTheDocument();
    expect(screen.getByText('Database unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
  });

  it('shows the missing screen when the request succeeded but returned no record', () => {
    render(
      <QueryStateScreen
        isLoading={false}
        error={null}
        isMissing
        missingTitle="Collection not found"
      />
    );

    expect(screen.getByText('Collection not found')).toBeInTheDocument();
  });

  it('renders nothing once the query is ready', () => {
    const { container } = render(
      <QueryStateScreen isLoading={false} error={null} isMissing={false} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe('renderQueryState', () => {
  it('returns null when the query is ready, so early-return guards work', () => {
    expect(renderQueryState({ isLoading: false, error: null, isMissing: false })).toBeNull();
  });

  it('returns an element while the query is not ready', () => {
    expect(renderQueryState({ isLoading: true, error: null })).not.toBeNull();
  });
});
