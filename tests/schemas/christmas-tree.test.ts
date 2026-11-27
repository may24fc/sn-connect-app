import {
  christmasExchangeGiftAddressSchema,
  christmasLightGeometryAt,
  christmasOrnamentPlacementSchema,
  christmasStrandSaveSchema,
  christmasWishUpsertSchema,
} from '@/lib/schemas/christmas-tree.schema';
import { describe, expect, it } from 'vitest';

describe('Christmas light position', () => {
  it('saves a bulb as one point, including valid positions near branch edges', () => {
    const geometry = christmasLightGeometryAt(75, 55);
    expect(geometry).toEqual({ startX: 75, endX: 75, startY: 55, endY: 55 });
    expect(christmasStrandSaveSchema.safeParse({ decoration: 'lights', geometry }).success).toBe(
      true
    );
  });

  it('rejects bulbs outside the tree and preserves the Garland span rule', () => {
    expect(christmasLightGeometryAt(90, 55)).toBeNull();
    expect(
      christmasStrandSaveSchema.safeParse({
        decoration: 'garland',
        geometry: { startX: 50, endX: 50, startY: 55, endY: 55 },
      }).success
    ).toBe(false);
  });
});

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

describe('christmas exchange gift delivery details schema', () => {
  it('accepts an address with an international phone number', () => {
    expect(
      christmasExchangeGiftAddressSchema.parse({
        deliveryAddress: '123 Sample Street, Cebu City',
        phoneNumber: '+63 917 123 4567',
      })
    ).toEqual({
      deliveryAddress: '123 Sample Street, Cebu City',
      phoneNumber: '+63 917 123 4567',
    });
  });

  it('rejects a phone number without a country code', () => {
    expect(
      christmasExchangeGiftAddressSchema.safeParse({
        deliveryAddress: '123 Sample Street, Cebu City',
        phoneNumber: '0917 123 4567',
      }).success
    ).toBe(false);
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
