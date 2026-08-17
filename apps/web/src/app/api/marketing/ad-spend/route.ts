import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logActivity } from '@/lib/audit';
import {
  ensureDefaultCampaignForPlatform,
  ensureDefaultMarketingPlatforms,
  formatMarketingCurrency,
  getMarketingAuthedContext,
  hasMarketingAccess,
  normalizeMarketingPlatformKey,
} from '@/app/api/marketing/_lib';

const periodQuerySchema = z.object({
  period: z.string().trim().optional(),
});

const invoiceUrlSchema = z
  .string()
  .trim()
  .max(500, 'Invoice link is too long')
  .url('Invoice link must be a valid URL')
  .refine((value) => /^https?:\/\//i.test(value), 'Invoice link must start with http:// or https://');

const adSpendEntrySchema = z.object({
  platformId: z.string().uuid('Platform must be a valid UUID'),
  entryDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Entry date must use YYYY-MM-DD format'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  transactionId: z.string().trim().min(1, 'Transaction ID is required').max(120),
  paymentMethod: z.string().trim().min(1, 'Payment method is required').max(80),
  invoiceReference: invoiceUrlSchema,
  invoiceFileName: z.string().trim().min(1, 'Invoice file name is required').max(255),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  currency: z.string().trim().length(3).optional().default('AUD'),
});

function isMissingInvoiceFileNameColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? error.code : null;
  const message = 'message' in error ? error.message : null;

  return (
    code === '42703' ||
    (typeof message === 'string' && message.toLowerCase().includes('invoice_file_name'))
  );
}

function buildMonthlyOverview(entries: Array<{ platformName: string; monthIndex: number; amount: number }>) {
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return monthNames.map((month, index) => {
    const monthEntries = entries.filter((entry) => entry.monthIndex === index);
    const meta = monthEntries
      .filter((entry) => normalizeMarketingPlatformKey(entry.platformName) === 'meta')
      .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
    const google = monthEntries
      .filter((entry) => normalizeMarketingPlatformKey(entry.platformName) === 'google')
      .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
    const email = monthEntries
      .filter((entry) => normalizeMarketingPlatformKey(entry.platformName) === 'email')
      .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
    const total = meta + google + email;

    return {
      month,
      meta: formatMarketingCurrency(meta),
      google: formatMarketingCurrency(google),
      email: formatMarketingCurrency(email),
      total: formatMarketingCurrency(total),
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getMarketingAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasMarketingAccess(auth.role, auth.hasAccessGrant)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = periodQuerySchema.safeParse({
      period: request.nextUrl.searchParams.get('period') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid period query parameter' }, { status: 400 });
    }

    const rawPeriod = parsed.data.period ?? String(new Date().getFullYear());
    const normalizedPeriod = rawPeriod.toLowerCase() === 'all' ? 'all' : rawPeriod;
    const year = normalizedPeriod === 'all' ? null : Number.parseInt(normalizedPeriod, 10);

    if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
      return NextResponse.json({ error: 'Invalid period query parameter' }, { status: 400 });
    }
    const admin = auth.supabaseAdmin;
    const platforms = await ensureDefaultMarketingPlatforms(admin, auth.user.id);
    const isAdmin = ['admin', 'super_admin'].includes(auth.role ?? '');

    let allowedPlatformIds: string[] = platforms.map((platform) => platform.id);
    if (!isAdmin) {
      const { data: grantRows, error: grantError } = await admin
        .from('marketing_access_grants')
        .select('platform_id')
        .eq('user_id', auth.user.id)
        .eq('can_view_overview', true)
        .is('deleted_at', null);

      if (grantError) {
        console.error('Failed to load marketing grants:', grantError);
        return NextResponse.json({ error: 'Failed to load access grants' }, { status: 500 });
      }

      allowedPlatformIds = (grantRows ?? [])
        .map((row) => row.platform_id)
        .filter((platformId): platformId is string => Boolean(platformId));
    }

    const buildEntriesQuery = (withInvoiceFileName: boolean) => {
      const selectColumnsWithFileName =
        'id, platform_id, entry_date, transaction_id, payment_method, amount, invoice_reference, invoice_file_name, currency, notes, submitted_by, created_at, marketing_platforms(name)';
      const selectColumnsFallback =
        'id, platform_id, entry_date, transaction_id, payment_method, amount, invoice_reference, currency, notes, submitted_by, created_at, marketing_platforms(name)';

      let query: any = admin
        .from('marketing_entries')
        .select(withInvoiceFileName ? selectColumnsWithFileName : selectColumnsFallback)
        .is('deleted_at', null)
        .order('entry_date', { ascending: false });

      if (year !== null) {
        query = query
          .gte('entry_date', `${year}-01-01`)
          .lt('entry_date', `${year + 1}-01-01`);
      }

      if (allowedPlatformIds.length > 0) {
        query = query.in('platform_id', allowedPlatformIds);
      } else {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }

      return query;
    };

    let { data: entryRows, error: entriesError } = (await buildEntriesQuery(true)) as {
      data: Array<Record<string, unknown>> | null;
      error: { code?: string; message?: string } | null;
    };
    if (entriesError && isMissingInvoiceFileNameColumnError(entriesError)) {
      ({ data: entryRows, error: entriesError } = (await buildEntriesQuery(false)) as {
        data: Array<Record<string, unknown>> | null;
        error: { code?: string; message?: string } | null;
      });
    }

    if (entriesError) {
      console.error('Failed to load marketing entries:', entriesError);
      return NextResponse.json({ error: 'Failed to load ad spend entries' }, { status: 500 });
    }

    const platformLookup = new Map(platforms.map((platform) => [platform.id, platform.name]));
    const entries = (entryRows ?? []).map((entry) => ({
      id: String(entry.id),
      platformId: String(entry.platform_id),
      platformName:
        (entry.marketing_platforms as { name?: string } | null)?.name ??
        platformLookup.get(String(entry.platform_id)) ??
        'Unknown platform',
      entryDate: String(entry.entry_date),
      transactionId: (entry.transaction_id as string | null) ?? null,
      paymentMethod: (entry.payment_method as string | null) ?? null,
      amount: Number(entry.amount ?? 0),
      invoiceReference: (entry.invoice_reference as string | null) ?? null,
      invoiceFileName: 'invoice_file_name' in entry ? (entry.invoice_file_name ?? null) : null,
      currency: (entry.currency as string | null) ?? 'AUD',
      notes: (entry.notes as string | null) ?? null,
      createdAt: String(entry.created_at),
    }));

    const visiblePlatforms = platforms.filter((platform) => allowedPlatformIds.includes(platform.id));
    const totalsByPlatform = visiblePlatforms.map((platform) => ({
      platform: platform.name,
      total: formatMarketingCurrency(
        entries
          .filter((entry) => entry.platformId === platform.id)
          .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0)
      ),
    }));

    const totalSummary = entries.reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);

    const totalByPlatformWithTotal = [
      ...totalsByPlatform,
      { platform: 'Total', total: formatMarketingCurrency(totalSummary), isTotal: true },
    ];

    const overviewMonthly = buildMonthlyOverview(
      entries.map((entry) => ({
        platformName: entry.platformName,
        monthIndex: new Date(`${entry.entryDate}T00:00:00Z`).getUTCMonth(),
        amount: entry.amount,
      }))
    );

    return NextResponse.json({
      data: {
        platforms: platforms.map((platform) => ({
          id: platform.id,
          name: platform.name,
          code: platform.code,
        })),
        entries,
        overview: {
          totalByPlatform: totalByPlatformWithTotal,
          monthly: overviewMonthly,
        },
        period: {
          value: normalizedPeriod,
          label: year === null ? 'All Time' : String(year),
          year,
          isAllTime: year === null,
        },
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/marketing/ad-spend:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getMarketingAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = adSpendEntrySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const isAdmin = ['admin', 'super_admin'].includes(auth.role ?? '');

    const admin = auth.supabaseAdmin;
    const platforms = await ensureDefaultMarketingPlatforms(admin, auth.user.id);
    const platform = platforms.find((item) => item.id === payload.platformId);

    if (!platform) {
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
    }

    if (!isAdmin) {
      const { data: grantRow, error: grantError } = await admin
        .from('marketing_access_grants')
        .select('id')
        .eq('user_id', auth.user.id)
        .eq('platform_id', payload.platformId)
        .eq('can_submit', true)
        .is('deleted_at', null)
        .maybeSingle();

      if (grantError) {
        console.error('Failed to read marketing grant for submit access:', grantError);
        return NextResponse.json({ error: 'Failed to validate access' }, { status: 500 });
      }

      if (!grantRow) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const campaignId = await ensureDefaultCampaignForPlatform(
      admin,
      payload.platformId,
      platform.name,
      auth.user.id,
      payload.entryDate
    );

    const entryInsertPayload = {
      campaign_id: campaignId,
      platform_id: payload.platformId,
      employee_id: null,
      submitted_by: auth.user.id,
      entry_date: payload.entryDate,
      transaction_id: payload.transactionId,
      payment_method: payload.paymentMethod,
      amount: payload.amount,
      invoice_reference: payload.invoiceReference,
      invoice_file_name: payload.invoiceFileName,
      currency: payload.currency,
      notes: payload.notes,
      created_by: auth.user.id,
    };

    let { data: insertedEntry, error: insertError } = await admin
      .from('marketing_entries')
      .insert(entryInsertPayload)
      .select('id')
      .single();

    if (insertError && isMissingInvoiceFileNameColumnError(insertError)) {
      const fallbackInsertPayload = { ...entryInsertPayload };
      delete (fallbackInsertPayload as { invoice_file_name?: string | null }).invoice_file_name;

      ({ data: insertedEntry, error: insertError } = await admin
        .from('marketing_entries')
        .insert(fallbackInsertPayload)
        .select('id')
        .single());
    }

    if (insertError || !insertedEntry) {
      console.error('Failed to insert marketing entry:', insertError);
      return NextResponse.json({ error: 'Failed to insert ad spend entry' }, { status: 500 });
    }

    logActivity(admin, {
      userId: auth.user.id,
      action: 'create_marketing_entry',
      tableName: 'marketing_entries',
      recordId: insertedEntry.id,
      metadata: {
        platformId: payload.platformId,
        amount: payload.amount,
        entryDate: payload.entryDate,
      },
    });

    return NextResponse.json({ data: { id: insertedEntry.id, ok: true } }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/marketing/ad-spend:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
