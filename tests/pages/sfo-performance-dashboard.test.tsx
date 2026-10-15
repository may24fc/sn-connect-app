import { render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'employee' } }),
}));
vi.mock('@/hooks/usePeriodRequestGuard', () => ({
  usePeriodRequestGuard: () => ({ begin: () => 1, isCurrent: () => true }),
}));
vi.mock('@/components/admin/MarketingAdSpendAccessManagerDialog', () => ({
  MarketingAdSpendAccessManagerDialog: () => null,
}));
vi.mock('@/components/data-display/MetricsPeriodSelect', () => ({
  MetricsPeriodSelect: () => null,
}));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ data, children }: { data: unknown; children: React.ReactNode }) => (
    <div data-testid="bar-chart" data-chart={JSON.stringify(data)}>
      {children}
    </div>
  ),
  LineChart: ({ data, children }: { data: unknown; children: React.ReactNode }) => (
    <div data-testid="line-chart" data-chart={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, name, stackId }: { dataKey: string; name: string; stackId?: string }) => (
    <span data-testid="bar-series" data-key={dataKey} data-stack={stackId}>
      {name}
    </span>
  ),
  Line: ({ dataKey, connectNulls }: { dataKey: string; connectNulls: boolean }) => (
    <span data-testid="line-series" data-key={dataKey} data-connect-nulls={String(connectNulls)} />
  ),
  CartesianGrid: () => null,
  Legend: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

import { MarketingAdSpendDashboard } from '@/components/marketing/MarketingAdSpendDashboard';

const year = new Date().getFullYear();
const entries = [
  {
    id: 'a',
    platformId: 'meta',
    platformName: 'Meta Ads',
    entryDate: `${year}-01-10`,
    amount: 100,
  },
  {
    id: 'b',
    platformId: 'google',
    platformName: 'Google Ads',
    entryDate: `${year}-01-15`,
    amount: 50,
  },
  { id: 'c', platformId: 'meta', platformName: 'Meta Ads', entryDate: `${year}-03-10`, amount: 25 },
];

function mockFetch(
  spend: typeof entries,
  sales: Array<{ year: number; month: number; actual_revenue_aud: number }>,
  salesStatus = 200
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: url.includes('/revenue-forecast/') ? salesStatus === 200 : true,
      status: url.includes('/revenue-forecast/') ? salesStatus : 200,
      json: async () =>
        url.includes('/revenue-forecast/')
          ? { data: sales.filter((entry) => url.includes(`year=${entry.year}`)) }
          : {
              data: {
                entries: spend,
                platforms: [],
                overview: { monthly: [], totalByPlatform: [] },
              },
            },
    }))
  );
}

describe('SFO performance dashboard', () => {
  beforeEach(() => {
    mockFetch(entries, [
      { year, month: 1, actual_revenue_aud: 1000 },
      { year, month: 2, actual_revenue_aud: 0 },
      { year: year - 1, month: 1, actual_revenue_aud: 800 },
    ]);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('can grow beyond the viewport without overlapping following page content', async () => {
    const { container } = render(<MarketingAdSpendDashboard sfoView />);
    await screen.findByText('Monthly ad spend by platform');

    expect(container.firstElementChild).toHaveClass('min-h-full');
    expect(container.firstElementChild).not.toHaveClass('h-full');
  });

  it('uses recorded months only for year-over-year sales, stacked spend and monthly rates', async () => {
    render(<MarketingAdSpendDashboard sfoView />);
    expect(await screen.findByText('Monthly ad spend by platform')).toBeInTheDocument();

    const charts = screen.getAllByTestId('bar-chart');
    const sales = JSON.parse(charts[0]!.getAttribute('data-chart')!);
    const spend = JSON.parse(charts[1]!.getAttribute('data-chart')!);
    const rates = JSON.parse(screen.getByTestId('line-chart').getAttribute('data-chart')!);
    expect(sales[0]).toMatchObject({ actualSales: 1000, priorSales: 800 });
    expect(sales[1]).toMatchObject({ actualSales: 0, priorSales: null });
    expect(sales[2]).toMatchObject({ actualSales: null, priorSales: null });
    expect(spend[0]).toMatchObject({ 'spend-meta': 100, 'spend-google': 50 });
    expect(spend[1]).toMatchObject({ 'spend-meta': null, 'spend-google': null });
    expect(spend[2]).toMatchObject({ 'spend-meta': 25, 'spend-google': null });
    expect(
      screen
        .getAllByTestId('bar-series')
        .filter((bar) => bar.getAttribute('data-stack') === 'platforms')
    ).toHaveLength(2);
    expect(rates[0].spendPercent).toBe(15);
    expect(rates[1].spendPercent).toBeNull();
    expect(rates[2].spendPercent).toBeNull();
    expect(screen.getByTestId('line-series')).toHaveAttribute('data-connect-nulls', 'false');

    const table = screen.getByText('Monthly ad spend as % of sales').closest('div')
      ?.parentElement?.parentElement;
    expect(table).toBeTruthy();
    expect(within(table!).getByText('15.0%')).toBeInTheDocument();
    expect(within(table!).getAllByText('Not reported').length).toBeGreaterThan(0);
    expect(screen.getByText('Gross-margin what-if · unavailable')).toBeInTheDocument();
  });

  it('shows missing data rather than zero and leaves the shared admin view unchanged', async () => {
    mockFetch([], []);
    const { unmount } = render(<MarketingAdSpendDashboard sfoView />);
    expect(
      await screen.findByText('No sales actuals reported for either year.')
    ).toBeInTheDocument();
    expect(screen.getByText('No ad spend entries reported for this year.')).toBeInTheDocument();
    expect(
      screen.getByText('No months have both recorded spend and positive recorded sales.')
    ).toBeInTheDocument();
    expect(screen.getAllByText('Not reported').length).toBeGreaterThan(0);
    unmount();

    render(<MarketingAdSpendDashboard />);
    await waitFor(() => expect(screen.getByText('Monthly actual sales')).toBeInTheDocument());
    expect(screen.queryByText('Monthly sales ·', { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByText('Gross-margin what-if · unavailable')).not.toBeInTheDocument();
  });

  it('does not show sales charts when Revenue Forecast denies access', async () => {
    mockFetch(entries, [], 403);
    render(<MarketingAdSpendDashboard sfoView />);
    expect(
      await screen.findByText(/Monthly sales comparison is available to users/)
    ).toBeInTheDocument();
    expect(screen.queryByText('Monthly ad spend by platform')).not.toBeInTheDocument();
  });

  it('does not request restricted revenue data when access is known to be absent', async () => {
    mockFetch(entries, [], 403);
    render(<MarketingAdSpendDashboard sfoView revenueComparisonAccess={false} />);
    expect(
      await screen.findByText(/Monthly sales comparison is available to users/)
    ).toBeInTheDocument();
    expect(
      vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('/revenue-forecast/'))
    ).toBe(false);
  });
});
