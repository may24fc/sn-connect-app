import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from '@hr-portal/ui';

describe('EmptyState', () => {
  it('calls the primary action handler when clicked', () => {
    const onClick = vi.fn();

    render(
      <EmptyState
        title="No records"
        description="Create your first record to get started."
        action={{ label: 'Create record', onClick }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create record' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders href-based actions as links', () => {
    render(
      <EmptyState
        title="No checklist"
        description="Open the setup flow to continue."
        action={{ label: 'Open setup', href: '/onboarding/setup' }}
        secondaryAction={{ label: 'Back to dashboard', href: '/dashboard' }}
      />
    );

    expect(screen.getByRole('link', { name: 'Open setup' })).toHaveAttribute(
      'href',
      '/onboarding/setup'
    );
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute(
      'href',
      '/dashboard'
    );
  });

  it('supports inverse appearance for dark preview surfaces', () => {
    render(
      <EmptyState
        title="No preview"
        description="Open the file externally to continue."
        appearance="inverse"
      />
    );

    expect(screen.getByText('No preview')).toHaveClass('text-zinc-100');
    expect(screen.getByText('Open the file externally to continue.')).toHaveClass('text-zinc-300');
  });
});