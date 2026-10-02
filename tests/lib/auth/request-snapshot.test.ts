import {
  parseVerifiedAuthSnapshot,
  serializeVerifiedAuthSnapshot,
} from '@/lib/auth/request-snapshot';
import { describe, expect, it } from 'vitest';

describe('verified auth request snapshot', () => {
  it('round-trips only the identity fields needed by the signed-in layout', () => {
    const serialized = serializeVerifiedAuthSnapshot({
      id: 'user-1',
      email: 'jane@example.com',
      app_metadata: { db_role: 'employee', provider: 'email' },
      user_metadata: {
        full_name: 'Jane Dœ',
        avatar_url: 'https://example.com/avatar.png',
        private_note: 'do not forward',
      },
    });

    expect(parseVerifiedAuthSnapshot(serialized)).toEqual({
      id: 'user-1',
      email: 'jane@example.com',
      app_metadata: { db_role: 'employee' },
      user_metadata: {
        full_name: 'Jane Dœ',
        avatar_url: 'https://example.com/avatar.png',
      },
    });
    expect(serialized).not.toContain('private_note');
  });

  it.each([null, '', '%invalid', encodeURIComponent(JSON.stringify({ email: 'missing-id' }))])(
    'rejects an invalid snapshot',
    (value) => {
      expect(parseVerifiedAuthSnapshot(value)).toBeNull();
    }
  );
});
