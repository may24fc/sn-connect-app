import { Sidebar } from '@hr-portal/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('Finance Properties navigation', () => {
  it('appears for administrators but not employees with only department expense access', () => {
    const { unmount } = render(
      <Sidebar variant="admin" currentPath="/finance/properties" onNavigate={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Properties' })).toBeInTheDocument();
    unmount();
    render(
      <Sidebar
        variant="employee"
        currentPath="/finance"
        onNavigate={vi.fn()}
        showExpenseDeskAccess
      />
    );
    expect(screen.queryByRole('button', { name: 'Properties' })).not.toBeInTheDocument();
  });

  it('appears for accounting employees with the matching Finance capability', () => {
    render(
      <Sidebar
        variant="employee"
        currentPath="/finance/properties"
        onNavigate={vi.fn()}
        showExpenseDeskAccess
        showFinancePropertiesAccess
      />
    );
    expect(screen.getByRole('button', { name: 'Properties' })).toBeInTheDocument();
  });
});
