import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

afterEach(cleanup);

describe('Sidebar workspaces', () => {
  it('keeps the dashboard pinned and shows internal navigation by default', () => {
    render(
      <Sidebar
        variant="employee"
        currentPath="/dashboard"
        onNavigate={vi.fn()}
        showMarketingReports
      />
    );

    expect(screen.getByText('Dashboard')).not.toBeNull();
    expect(screen.getByLabelText('Current workspace: Internal Management')).not.toBeNull();
    expect(screen.getByText('Work Tracker')).not.toBeNull();
    expect(screen.queryByText('Marketing Reports')).toBeNull();
  });

  it('shows only authorized SFO tools for a self-service user', () => {
    render(
      <Sidebar
        variant="employee"
        currentPath="/reports"
        onNavigate={vi.fn()}
        showMarketingReports
        showMarketingAdSpendAccess
        showCrmAccess
        showRevenueForecastAccess
      />
    );

    expect(screen.getByLabelText('Current workspace: Seafood Factory Outlet')).not.toBeNull();
    expect(screen.getByText('Marketing Reports')).not.toBeNull();
    expect(screen.getByText('Ad Spend')).not.toBeNull();
    expect(screen.getByText('CRM Tracker')).not.toBeNull();
    expect(screen.getByText('Revenue Forecast')).not.toBeNull();
    expect(screen.queryByText('Work Tracker')).toBeNull();
  });

  it('falls back to Internal Management when the requested workspace is unauthorized', () => {
    render(
      <Sidebar
        variant="employee"
        currentPath="/reports"
        onNavigate={vi.fn()}
        showMarketingReports={false}
      />
    );

    expect(screen.getByLabelText('Current workspace: Internal Management')).not.toBeNull();
    expect(screen.queryByText('Marketing Reports')).toBeNull();
  });

  it.each(['employee', 'associate'] as const)(
    'hides UHP from an ungranted %s workspace dropdown',
    (variant) => {
      render(<Sidebar variant={variant} currentPath="/uhp/reminders" onNavigate={vi.fn()} />);

      expect(screen.getByLabelText('Current workspace: Internal Management')).not.toBeNull();
    }
  );

  it.each(['employee', 'associate'] as const)(
    'shows UHP to a %s with at least one page grant',
    (variant) => {
      render(
        <Sidebar
          variant={variant}
          currentPath="/uhp/reminders"
          onNavigate={vi.fn()}
          showUhpPortalReminders
        />
      );

      expect(screen.getByLabelText('Current workspace: Ultimate Health Project')).not.toBeNull();
    }
  );

  it('gives super admins the full SFO toolset', () => {
    render(
      <Sidebar
        variant="super_admin"
        currentPath="/super-admin/revenue-forecast"
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Current workspace: Seafood Factory Outlet')).not.toBeNull();
    expect(screen.getByText('Marketing Reports')).not.toBeNull();
    expect(screen.getByText('Ad Spend')).not.toBeNull();
    expect(screen.getByText('CRM Tracker')).not.toBeNull();
    expect(screen.getByText('Revenue Forecast')).not.toBeNull();
  });

  it.each(['admin', 'super_admin'] as const)(
    'uses the unified Work Tracker for %s internal work visibility',
    (variant) => {
      render(<Sidebar variant={variant} currentPath="/work-tracker" onNavigate={vi.fn()} />);

      expect(screen.getByText('Work Tracker')).not.toBeNull();
      expect(screen.queryByText('Projects Tracker')).toBeNull();
      expect(screen.queryByText('Task Management')).toBeNull();
    }
  );

  it.each([
    ['/admin/resources', 'Resources'],
    ['/admin/announcements', 'Announcements'],
  ] as const)(
    'keeps the super-admin %s route active and canonical',
    (currentPath, label) => {
      const onNavigate = vi.fn();
      render(
        <Sidebar variant="super_admin" currentPath={currentPath} onNavigate={onNavigate} />
      );

      const navButton = screen.getByRole('button', { name: label });
      expect(navButton.className).toContain('bg-white/12');

      fireEvent.click(navButton);
      expect(onNavigate).toHaveBeenCalledWith(currentPath);
    }
  );
});
