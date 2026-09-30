import { findUhpDuplicateClients } from '@/lib/uhp';
import { describe, expect, it } from 'vitest';

const existing = [
  { id: '1', name: 'Cassandra Matthews', email: null, phone: '405536369' },
  { id: '2', name: 'Test', email: 'someone@example.com', phone: null },
];

describe('findUhpDuplicateClients', () => {
  it('matches phones across formatting and country-code variations', () => {
    for (const phone of ['0405 536 369', '+61 405 536 369', '405-536-369']) {
      expect(
        findUhpDuplicateClients({ name: 'Cass', email: null, phone }, existing).map((c) => c.id)
      ).toEqual(['1']);
    }
  });

  it('matches names case- and whitespace-insensitively', () => {
    expect(
      findUhpDuplicateClients(
        { name: '  cassandra   MATTHEWS ', email: null, phone: null },
        existing
      )
    ).toHaveLength(1);
  });

  it('matches emails case-insensitively', () => {
    expect(
      findUhpDuplicateClients(
        { name: 'Other', email: 'Someone@Example.com', phone: null },
        existing
      ).map((c) => c.id)
    ).toEqual(['2']);
  });

  it('ignores short or missing phone numbers', () => {
    expect(findUhpDuplicateClients({ name: 'New', email: null, phone: '123' }, existing)).toEqual(
      []
    );
  });
});
