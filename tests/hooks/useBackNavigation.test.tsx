import { useBackNavigation } from '@/hooks/useBackNavigation';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigationMocks.push }),
  useSearchParams: () => navigationMocks.searchParams,
}));

describe('useBackNavigation', () => {
  beforeEach(() => {
    navigationMocks.push.mockReset();
    navigationMocks.searchParams = new URLSearchParams();
  });

  it('uses the declared parent when no return path is supplied', () => {
    const { result } = renderHook(() => useBackNavigation({ fallbackPath: '/reports' }));

    act(() => result.current());

    expect(navigationMocks.push).toHaveBeenCalledWith('/reports');
  });

  it('preserves an explicit internal return path', () => {
    navigationMocks.searchParams = new URLSearchParams({
      returnTo: '/work-tracker?work=project',
    });
    const { result } = renderHook(() => useBackNavigation({ fallbackPath: '/projects' }));

    act(() => result.current());

    expect(navigationMocks.push).toHaveBeenCalledWith('/work-tracker?work=project');
  });

  it.each(['//malicious.example/path', '/\\malicious.example/path'])(
    'rejects unsafe return path %s',
    (returnTo) => {
      navigationMocks.searchParams = new URLSearchParams({ returnTo });
      const { result } = renderHook(() => useBackNavigation({ fallbackPath: '/dashboard' }));

      act(() => result.current());

      expect(navigationMocks.push).toHaveBeenCalledWith('/dashboard');
    }
  );
});
