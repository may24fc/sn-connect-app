import { TrackerPagination } from '@/components/data-display/TrackerPagination';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('TrackerPagination', () => {
  it('matches the PA tracker label and disables the first-page boundary', () => {
    render(<TrackerPagination page={1} totalPages={3} onPageChange={vi.fn()} />);

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('moves one page at a time and stops at the last page', () => {
    const onPageChange = vi.fn();
    const { rerender } = render(
      <TrackerPagination page={2} totalPages={3} onPageChange={onPageChange} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);

    rerender(<TrackerPagination page={3} totalPages={3} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('disables both controls while loading', () => {
    render(<TrackerPagination page={2} totalPages={3} onPageChange={vi.fn()} isLoading />);

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
