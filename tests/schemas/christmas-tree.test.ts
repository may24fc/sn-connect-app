import {
  christmasOrnamentPlacementSchema,
  christmasWishUpsertSchema,
} from '@/lib/schemas/christmas-tree.schema';
import { describe, expect, it } from 'vitest';

describe('christmas ornament placement schema', () => {
  it('accepts each approved Christmas ball design', () => {
    expect(
      christmasOrnamentPlacementSchema.parse({
        assetType: 'champagne',
        positionX: 50,
        positionY: 45,
      })
    ).toEqual({ assetType: 'champagne', positionX: 50, positionY: 45 });
  });

  it('rejects unapproved ornament designs', () => {
    expect(christmasOrnamentPlacementSchema.safeParse({ assetType: 'star' }).success).toBe(false);
  });
});

describe('christmas wish submission schema', () => {
  it('accepts ordered October personal wishes', () => {
    expect(
      christmasWishUpsertSchema.parse({
        category: 'personal',
        itemNumber: 3,
        content: 'Visit Japan',
      })
    ).toEqual({ category: 'personal', itemNumber: 3, content: 'Visit Japan', linkUrl: null });
  });

  it('defaults a single November or December wish to item one', () => {
    expect(
      christmasWishUpsertSchema.parse({ category: 'for_others', content: 'Good health' })
    ).toEqual({
      category: 'for_others',
      itemNumber: 1,
      content: 'Good health',
      linkUrl: null,
    });
  });

  it('keeps links for personal wishes and strips them from later categories', () => {
    expect(
      christmasWishUpsertSchema.parse({
        category: 'personal',
        itemNumber: 1,
        content: 'A new camera',
        linkUrl: 'https://example.com/camera',
      }).linkUrl
    ).toBe('https://example.com/camera');
    expect(
      christmasWishUpsertSchema.parse({
        category: 'for_sn',
        content: 'A strong year for the team',
        linkUrl: 'https://example.com/legacy-link',
      }).linkUrl
    ).toBeNull();
  });

  it('rejects multiple items for non-personal wish categories', () => {
    expect(
      christmasWishUpsertSchema.safeParse({
        category: 'for_sn',
        itemNumber: 2,
        content: 'Sustainable growth',
      }).success
    ).toBe(false);
  });

  it('rejects blank and oversized wishes', () => {
    expect(
      christmasWishUpsertSchema.safeParse({ category: 'personal', content: ' ' }).success
    ).toBe(false);
    expect(
      christmasWishUpsertSchema.safeParse({ category: 'personal', content: 'a'.repeat(501) })
        .success
    ).toBe(false);
  });
});
