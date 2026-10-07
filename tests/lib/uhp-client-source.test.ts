import { uhpClientUpdateSchema } from '@/lib/schemas/uhp.schema';
import {
  UHP_CLIENT_SOURCE_DEFAULTS,
  isUhpWebLink,
  mergeUhpSourceOptions,
  normalizeUhpLink,
  uhpLinkLabel,
} from '@/lib/uhp';
import { describe, expect, it } from 'vitest';

describe('mergeUhpSourceOptions', () => {
  it('lists defaults first, then added sources alphabetically without duplicates', () => {
    expect(
      mergeUhpSourceOptions([
        'Telegram group',
        null,
        'instagram',
        'Coffee  meetup',
        'Telegram group',
      ])
    ).toEqual([...UHP_CLIENT_SOURCE_DEFAULTS, 'Coffee meetup', 'Telegram group']);
  });
});

describe('normalizeUhpLink', () => {
  it('adds https:// when the scheme is missing and keeps full URLs', () => {
    expect(normalizeUhpLink('  instagram.com/jane ')).toBe('https://instagram.com/jane');
    expect(normalizeUhpLink('http://example.com')).toBe('http://example.com');
    expect(normalizeUhpLink('   ')).toBeNull();
  });
});

describe('isUhpWebLink', () => {
  it('accepts http(s) links and rejects other schemes and plain words', () => {
    expect(isUhpWebLink('https://instagram.com/jane')).toBe(true);
    expect(isUhpWebLink('javascript:alert(1)')).toBe(false);
    expect(isUhpWebLink('https://not-a-link')).toBe(false);
  });
});

describe('uhpLinkLabel', () => {
  it('shows the hostname without www', () => {
    expect(uhpLinkLabel('https://www.facebook.com/jane.doe')).toBe('facebook.com');
  });
});

describe('uhpClientUpdateSchema sourceUrl', () => {
  it('rejects non-web links and allows clearing', () => {
    expect(uhpClientUpdateSchema.safeParse({ sourceUrl: 'javascript:alert(1)' }).success).toBe(
      false
    );
    expect(
      uhpClientUpdateSchema.safeParse({ sourceUrl: 'https://linkedin.com/in/jane' }).success
    ).toBe(true);
    expect(uhpClientUpdateSchema.safeParse({ sourceUrl: null }).success).toBe(true);
  });
});
