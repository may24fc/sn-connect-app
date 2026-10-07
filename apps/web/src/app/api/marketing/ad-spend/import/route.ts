import { ensureDefaultCampaignForPlatform, ensureDefaultMarketingPlatforms, getMarketingAuthedContext } from '@/app/api/marketing/_lib';
import { csvObjects } from '@/lib/finance/csv';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const rowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  platform: z.enum(['meta','google','email','seo']),
  transactionId: z.string().trim().min(1).max(120),
  amount: z.coerce.number().positive(),
  currency: z.literal('AUD'),
  paymentMethod: z.string().trim().max(80).optional(),
  invoiceReference: z.string().url().optional().or(z.literal('')),
  invoiceFileName: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getMarketingAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const csv = await request.text();
  if (csv.length > 2_000_000) return NextResponse.json({ error: 'CSV is too large' }, { status: 413 });
  let rows: Array<Record<string, string>>;
  try { rows = csvObjects(csv); } catch { return NextResponse.json({ error: 'Invalid CSV' }, { status: 400 }); }
  if (rows.length < 1 || rows.length > 500) return NextResponse.json({ error: 'CSV must contain 1 to 500 rows' }, { status: 400 });
  const parsed = rows.map((row, index) => ({ index: index + 2, result: rowSchema.safeParse(row) }));
  const invalid = parsed.filter((item) => !item.result.success).map((item) => ({ row: item.index, error: 'Invalid date, platform, transaction ID, amount, or currency (AUD required)' }));
  if (invalid.length) return NextResponse.json({ error: 'CSV has invalid rows', rows: invalid }, { status: 400 });
  const admin = auth.supabaseAdmin;
  const platforms = await ensureDefaultMarketingPlatforms(admin, auth.user.id);
  const platformByCode = new Map(platforms.map((item) => [item.code, item]));
  const isAdmin = auth.role === 'admin' || auth.role === 'super_admin';
  const grants = isAdmin ? [] : (await admin.from('marketing_access_grants').select('platform_id').eq('user_id', auth.user.id).eq('can_submit', true).is('deleted_at', null)).data ?? [];
  const allowed = new Set(grants.map((item) => item.platform_id));
  const validRows = parsed.map((item) => ({ row: item.index, data: item.result.data! }));
  if (validRows.some((item) => { const platform = platformByCode.get(item.data.platform); return !platform || (!isAdmin && !allowed.has(platform.id)); })) return NextResponse.json({ error: 'No submit access for one or more platforms' }, { status: 403 });
  let inserted = 0;
  let duplicates = 0;
  const errors: Array<{ row: number; error: string }> = [];
  for (const item of validRows) {
    const platform = platformByCode.get(item.data.platform)!;
    const existing = await admin.from('marketing_entries').select('id').eq('platform_id', platform.id).eq('transaction_id', item.data.transactionId).is('deleted_at', null).limit(1);
    if (existing.error) { errors.push({ row: item.row, error: 'Could not check duplicate' }); continue; }
    if (existing.data?.length) { duplicates += 1; continue; }
    try {
      const campaignId = await ensureDefaultCampaignForPlatform(admin, platform.id, platform.name, auth.user.id, item.data.date);
      const { error } = await (admin as any).from('marketing_entries').insert({ campaign_id: campaignId, platform_id: platform.id, employee_id: null, submitted_by: auth.user.id, entry_date: item.data.date, transaction_id: item.data.transactionId, payment_method: item.data.paymentMethod || 'Billing import', amount: item.data.amount, invoice_reference: item.data.invoiceReference || null, invoice_file_name: item.data.invoiceFileName || null, currency: 'AUD', notes: item.data.notes || null, import_source: 'billing_csv', created_by: auth.user.id });
      if (error) { errors.push({ row: item.row, error: 'Could not insert entry' }); continue; }
      inserted += 1;
    } catch { errors.push({ row: item.row, error: 'Could not create campaign' }); }
  }
  return NextResponse.json({ data: { inserted, duplicates, errors } }, { status: errors.length ? 207 : 200 });
}
