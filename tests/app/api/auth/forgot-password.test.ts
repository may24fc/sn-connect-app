import { describe, expect, it } from 'vitest';

import { normaliseRecoveryActionLink } from '../../../../apps/web/src/lib/auth/recovery-link';
import { passwordResetAuditRecordId } from '../../../../apps/web/src/lib/auth/password-reset-audit';

describe('forgot-password route helpers', () => {
  it('uses a stable opaque UUID for each email and secret', () => {
    const id = passwordResetAuditRecordId('User@Example.com', 'test-secret');
    expect(id).toMatch(/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
    expect(id).toBe(passwordResetAuditRecordId(' user@example.com ', 'test-secret'));
    expect(id).not.toBe(passwordResetAuditRecordId('other@example.com', 'test-secret'));
    expect(id).not.toBe(passwordResetAuditRecordId('user@example.com', 'other-secret'));
  });
  it('rewrites Supabase recovery links to the expected redirect target', () => {
    const redirectTo = 'https://app.sngroup.com.au/reset-password';
    const actionLink =
      'https://project.supabase.co/auth/v1/verify?token=abc123&type=recovery&redirect_to=http%3A%2F%2Flocalhost%3A3000';

    expect(normaliseRecoveryActionLink(actionLink, redirectTo)).toBe(
      'https://project.supabase.co/auth/v1/verify?token=abc123&type=recovery&redirect_to=https%3A%2F%2Fapp.sngroup.com.au%2Freset-password'
    );
  });

  it('adds the redirect target when Supabase omits it', () => {
    const redirectTo = 'https://app.sngroup.com.au/reset-password';
    const actionLink = 'https://project.supabase.co/auth/v1/verify?token=abc123&type=recovery';

    expect(normaliseRecoveryActionLink(actionLink, redirectTo)).toBe(
      'https://project.supabase.co/auth/v1/verify?token=abc123&type=recovery&redirect_to=https%3A%2F%2Fapp.sngroup.com.au%2Freset-password'
    );
  });

  it('returns the original value for malformed links', () => {
    expect(normaliseRecoveryActionLink('not-a-url', 'https://app.sngroup.com.au/reset-password')).toBe(
      'not-a-url'
    );
  });
});
