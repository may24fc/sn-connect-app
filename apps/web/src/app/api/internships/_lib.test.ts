import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
}));

import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { canAccessInternship, isInternshipAdmin } from './_lib';

type MockRecord = Record<string, unknown> | null;

function createMockAdminClient(records: {
  internship?: MockRecord;
  employee?: MockRecord;
}) {
  return {
    from(table: string) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        is() {
          return this;
        },
        maybeSingle: async () => {
          if (table === 'internships') {
            return { data: records.internship ?? null, error: null };
          }

          if (table === 'employees') {
            return { data: records.employee ?? null, error: null };
          }

          return { data: null, error: null };
        },
      };
    },
  };
}

describe('isInternshipAdmin', () => {
  beforeEach(() => {
    vi.mocked(createSupabaseAdminClient).mockReset();
  });

  it('allows privileged internship roles', () => {
    expect(isInternshipAdmin('admin')).toBe(true);
    expect(isInternshipAdmin('super_admin')).toBe(true);
    expect(isInternshipAdmin('hr')).toBe(true);
    expect(isInternshipAdmin('cos')).toBe(true);
    expect(isInternshipAdmin('ceo')).toBe(true);
  });

  it('rejects non-privileged roles', () => {
    expect(isInternshipAdmin('employee')).toBe(false);
    expect(isInternshipAdmin('intern')).toBe(false);
    expect(isInternshipAdmin(null)).toBe(false);
  });

  it('authorizes admin access even if internship RLS is bypassed via admin client lookup', async () => {
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      createMockAdminClient({
        internship: {
          id: 'internship-1',
          employee_id: 'employee-1',
          supervisor_id: 'supervisor-1',
        },
      }) as never
    );

    await expect(
      canAccessInternship({} as never, 'internship-1', 'admin-user', 'admin')
    ).resolves.toMatchObject({
      allowed: true,
      employeeId: 'employee-1',
    });
  });

  it('authorizes the owning intern via employee lookup', async () => {
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      createMockAdminClient({
        internship: {
          id: 'internship-1',
          employee_id: 'employee-1',
          supervisor_id: 'supervisor-1',
        },
        employee: {
          id: 'employee-1',
          user_id: 'intern-user',
        },
      }) as never
    );

    await expect(
      canAccessInternship({} as never, 'internship-1', 'intern-user', 'intern')
    ).resolves.toMatchObject({
      allowed: true,
      employeeId: 'employee-1',
    });
  });
});