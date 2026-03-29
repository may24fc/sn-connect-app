import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('redirect-config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function loadModule() {
    return await import('../../../apps/web/src/lib/auth/redirect-config');
  }

  describe('isAllowedOrigin', () => {
    it('allows localhost:3000', async () => {
      process.env.NODE_ENV = 'test';
      const { isAllowedOrigin } = await loadModule();
      expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    });

    it('allows localhost:3001', async () => {
      process.env.NODE_ENV = 'test';
      const { isAllowedOrigin } = await loadModule();
      expect(isAllowedOrigin('http://localhost:3001')).toBe(true);
    });

    it('allows Vercel preview URLs', async () => {
      const { isAllowedOrigin } = await loadModule();
      expect(isAllowedOrigin('https://my-app-abc123.vercel.app')).toBe(true);
      expect(isAllowedOrigin('https://sn-hr-portal-git-main-team.vercel.app')).toBe(true);
    });

    it('allows vercel.app root', async () => {
      const { isAllowedOrigin } = await loadModule();
      expect(isAllowedOrigin('https://vercel.app')).toBe(true);
    });

    it('rejects unknown origins', async () => {
      const { isAllowedOrigin } = await loadModule();
      expect(isAllowedOrigin('https://evil.com')).toBe(false);
      expect(isAllowedOrigin('https://not-vercel.app')).toBe(false);
      expect(isAllowedOrigin('http://localhost:4000')).toBe(false);
    });

    it('rejects origins with spoofed suffixes', async () => {
      const { isAllowedOrigin } = await loadModule();
      expect(isAllowedOrigin('https://fakevercel.app')).toBe(false);
    });

    it('is case-insensitive', async () => {
      process.env.NODE_ENV = 'test';
      const { isAllowedOrigin } = await loadModule();
      expect(isAllowedOrigin('HTTP://LOCALHOST:3000')).toBe(true);
      expect(isAllowedOrigin('HTTPS://MY-APP.VERCEL.APP')).toBe(true);
    });

    it('handles trailing slashes', async () => {
      process.env.NODE_ENV = 'test';
      const { isAllowedOrigin } = await loadModule();
      expect(isAllowedOrigin('http://localhost:3000/')).toBe(true);
    });

    it('rejects localhost origins in production mode', async () => {
      process.env.NODE_ENV = 'production';
      const { isAllowedOrigin } = await loadModule();
      expect(isAllowedOrigin('http://localhost:3000')).toBe(false);
      expect(isAllowedOrigin('http://localhost:3001')).toBe(false);
    });
  });

  describe('getSiteUrl', () => {
    it('returns NEXT_PUBLIC_SITE_URL when set', async () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://my-app.example.com';
      const { getSiteUrl } = await loadModule();
      expect(getSiteUrl()).toBe('https://my-app.example.com');
    });

    it('strips trailing slash from NEXT_PUBLIC_SITE_URL', async () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://my-app.example.com/';
      const { getSiteUrl } = await loadModule();
      expect(getSiteUrl()).toBe('https://my-app.example.com');
    });

    it('falls back to NEXT_PUBLIC_VERCEL_URL', async () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.VERCEL_ENV = 'preview';
      process.env.NEXT_PUBLIC_VERCEL_URL = 'my-app-abc123.vercel.app';
      const { getSiteUrl } = await loadModule();
      expect(getSiteUrl()).toBe('https://my-app-abc123.vercel.app');
    });

    it('falls back to localhost when no env vars set in local runtime', async () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.NEXT_PUBLIC_VERCEL_URL;
      delete process.env.VERCEL_URL;
      delete process.env.VERCEL_ENV;
      process.env.NODE_ENV = 'test';
      const { getSiteUrl } = await loadModule();
      expect(getSiteUrl()).toBe('http://localhost:3001');
    });

    it('falls back to the canonical production app url when no env vars are set', async () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.NEXT_PUBLIC_VERCEL_URL;
      delete process.env.VERCEL_URL;
      delete process.env.VERCEL_ENV;
      process.env.NODE_ENV = 'production';
      const { getSiteUrl } = await loadModule();
      expect(getSiteUrl()).toBe('https://app.sngroup.com.au');
    });
  });

  describe('getAuthCallbackUrl', () => {
    it('returns site URL + /auth/callback', async () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://my-app.example.com';
      const { getAuthCallbackUrl } = await loadModule();
      expect(getAuthCallbackUrl()).toBe('https://my-app.example.com/auth/callback');
    });

    it('works with Vercel URL fallback', async () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.VERCEL_ENV = 'preview';
      process.env.NEXT_PUBLIC_VERCEL_URL = 'preview-abc.vercel.app';
      const { getAuthCallbackUrl } = await loadModule();
      expect(getAuthCallbackUrl()).toBe('https://preview-abc.vercel.app/auth/callback');
    });
  });

  describe('getLoginUrl', () => {
    it('returns site URL + /login', async () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://app.sngroup.com.au';
      const { getLoginUrl } = await loadModule();
      expect(getLoginUrl()).toBe('https://app.sngroup.com.au/login');
    });
  });

  describe('getPostLoginRedirect', () => {
    it('returns returnTo path when provided', async () => {
      const { getPostLoginRedirect } = await loadModule();
      expect(getPostLoginRedirect('admin', '/tasks/123')).toBe('/tasks/123');
    });

    it('defaults to role-based dashboard', async () => {
      const { getPostLoginRedirect } = await loadModule();
      expect(getPostLoginRedirect('super_admin')).toBe('/super-admin/dashboard');
      expect(getPostLoginRedirect('admin')).toBe('/admin/dashboard');
      expect(getPostLoginRedirect('intern')).toBe('/intern/dashboard');
      expect(getPostLoginRedirect('employee')).toBe('/dashboard');
    });

    it('defaults to /dashboard for unknown roles', async () => {
      const { getPostLoginRedirect } = await loadModule();
      expect(getPostLoginRedirect('unknown')).toBe('/dashboard');
      expect(getPostLoginRedirect(undefined)).toBe('/dashboard');
    });

    it('ignores returnTo that is not a relative path', async () => {
      const { getPostLoginRedirect } = await loadModule();
      expect(getPostLoginRedirect('admin', 'https://evil.com')).toBe('/admin/dashboard');
    });
  });

  describe('getAuthenticatedHomeRedirect', () => {
    it('prioritizes onboarding setup over role dashboards', async () => {
      const { getAuthenticatedHomeRedirect } = await loadModule();
      expect(getAuthenticatedHomeRedirect('admin', 'pending_onboarding')).toBe(
        '/onboarding/setup'
      );
    });

    it('prioritizes awaiting approval over returnTo', async () => {
      const { getAuthenticatedHomeRedirect } = await loadModule();
      expect(getAuthenticatedHomeRedirect('employee', 'awaiting_approval', '/reports')).toBe(
        '/onboarding/awaiting-approval'
      );
    });

    it('falls back to the role-based dashboard when no onboarding status blocks it', async () => {
      const { getAuthenticatedHomeRedirect } = await loadModule();
      expect(getAuthenticatedHomeRedirect('super_admin', 'active')).toBe(
        '/super-admin/dashboard'
      );
    });
  });

  describe('getPostSignupRedirect', () => {
    it('encodes email in the query string', async () => {
      const { getPostSignupRedirect } = await loadModule();
      expect(getPostSignupRedirect('user@example.com')).toBe(
        '/signup/confirmation?email=user%40example.com'
      );
    });

    it('returns the base confirmation route when email is omitted', async () => {
      const { getPostSignupRedirect } = await loadModule();
      expect(getPostSignupRedirect()).toBe('/signup/confirmation');
    });
  });

  describe('getPasswordResetRedirectUrl', () => {
    it('returns site URL + /reset-password', async () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://my-app.example.com';
      const { getPasswordResetRedirectUrl } = await loadModule();
      expect(getPasswordResetRedirectUrl()).toBe('https://my-app.example.com/reset-password');
    });
  });

  describe('validateRedirectTarget', () => {
    it('returns relative paths as-is', async () => {
      const { validateRedirectTarget } = await loadModule();
      expect(validateRedirectTarget('/dashboard')).toBe('/dashboard');
      expect(validateRedirectTarget('/admin/reports?tab=pending')).toBe(
        '/admin/reports?tab=pending'
      );
    });

    it('returns fallback for null/undefined', async () => {
      const { validateRedirectTarget } = await loadModule();
      expect(validateRedirectTarget(null)).toBe('/dashboard');
      expect(validateRedirectTarget(undefined)).toBe('/dashboard');
    });

    it('returns custom fallback when specified', async () => {
      const { validateRedirectTarget } = await loadModule();
      expect(validateRedirectTarget(null, '/login')).toBe('/login');
    });

    it('rejects protocol-relative URLs (//evil.com)', async () => {
      const { validateRedirectTarget } = await loadModule();
      expect(validateRedirectTarget('//evil.com/steal')).toBe('/dashboard');
    });

    it('extracts pathname from allowed absolute URLs', async () => {
      process.env.NODE_ENV = 'test';
      const { validateRedirectTarget } = await loadModule();
      expect(validateRedirectTarget('http://localhost:3000/tasks/123')).toBe('/tasks/123');
      expect(validateRedirectTarget('https://my-app.vercel.app/admin')).toBe('/admin');
    });

    it('rejects absolute URLs from unknown origins', async () => {
      const { validateRedirectTarget } = await loadModule();
      expect(validateRedirectTarget('https://evil.com/steal')).toBe('/dashboard');
      expect(validateRedirectTarget('https://not-vercel.app/admin')).toBe('/dashboard');
    });

    it('handles malformed URLs gracefully', async () => {
      const { validateRedirectTarget } = await loadModule();
      expect(validateRedirectTarget('not-a-url')).toBe('/dashboard');
    });
  });
});
