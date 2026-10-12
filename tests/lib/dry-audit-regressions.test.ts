import { describe, expect, it } from 'vitest';
import { parsePagination } from '../../apps/web/src/lib/api/pagination';
import { convertToCsv, escapeCsvValue } from '../../apps/web/src/lib/csv';
import { employeeApiCreateSchema } from '../../apps/web/src/lib/schemas/employee.schema';
import { signDailyLogAttachments } from '../../apps/web/src/app/api/internships/[id]/logs/_lib';
import { isStandupAdmin } from '../../apps/web/src/app/api/standups/_lib';
import { normalizeDbRoleClaim } from '../../apps/web/src/lib/auth/role';
import { targetRoleSchema } from '../../packages/database/src/schemas/resourceTargetingSchema';

describe('dry audit regressions', () => {
  it('escapes spreadsheet formulas in exported CSV data', () => {
    for (const value of ['=1+1', '+cmd', '-2+3', '@SUM(A1)', '  =1+1', '\uFEFF=1+1']) {
      expect(escapeCsvValue(value)).toBe(`'${value}`);
    }
    expect(escapeCsvValue('Normal, Name')).toBe('"Normal, Name"');
    expect(convertToCsv([{ name: '=1+1' }], {
      headers: ['Name'],
      rowMapper: (row) => [row.name],
    })).toBe("Name\n'=1+1");
  });

  it('accepts bounded pagination and rejects malformed or excessive values', () => {
    expect(parsePagination(new URLSearchParams(), 20)).toEqual({ page: 1, pageSize: 20 });
    expect(parsePagination(new URLSearchParams('page=2&pageSize=100'), 20)).toEqual({ page: 2, pageSize: 100 });
    for (const query of [
      'page=0', 'page=-1', 'page=NaN', 'page=1.5', 'page=1x',
      'pageSize=0', 'pageSize=101', 'pageSize=Infinity', 'pageSize=10x',
      'page=9999999999999999999999',
    ]) {
      expect(parsePagination(new URLSearchParams(query), 20)).toBeNull();
    }
  });

  it('limits administrative roles to admin and super admin', () => {
    expect(isStandupAdmin('admin')).toBe(true);
    expect(isStandupAdmin('super_admin')).toBe(true);
    for (const role of ['hr', 'cos', 'ceo']) {
      expect(isStandupAdmin(role)).toBe(false);
      expect(normalizeDbRoleClaim(role)).toBeNull();
      expect(targetRoleSchema.safeParse(role).success).toBe(false);
    }
    expect(targetRoleSchema.safeParse('super_admin').success).toBe(true);
  });

  it('keeps daily-log links as URLs without requesting a storage signature', async () => {
    const createSignedUrl = () => { throw new Error('External links must not be signed'); };
    const client = { storage: { from: () => ({ createSignedUrl }) } } as unknown as Parameters<typeof signDailyLogAttachments>[0];
    const attachments = [{ filePath: 'https://example.com/report', fileName: 'Report', mimeType: 'text/uri-list' }] as Parameters<typeof signDailyLogAttachments>[1];
    const [result] = await signDailyLogAttachments(client, attachments);
    expect(result?.signedUrl).toBe('https://example.com/report');
  });

  it('strips server-owned employee fields from create input', () => {
    const result = employeeApiCreateSchema.safeParse({
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      employee_number: 'E-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      date_hired: '2026-10-12',
      employment_type: 'regular',
      work_arrangement: 'full_time',
      department: 'Engineering',
      created_by: '123e4567-e89b-12d3-a456-426614174001',
      deleted_at: '2026-10-12T00:00:00Z',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).not.toHaveProperty('created_by');
    expect(result.data).not.toHaveProperty('deleted_at');
  });
});
