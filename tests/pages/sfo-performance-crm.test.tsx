import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/marketing/MarketingAdSpendDashboard', () => ({
  MarketingAdSpendDashboard: ({ sfoView }: { sfoView: boolean }) => (
    <div>{sfoView ? 'SFO Performance' : 'Ad Spend'}</div>
  ),
}));
vi.mock('@/app/api/marketing/_lib', () => ({
  getMarketingAuthedContext: vi.fn(),
  hasMarketingAccess: vi.fn(() => true),
}));
vi.mock('@/app/api/crm/_lib', () => ({ getCrmAuthedContext: vi.fn() }));

import SfoPerformancePage from '@/app/(app)/sfo/performance/page';
import { getCrmAuthedContext } from '@/app/api/crm/_lib';
import { getMarketingAuthedContext } from '@/app/api/marketing/_lib';

describe('SFO CRM prototype boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMarketingAuthedContext).mockResolvedValue({
      ok: true,
      role: 'admin',
      hasAccessGrant: false,
    } as never);
  });

  it('keeps CRM unchanged and links authorized administrators to the current tracker', async () => {
    vi.mocked(getCrmAuthedContext).mockResolvedValue({
      ok: true,
      context: { role: 'admin' },
    } as never);
    const html = renderToStaticMarkup(await SfoPerformancePage());
    expect(html).toContain('SFO Performance');
    expect(html).toContain('CRM Tracker · unchanged');
    expect(html).toContain('href="/admin/crm"');
  });

  it('does not offer a broken CRM link without a separate access grant', async () => {
    vi.mocked(getCrmAuthedContext).mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Forbidden',
    });
    const html = renderToStaticMarkup(await SfoPerformancePage());
    expect(html).toContain('CRM requires its own access grant');
    expect(html).not.toContain('href="/crm"');
  });
});
