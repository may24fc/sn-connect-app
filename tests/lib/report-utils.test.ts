import { describe, expect, it } from 'vitest';
import { matchesMarketingReportFilters, resolveMarketingReportType } from '@/lib/report-utils';

describe('Email Marketing report resolution', () => {
  it.each([
    { marketingReportType: 'email marketing' },
    { marketingReportType: 'email' },
    { campaignName: 'Email Marketing' },
    { primaryChannel: 'Email Marketing' },
  ])('resolves legacy context %# as Email Marketing', (marketingContext) => {
    expect(resolveMarketingReportType(marketingContext)).toBe('Email Marketing');
  });

  it('includes legacy Email Marketing reports when the admin filter is selected', () => {
    expect(
      matchesMarketingReportFilters(
        {
          notes: null,
          marketing_context: { marketingReportType: 'email' },
        },
        { reportType: 'Email Marketing' }
      )
    ).toBe(true);
  });
});

describe('Organic Creation report resolution', () => {
  it('normalizes legacy Content Creation records to Organic Creation', () => {
    expect(resolveMarketingReportType({ marketingReportType: 'Content Creation' })).toBe(
      'Organic Creation'
    );
  });
});