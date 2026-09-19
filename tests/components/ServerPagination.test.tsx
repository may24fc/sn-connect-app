import { ServerPagination } from '@/components/data-display/ServerPagination';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('ServerPagination', () => {
  it('renders nothing without pagination metadata', () => {
    const { container } = render(
      <ServerPagination pagination={undefined} onPageChange={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the dataset is empty', () => {
    const { container } = render(
      <ServerPagination
        pagination={{ page: 1, pageSize: 25, total: 0, totalPages: 0 }}
        onPageChange={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('reports the server total rather than the loaded row count', () => {
    render(
      <ServerPagination
        pagination={{ page: 2, pageSize: 25, total: 130, totalPages: 6 }}
        onPageChange={vi.fn()}
        itemLabel="resources"
      />
    );

    expect(screen.getByText('26-50 of 130 resources')).toBeInTheDocument();
    expect(screen.getByText('2 / 6')).toBeInTheDocument();
  });

  it('clamps the last page range to the total', () => {
    render(
      <ServerPagination
        pagination={{ page: 6, pageSize: 25, total: 130, totalPages: 6 }}
        onPageChange={vi.fn()}
        itemLabel="resources"
      />
    );

    expect(screen.getByText('126-130 of 130 resources')).toBeInTheDocument();
  });

  it('hides the page controls when everything fits on one page', () => {
    render(
      <ServerPagination
        pagination={{ page: 1, pageSize: 25, total: 8, totalPages: 1 }}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });

  it('moves between pages and stops at the boundaries', () => {
    const onPageChange = vi.fn();

    const { rerender } = render(
      <ServerPagination
        pagination={{ page: 1, pageSize: 25, total: 130, totalPages: 6 }}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(
      <ServerPagination
        pagination={{ page: 6, pageSize: 25, total: 130, totalPages: 6 }}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(5);
  });

  it('disables navigation while a page is loading', () => {
    render(
      <ServerPagination
        pagination={{ page: 2, pageSize: 25, total: 130, totalPages: 6 }}
        onPageChange={vi.fn()}
        isLoading
      />
    );

    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });
});
