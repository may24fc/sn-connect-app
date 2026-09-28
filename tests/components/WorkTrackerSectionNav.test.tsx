import { WorkTrackerSectionNav } from '@/components/work-tracker/WorkTrackerSectionNav';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => ({ role: 'employee' }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: authMock.role } }),
}));

afterEach(cleanup);

describe('WorkTrackerSectionNav', () => {
  it.each([
    ['employee', '/projects', '/tasks'],
    ['admin', '/admin/war-room', '/tasks'],
    ['super_admin', '/admin/war-room', '/super-admin/tasks'],
  ] as const)('uses role-aware routes for %s', (role, projectsHref, tasksHref) => {
    authMock.role = role;

    render(<WorkTrackerSectionNav current="overview" />);

    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', projectsHref);
    expect(screen.getByRole('link', { name: 'Tasks' })).toHaveAttribute('href', tasksHref);
  });

  it('provides an explicit return from a child section', () => {
    authMock.role = 'employee';

    render(<WorkTrackerSectionNav current="projects" />);

    expect(screen.getByRole('link', { name: 'Back to overview' })).toHaveAttribute(
      'href',
      '/work-tracker'
    );
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
  });
});
