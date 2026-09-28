import { RecruitmentSectionNav } from '@/components/recruitment/RecruitmentSectionNav';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigationMocks = vi.hoisted(() => ({ pathname: '/admin/recruitment' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMocks.pathname,
}));

afterEach(cleanup);

describe('RecruitmentSectionNav', () => {
  beforeEach(() => {
    navigationMocks.pathname = '/admin/recruitment';
  });

  it('links admin recruitment sections through canonical admin routes', () => {
    render(<RecruitmentSectionNav current="overview" />);

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      '/admin/recruitment'
    );
    expect(screen.getByRole('link', { name: 'Job postings' })).toHaveAttribute(
      'href',
      '/admin/jobs'
    );
    expect(screen.getByRole('link', { name: 'Applications' })).toHaveAttribute(
      'href',
      '/admin/jobs/applications'
    );
    expect(screen.getByRole('link', { name: 'Archive' })).toHaveAttribute(
      'href',
      '/admin/jobs/archive'
    );
  });

  it('preserves employee ATS routes and provides an explicit overview return', () => {
    navigationMocks.pathname = '/ats/jobs/applications';

    render(<RecruitmentSectionNav current="applications" />);

    expect(screen.getByRole('link', { name: 'Back to overview' })).toHaveAttribute(
      'href',
      '/ats/recruitment'
    );
    expect(screen.getByRole('link', { name: 'Applications' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Job postings' })).toHaveAttribute('href', '/ats/jobs');
  });
});
