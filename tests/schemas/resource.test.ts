import {
  bookmarkResourceSchema,
  createCollectionSchema,
  createResourceSchema,
  resourceCategorySchema,
  resourceFiltersSchema,
  resourceSearchSchema,
  resourceStatusSchema,
  resourceTypeSchema,
  resourceUploadSchema,
  trackViewSchema,
  updateResourceSchema,
} from '@/lib/schemas/resource.schema';
import { describe, expect, it } from 'vitest';

// ============================================
// Enum Schemas
// ============================================

describe('resourceTypeSchema', () => {
  it.each(['video', 'document', 'image', 'link', 'presentation', 'interactive'])(
    'accepts valid type: %s',
    (type) => {
      expect(resourceTypeSchema.parse(type)).toBe(type);
    }
  );

  it('rejects invalid type', () => {
    expect(() => resourceTypeSchema.parse('podcast')).toThrow();
  });
});

describe('resourceCategorySchema', () => {
  it.each([
    'onboarding',
    'training',
    'policies',
    'benefits',
    'tools',
    'culture',
    'department_specific',
    'forms_templates',
    'performance',
    'emergency',
  ])('accepts valid category: %s', (category) => {
    expect(resourceCategorySchema.parse(category)).toBe(category);
  });

  it('rejects invalid category', () => {
    expect(() => resourceCategorySchema.parse('random')).toThrow();
  });
});

describe('resourceStatusSchema', () => {
  it.each(['draft', 'published', 'archived'])('accepts valid status: %s', (status) => {
    expect(resourceStatusSchema.parse(status)).toBe(status);
  });

  it('rejects invalid status', () => {
    expect(() => resourceStatusSchema.parse('deleted')).toThrow();
  });
});

// ============================================
// createResourceSchema
// ============================================

describe('createResourceSchema', () => {
  const validResource = {
    title: 'Employee Handbook',
    resourceType: 'document' as const,
    category: 'policies' as const,
    filePath: 'policies/handbook.pdf',
  };

  it('accepts valid resource with file path', () => {
    const result = createResourceSchema.safeParse(validResource);
    expect(result.success).toBe(true);
  });

  it('accepts valid resource with external URL', () => {
    const result = createResourceSchema.safeParse({
      ...validResource,
      filePath: undefined,
      externalUrl: 'https://example.com/video',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when both filePath and externalUrl are missing', () => {
    const result = createResourceSchema.safeParse({
      title: 'Test',
      resourceType: 'document',
      category: 'policies',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty title', () => {
    const result = createResourceSchema.safeParse({
      ...validResource,
      title: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding 200 characters', () => {
    const result = createResourceSchema.safeParse({
      ...validResource,
      title: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('rejects description exceeding 5000 characters', () => {
    const result = createResourceSchema.safeParse({
      ...validResource,
      description: 'a'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects excerpt exceeding 300 characters', () => {
    const result = createResourceSchema.safeParse({
      ...validResource,
      excerpt: 'a'.repeat(301),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid external URL', () => {
    const result = createResourceSchema.safeParse({
      title: 'Test',
      resourceType: 'link',
      category: 'tools',
      externalUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when expiresAt is before publishedAt', () => {
    const result = createResourceSchema.safeParse({
      ...validResource,
      publishedAt: '2026-12-01T10:00:00Z',
      expiresAt: '2026-11-01T10:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('accepts when expiresAt is after publishedAt', () => {
    const result = createResourceSchema.safeParse({
      ...validResource,
      publishedAt: '2026-01-01T10:00:00Z',
      expiresAt: '2026-12-31T23:59:59Z',
    });
    expect(result.success).toBe(true);
  });

  it('defaults tags to empty array', () => {
    const result = createResourceSchema.safeParse(validResource);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });

  it('defaults isPublic to false', () => {
    const result = createResourceSchema.safeParse(validResource);
    if (result.success) {
      expect(result.data.isPublic).toBe(false);
    }
  });

  it('rejects more than 20 tags', () => {
    const result = createResourceSchema.safeParse({
      ...validResource,
      tags: Array.from({ length: 21 }, (_, i) => `tag-${i}`),
    });
    expect(result.success).toBe(false);
  });

  it('rejects tags longer than 50 characters', () => {
    const result = createResourceSchema.safeParse({
      ...validResource,
      tags: ['a'.repeat(51)],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid target department UUID', () => {
    const result = createResourceSchema.safeParse({
      ...validResource,
      targetDepartments: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });
});

// ============================================
// updateResourceSchema
// ============================================

describe('updateResourceSchema', () => {
  it('accepts partial update with title only', () => {
    const result = updateResourceSchema.safeParse({ title: 'New Title' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (no fields to update)', () => {
    const result = updateResourceSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = updateResourceSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('accepts status change', () => {
    const result = updateResourceSchema.safeParse({ status: 'published' });
    expect(result.success).toBe(true);
  });

  it('rejects when expiresAt is before publishedAt', () => {
    const result = updateResourceSchema.safeParse({
      publishedAt: '2026-12-01T10:00:00Z',
      expiresAt: '2026-11-01T10:00:00Z',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================
// resourceFiltersSchema
// ============================================

describe('resourceFiltersSchema', () => {
  it('applies defaults for page and pageSize', () => {
    const result = resourceFiltersSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.sortBy).toBe('created_at');
    expect(result.sortOrder).toBe('desc');
  });

  it('coerces string page to number', () => {
    const result = resourceFiltersSchema.parse({ page: '3' });
    expect(result.page).toBe(3);
  });

  it('rejects page less than 1', () => {
    const result = resourceFiltersSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects pageSize greater than 100', () => {
    const result = resourceFiltersSchema.safeParse({ pageSize: 101 });
    expect(result.success).toBe(false);
  });

  it('accepts valid sortBy values', () => {
    for (const sortBy of ['created_at', 'published_at', 'view_count', 'title']) {
      const result = resourceFiltersSchema.safeParse({ sortBy });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid sortBy', () => {
    const result = resourceFiltersSchema.safeParse({ sortBy: 'random_column' });
    expect(result.success).toBe(false);
  });
});

// ============================================
// resourceSearchSchema
// ============================================

describe('resourceSearchSchema', () => {
  it('requires query of at least 2 characters', () => {
    const result = resourceSearchSchema.safeParse({ query: 'a' });
    expect(result.success).toBe(false);
  });

  it('accepts query of 2 or more characters', () => {
    const result = resourceSearchSchema.safeParse({ query: 'ab' });
    expect(result.success).toBe(true);
  });

  it('defaults limit to 20', () => {
    const result = resourceSearchSchema.parse({ query: 'test' });
    expect(result.limit).toBe(20);
  });

  it('rejects limit greater than 50', () => {
    const result = resourceSearchSchema.safeParse({ query: 'test', limit: 51 });
    expect(result.success).toBe(false);
  });
});

// ============================================
// bookmarkResourceSchema
// ============================================

describe('bookmarkResourceSchema', () => {
  it('accepts empty object', () => {
    const result = bookmarkResourceSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts notes up to 500 characters', () => {
    const result = bookmarkResourceSchema.safeParse({ notes: 'Important reference' });
    expect(result.success).toBe(true);
  });

  it('rejects notes exceeding 500 characters', () => {
    const result = bookmarkResourceSchema.safeParse({ notes: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });
});

// ============================================
// trackViewSchema
// ============================================

describe('trackViewSchema', () => {
  it('accepts empty object', () => {
    const result = trackViewSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid duration and completed', () => {
    const result = trackViewSchema.safeParse({ durationSeconds: 120, completed: true });
    expect(result.success).toBe(true);
  });

  it('rejects negative duration', () => {
    const result = trackViewSchema.safeParse({ durationSeconds: -1 });
    expect(result.success).toBe(false);
  });
});

// ============================================
// resourceUploadSchema
// ============================================

describe('resourceUploadSchema', () => {
  it('accepts valid upload metadata', () => {
    const result = resourceUploadSchema.safeParse({
      fileName: 'handbook.pdf',
      category: 'policies',
      resourceType: 'document',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty fileName', () => {
    const result = resourceUploadSchema.safeParse({
      fileName: '',
      category: 'policies',
      resourceType: 'document',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================
// createCollectionSchema
// ============================================

describe('createCollectionSchema', () => {
  it('accepts valid collection', () => {
    const result = createCollectionSchema.safeParse({
      title: 'Onboarding Program',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createCollectionSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding 200 characters', () => {
    const result = createCollectionSchema.safeParse({ title: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('rejects description exceeding 2000 characters', () => {
    const result = createCollectionSchema.safeParse({
      title: 'Test',
      description: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});
