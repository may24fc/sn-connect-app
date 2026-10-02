import LoginForm from '@/app/(auth)/login/LoginForm';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  isLoading: true,
  user: null as null | {
    role: 'employee';
    status: 'active';
  },
}));

const replace = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isLoading: authState.isLoading,
    user: authState.user,
    login: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

vi.mock('next/image', () => ({
  default: () => <span aria-hidden="true" />,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LoginForm authentication loading state', () => {
  beforeEach(() => {
    authState.isLoading = true;
    authState.user = null;
    replace.mockClear();
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
  });

  it('renders an accessible login-card skeleton while authentication is unresolved', () => {
    render(<LoginForm waitForClientAuth />);

    expect(screen.getByRole('status', { name: 'Checking your session' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    expect(screen.getByText('Checking your session...')).toHaveClass('sr-only');
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders the sign-in form immediately when a server check already confirmed no session', () => {
    render(<LoginForm />);

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Checking your session' })).not.toBeInTheDocument();
  });
});
