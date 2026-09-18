import { cleanup, render, screen } from '@testing-library/react';
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
    expect(screen.getByText('Tasks')).not.toBeNull();
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
    expect(screen.queryByText('Tasks')).toBeNull();
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
});
