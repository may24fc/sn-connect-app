import { AppShellSkeleton } from '@/components/layout/AppShellSkeleton';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('AppShellSkeleton', () => {
  it('renders an accessible dashboard-shaped loading state', () => {
    render(<AppShellSkeleton />);

    const status = screen.getByRole('status', { name: 'Preparing your dashboard' });

    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Preparing your dashboard...')).toHaveClass('sr-only');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});
