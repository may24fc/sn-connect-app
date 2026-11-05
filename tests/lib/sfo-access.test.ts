import { describe, expect, it, vi } from 'vitest';
import { canWriteMarketingWorkspace } from '../../apps/web/src/app/api/marketing/_lib';
import { resolveAccountingSfoAccess } from '../../apps/web/src/lib/sfo-access';

describe('resolveAccountingSfoAccess', () => {
  it('grants Accounting department members write access', async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    };

    await expect(
      resolveAccountingSfoAccess(admin as never, '00000000-0000-0000-0000-000000000001')
    ).resolves.toBe('write');
  });

  it('does not grant other departments SFO access', async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    };

    await expect(
      resolveAccountingSfoAccess(admin as never, '00000000-0000-0000-0000-000000000002')
    ).resolves.toBeNull();
  });
});

describe('canWriteMarketingWorkspace', () => {
  it('accepts Accounting and workspace write access without a per-platform submit grant', () => {
    expect(canWriteMarketingWorkspace('employee', 'write')).toBe(true);
    expect(canWriteMarketingWorkspace('workspace_user', 'write')).toBe(true);
  });

  it('keeps read-only and ungranted users from bypassing platform grants', () => {
    expect(canWriteMarketingWorkspace('employee', null)).toBe(false);
    expect(canWriteMarketingWorkspace('workspace_user', 'read')).toBe(false);
  });
});
