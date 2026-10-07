import {
  PersonMeta,
  UserAvatar,
  formatPersonRole,
  getPersonMetaParts,
  getUserInitials,
} from '@hr-portal/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('getUserInitials', () => {
  it('uses up to two initials', () => {
    expect(getUserInitials('Ceferino Jumao-as V')).toBe('CJ');
    expect(getUserInitials('ana')).toBe('A');
  });

  it('falls back instead of rendering an empty circle', () => {
    expect(getUserInitials(null)).toBe('?');
    expect(getUserInitials('   ')).toBe('?');
  });
});

describe('formatPersonRole', () => {
  it('humanizes roles and skips missing ones', () => {
    expect(formatPersonRole('super_admin')).toBe('Super Admin');
    expect(formatPersonRole('employee')).toBe('Employee');
    expect(formatPersonRole(null)).toBeNull();
  });
});

describe('PersonMeta', () => {
  it('drops missing and placeholder parts along with their separator', () => {
    expect(getPersonMetaParts(['—', 'Employee'])).toEqual(['Employee']);
    expect(getPersonMetaParts(['Unassigned', 'Associate'])).toEqual(['Associate']);
    expect(getPersonMetaParts([null, '', ' Marketing ', undefined, 'Associate'])).toEqual([
      'Marketing',
      'Associate',
    ]);
  });

  it('renders nothing when every part is missing', () => {
    const { container } = render(<PersonMeta parts={[null, '—']} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('joins present parts with a middle dot', () => {
    render(<PersonMeta parts={['Marketing', null, 'Associate']} />);
    expect(screen.getByText('Marketing · Associate')).toBeInTheDocument();
  });
});

describe('UserAvatar', () => {
  it('shows initials when the user has no photo', () => {
    render(<UserAvatar name="Ariana Ricardo" avatarUrl={null} />);
    expect(screen.getByText('AR')).toBeInTheDocument();
  });
});
