import { subscriptionChecks } from '@/lib/finance/subscription-checks';
import { describe, expect, it } from 'vitest';

const subscription = {
  id: 'a',
  vendor_name: 'Canva',
  active: true,
  next_renewal: '2026-06-01',
  last_charged: null,
};

describe('subscription review signals', () => {
  it('flags a passed recorded renewal and a second active vendor without claiming a missed payment', () => {
    expect(
      subscriptionChecks(
        subscription,
        [subscription, { ...subscription, id: 'b', vendor_name: ' canva ' }],
        '2026-07-01'
      )
    ).toEqual([
      'Same vendor appears in another active subscription',
      'Renewal date passed; review linked charge',
    ]);
  });

  it('does not flag a future renewal, a newer linked charge, or inactive duplicate', () => {
    expect(
      subscriptionChecks(
        { ...subscription, next_renewal: '2026-08-01' },
        [subscription],
        '2026-07-01'
      )
    ).toEqual([]);
    expect(
      subscriptionChecks(
        { ...subscription, last_charged: '2026-06-02' },
        [subscription],
        '2026-07-01'
      )
    ).toEqual([]);
    expect(
      subscriptionChecks(
        subscription,
        [subscription, { ...subscription, id: 'b', active: false }],
        '2026-05-01'
      )
    ).toEqual([]);
  });
});
