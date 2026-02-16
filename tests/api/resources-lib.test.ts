import { describe, expect, it } from 'vitest';
import {
  RESOURCE_ADMIN_ROLES,
  camelToSnake,
  isResourceAdmin,
  normalizeExcerpt,
  transformPayloadToSnakeCase,
} from '@/app/api/resources/_lib';

describe('normalizeExcerpt', () => {
  it('returns explicit excerpt when provided', () => {
    expect(normalizeExcerpt('Long description text', 'Short excerpt')).toBe('Short excerpt');
  });

  it('trims whitespace from excerpt', () => {
    expect(normalizeExcerpt('description', '  trimmed  ')).toBe('trimmed');
  });

  it('falls back to first 200 chars of description when excerpt is empty', () => {
    const description = 'a'.repeat(300);
    const result = normalizeExcerpt(description, '');
    expect(result).toHaveLength(200);
  });

  it('falls back to first 200 chars of description when excerpt is null', () => {
    const description = 'a'.repeat(300);
    const result = normalizeExcerpt(description, null);
    expect(result).toHaveLength(200);
  });

  it('falls back to first 200 chars of description when excerpt is undefined', () => {
    const description = 'a'.repeat(300);
    const result = normalizeExcerpt(description);
    expect(result).toHaveLength(200);
  });

  it('returns empty string when both are null', () => {
    expect(normalizeExcerpt(null, null)).toBe('');
  });

  it('returns empty string when description is null and no excerpt', () => {
    expect(normalizeExcerpt(null)).toBe('');
  });

  it('returns full description if under 200 chars', () => {
    expect(normalizeExcerpt('Short description', null)).toBe('Short description');
  });
});

describe('isResourceAdmin', () => {
  it.each(RESOURCE_ADMIN_ROLES)('returns true for role: %s', (role) => {
    expect(isResourceAdmin(role)).toBe(true);
  });

  it('returns false for employee role', () => {
    expect(isResourceAdmin('employee')).toBe(false);
  });

  it('returns false for intern role', () => {
    expect(isResourceAdmin('intern')).toBe(false);
  });

  it('returns false for null role', () => {
    expect(isResourceAdmin(null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isResourceAdmin('')).toBe(false);
  });
});

describe('camelToSnake', () => {
  it('converts camelCase to snake_case', () => {
    expect(camelToSnake('resourceType')).toBe('resource_type');
  });

  it('handles multiple uppercase letters', () => {
    expect(camelToSnake('isPublic')).toBe('is_public');
  });

  it('returns lowercase string unchanged', () => {
    expect(camelToSnake('title')).toBe('title');
  });

  it('handles empty string', () => {
    expect(camelToSnake('')).toBe('');
  });
});

describe('transformPayloadToSnakeCase', () => {
  it('transforms all keys from camelCase to snake_case', () => {
    const input = {
      resourceType: 'document',
      isPublic: true,
      targetRoles: ['employee'],
    };
    const result = transformPayloadToSnakeCase(input);
    expect(result).toEqual({
      resource_type: 'document',
      is_public: true,
      target_roles: ['employee'],
    });
  });

  it('preserves values', () => {
    const input = { title: 'Test', tags: ['a', 'b'] };
    const result = transformPayloadToSnakeCase(input);
    expect(result.title).toBe('Test');
    expect(result.tags).toEqual(['a', 'b']);
  });

  it('handles empty object', () => {
    expect(transformPayloadToSnakeCase({})).toEqual({});
  });
});
